const request = require('supertest');
const app = require('../src/app');
const { pool, initTestDb, cleanTestDb, createTestUser } = require('./testHelper');

describe('Auth Module & Role Authorization Tests', () => {
  let memberToken;
  let leadToken;

  beforeAll(async () => {
    await initTestDb();
    await cleanTestDb();

    const member = await createTestUser({ role: 'MEMBER', email: 'member@test.com' });
    memberToken = member.token;

    const lead = await createTestUser({ role: 'LEAD', email: 'lead@test.com' });
    leadToken = lead.token;
  });

describe('POST /api/auth/register', () => {
    it('should successfully register a new member with default role MEMBER', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser.gdgoc@gmail.com',
          password: 'Password123!',
          name: 'New Registered Member',
          nim: '09021282126099',
          phone: '081234567899',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('newuser.gdgoc@gmail.com');
      expect(res.body.data.user.role).toBe('MEMBER');
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    it('should reject registration with invalid email or weak password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'short',
          name: '',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should prevent duplicate registration with the same email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser.gdgoc@gmail.com',
          password: 'Password123!',
          name: 'Duplicate Member',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should authenticate valid user credentials and return JWT tokens', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'newuser.gdgoc@gmail.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user.password_hash).toBeUndefined();
    });

    it('should reject login with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'newuser.gdgoc@gmail.com',
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Role Authorization Checks', () => {
    it('should forbid MEMBER from accessing audit logs', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should allow LEAD to access audit logs', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${leadToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return profile for authenticated user', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('member@test.com');
    });

    it('should return 401 when no token is provided', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });
});
