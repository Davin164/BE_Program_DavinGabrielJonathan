/**
 * @file members.service.js
 * @description Business logic for member management, enforcing RBAC, IDOR prevention,
 * and security audit logging for sensitive mutations (PDF Back-End requirement).
 */

const membersRepository = require('./members.repository');
const { hashPassword } = require('../../utils/password');
const { createAuditLog } = require('../../utils/auditLogger');

/**
 * Retrieve paginated list of members.
 */
const getMembers = async (queryOptions) => {
  return membersRepository.findMembers(queryOptions);
};

/**
 * Create a new member (LEAD only).
 */
const createMember = async (
  { name, email, password, role = 'MEMBER', division_id = null, nim = null, phone = null },
  currentUser,
  ipAddress = null
) => {
  if (currentUser.role !== 'LEAD') {
    const err = new Error('Forbidden: Only LEAD can create member accounts directly.');
    err.statusCode = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

  const existing = await membersRepository.findByEmail(email);
  if (existing) {
    const err = new Error('An account with this email address already exists.');
    err.statusCode = 409;
    err.code = 'EMAIL_ALREADY_EXISTS';
    throw err;
  }

  const passwordHash = await hashPassword(password || 'Password123!');
  const created = await membersRepository.create({
    name,
    email,
    password_hash: passwordHash,
    role,
    division_id: division_id || null,
    nim: nim || null,
    phone: phone || null,
  });

  await createAuditLog({
    actor_id: currentUser.id,
    target_id: created.id,
    target_table: 'users',
    action: 'MEMBER_CREATE',
    old_value: null,
    new_value: { email: created.email, role: created.role },
    ip_address: ipAddress,
  });

  return created;
};

/**
 * Retrieve single member details by ID.
 */
const getMemberById = async (id) => {
  const member = await membersRepository.findById(id);

  if (!member || member.is_deleted) {
    const err = new Error('Member not found.');
    err.statusCode = 404;
    err.code = 'MEMBER_NOT_FOUND';
    throw err;
  }

  return member;
};

/**
 * Update member profile fields.
 * Enforces strict IDOR and division boundary permissions.
 */
const updateProfile = async (targetId, fields, currentUser) => {
  const targetUser = await membersRepository.findById(targetId);

  if (!targetUser || targetUser.is_deleted) {
    const err = new Error('Member not found.');
    err.statusCode = 404;
    err.code = 'MEMBER_NOT_FOUND';
    throw err;
  }

  // IDOR Prevention: A MEMBER can only modify their own profile
  if (currentUser.role === 'MEMBER' && currentUser.id !== targetId) {
    const err = new Error('You can only modify your own profile.');
    err.statusCode = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

  // DIVISION_HEAD can only modify their own profile or members within their own division
  if (currentUser.role === 'DIVISION_HEAD' && currentUser.id !== targetId) {
    if (!currentUser.division_id || targetUser.division_id !== currentUser.division_id) {
      const err = new Error('You can only manage members within your own division.');
      err.statusCode = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }
    if (targetUser.role === 'LEAD' || targetUser.role === 'DIVISION_HEAD') {
      const err = new Error('You do not have permission to modify this leadership account.');
      err.statusCode = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }
  }

  // Only LEAD can change division_id of other users or themselves
  const sanitizedFields = { ...fields };
  if (currentUser.role !== 'LEAD') {
    delete sanitizedFields.division_id;
  }

  const updatedUser = await membersRepository.updateProfile(targetId, sanitizedFields);
  return updatedUser;
};

/**
 * Update user role (LEAD only).
 * Automatically records a security audit log entry (ROLE_CHANGE).
 */
const updateRole = async (targetId, newRole, currentUser, ipAddress = null) => {
  if (currentUser.role !== 'LEAD') {
    const err = new Error('Forbidden: Only LEAD can assign user roles.');
    err.statusCode = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

  const targetUser = await membersRepository.findById(targetId);

  if (!targetUser || targetUser.is_deleted) {
    const err = new Error('Member not found.');
    err.statusCode = 404;
    err.code = 'MEMBER_NOT_FOUND';
    throw err;
  }

  if (targetUser.role === newRole) {
    return targetUser;
  }

  if (currentUser.id === targetId && newRole !== 'LEAD') {
    const err = new Error('Cannot demote your own LEAD account.');
    err.statusCode = 400;
    err.code = 'SELF_DEMOTION_DISALLOWED';
    throw err;
  }

  const updatedUser = await membersRepository.updateRole(targetId, newRole);

  await createAuditLog({
    actor_id: currentUser.id,
    target_id: targetId,
    target_table: 'users',
    action: 'ROLE_CHANGE',
    old_value: { role: targetUser.role },
    new_value: { role: newRole },
    ip_address: ipAddress,
  });

  return updatedUser;
};

/**
 * Soft delete a member (LEAD only).
 */
const deleteMember = async (targetId, currentUser, ipAddress = null) => {
  if (currentUser.role !== 'LEAD') {
    const err = new Error('Forbidden: Only LEAD can deactivate accounts.');
    err.statusCode = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

  if (currentUser.id === targetId) {
    const err = new Error('Cannot delete your own account.');
    err.statusCode = 400;
    err.code = 'SELF_DELETION_DISALLOWED';
    throw err;
  }

  const targetUser = await membersRepository.findById(targetId);
  if (!targetUser || targetUser.is_deleted) {
    const err = new Error('Member not found.');
    err.statusCode = 404;
    err.code = 'MEMBER_NOT_FOUND';
    throw err;
  }

  await membersRepository.softDelete(targetId);

  await createAuditLog({
    actor_id: currentUser.id,
    target_id: targetId,
    target_table: 'users',
    action: 'USER_DELETE',
    old_value: { is_deleted: false },
    new_value: { is_deleted: true },
    ip_address: ipAddress,
  });

  return { message: 'Member successfully deactivated.' };
};

module.exports = {
  getMembers,
  createMember,
  getMemberById,
  updateProfile,
  updateRole,
  deleteMember,
};
