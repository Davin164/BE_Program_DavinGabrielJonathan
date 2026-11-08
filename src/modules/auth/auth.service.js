const crypto = require('crypto');
const { query } = require('../../config/database');
const env = require('../../config/env');
const { hashPassword, comparePassword } = require('../../utils/password');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require('../../utils/jwt');

const register = async ({ email, password, name, nim = null, phone = null, division_id = null }) => {
  const existingUserResult = await query(
    'SELECT id, is_deleted FROM users WHERE email = $1',
    [email]
  );

  if (existingUserResult.rows.length > 0) {
    const err = new Error('An account with this email address already exists.');
    err.statusCode = 409;
    err.code = 'EMAIL_ALREADY_EXISTS';
    throw err;
  }

  const passwordHash = await hashPassword(password);

  let validDivisionId = null;
  if (division_id) {
    const divCheck = await query('SELECT id FROM divisions WHERE id = $1', [division_id]);
    if (divCheck.rows.length > 0) {
      validDivisionId = division_id;
    } else {
      const err = new Error('Divisi tidak ditemukan. Silakan pilih divisi yang valid atau kosongkan.');
      err.statusCode = 400;
      err.code = 'INVALID_DIVISION';
      throw err;
    }
  }

  const insertQuery = `
    INSERT INTO users (
      email,
      name,
      password_hash,
      role,
      division_id,
      nim,
      phone
    )
    VALUES ($1, $2, $3, 'MEMBER', $4, $5, $6)
    RETURNING id, email, name, role, division_id, nim, phone, created_at;
  `;
  const insertValues = [email, name, passwordHash, validDivisionId, nim || null, phone || null];
  const result = await query(insertQuery, insertValues);
  const user = result.rows[0];

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return {
    user,
    accessToken,
    refreshToken,
  };
};

const login = async ({ email, password }) => {
  const result = await query(
    `SELECT u.id, u.email, u.name, u.password_hash, u.role, u.division_id, u.nim, u.phone, u.is_deleted,
            d.name AS division_name
     FROM users u
     LEFT JOIN divisions d ON u.division_id = d.id
     WHERE u.email = $1`,
    [email]
  );

  const user = result.rows[0];

  if (!user || user.is_deleted) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const isPasswordValid = await comparePassword(password, user.password_hash);
  if (!isPasswordValid) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  delete user.password_hash;
  delete user.is_deleted;

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return {
    user,
    accessToken,
    refreshToken,
  };
};

const loginWithGoogle = async ({ supabase_token, email: fallbackEmail, name: fallbackName }) => {
  let verifiedEmail = fallbackEmail;
  let verifiedName = fallbackName;

  if (
    env.SUPABASE_URL &&
    env.SUPABASE_ANON_KEY &&
    !env.SUPABASE_URL.includes('your-supabase-project')
  ) {
    const supabaseRes = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${supabase_token}`,
        apikey: env.SUPABASE_ANON_KEY,
      },
    });

    if (!supabaseRes.ok) {
      const err = new Error('Invalid or expired Google OAuth session token.');
      err.statusCode = 401;
      err.code = 'INVALID_OAUTH_TOKEN';
      throw err;
    }

    const supabaseUser = await supabaseRes.json();
    verifiedEmail = supabaseUser.email;
    verifiedName =
      supabaseUser.user_metadata?.full_name ||
      supabaseUser.user_metadata?.name ||
      verifiedEmail?.split('@')[0];
  }

  if (!verifiedEmail) {
    const err = new Error('Unable to determine email address from Google OAuth account.');
    err.statusCode = 400;
    err.code = 'OAUTH_EMAIL_REQUIRED';
    throw err;
  }

  const existingResult = await query(
    `SELECT u.id, u.email, u.name, u.role, u.division_id, u.nim, u.phone, u.is_deleted,
            d.name AS division_name
     FROM users u
     LEFT JOIN divisions d ON u.division_id = d.id
     WHERE u.email = $1`,
    [verifiedEmail]
  );

  let user = existingResult.rows[0];

  if (user && user.is_deleted) {
    const err = new Error('This account has been deactivated by chapter leadership.');
    err.statusCode = 403;
    err.code = 'ACCOUNT_DEACTIVATED';
    throw err;
  }

  if (!user) {
    const randomPassword = crypto.randomBytes(32).toString('hex');
    const passwordHash = await hashPassword(randomPassword);
    const insertRes = await query(
      `INSERT INTO users (email, name, password_hash, role)
       VALUES ($1, $2, $3, 'MEMBER')
       RETURNING id, email, name, role, division_id, nim, phone, created_at;`,
      [verifiedEmail, verifiedName || verifiedEmail.split('@')[0], passwordHash]
    );
    user = insertRes.rows[0];
  } else {
    delete user.is_deleted;
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return {
    user,
    accessToken,
    refreshToken,
  };
};

const refresh = async (token) => {
  try {
    const payload = verifyRefreshToken(token);

    const result = await query(
      `SELECT u.id, u.email, u.name, u.role, u.is_deleted
       FROM users u
       WHERE u.id = $1`,
      [payload.sub]
    );

    const user = result.rows[0];

    if (!user || user.is_deleted) {
      const err = new Error('User no longer exists or has been deactivated.');
      err.statusCode = 401;
      err.code = 'UNAUTHORIZED';
      throw err;
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  } catch (err) {
    const errorObj = new Error('Invalid or expired refresh token.');
    errorObj.statusCode = 401;
    errorObj.code = 'INVALID_REFRESH_TOKEN';
    throw errorObj;
  }
};

const getMe = async (userId) => {
  const result = await query(
    `SELECT u.id, u.email, u.name, u.role, u.division_id, u.nim, u.phone, u.created_at, u.updated_at,
            d.name AS division_name
     FROM users u
     LEFT JOIN divisions d ON u.division_id = d.id
     WHERE u.id = $1 AND u.is_deleted = FALSE`,
    [userId]
  );

  if (result.rows.length === 0) {
    const err = new Error('User profile not found.');
    err.statusCode = 404;
    err.code = 'USER_NOT_FOUND';
    throw err;
  }

  return result.rows[0];
};

module.exports = {
  register,
  login,
  loginWithGoogle,
  refresh,
  getMe,
};
