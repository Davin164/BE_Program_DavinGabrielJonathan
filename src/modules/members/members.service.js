/**
 * @file members.service.js
 * @description Business logic for member management, enforcing RBAC, IDOR prevention,
 * and security audit logging for administrative mutations.
 */

const membersRepository = require('./members.repository');
const { createAuditLog } = require('../../utils/auditLogger');

/**
 * Retrieve paginated list of members.
 */
const getMembers = async (queryOptions, currentUser) => {
  // If DIVISION_HEAD, can optionally filter or view members
  return membersRepository.findMembers(queryOptions);
};

/**
 * Retrieve single member details by ID.
 */
const getMemberById = async (id, currentUser) => {
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
    // Cannot modify another DIVISION_HEAD or LEAD
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
 * Automatically logs to audit_logs table.
 */
const updateRole = async (targetId, newRole, currentUser, ipAddress) => {
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

  // Prevent changing role if already same
  if (targetUser.role === newRole) {
    return targetUser;
  }

  // Prevent lead from demoting self if it would leave the system without a lead
  if (currentUser.id === targetId && newRole !== 'LEAD') {
    const err = new Error('Cannot demote your own LEAD account.');
    err.statusCode = 400;
    err.code = 'SELF_DEMOTION_DISALLOWED';
    throw err;
  }

  const updatedUser = await membersRepository.updateRole(targetId, newRole);

  // Write audit log entry
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
const deleteMember = async (targetId, currentUser, ipAddress) => {
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
  getMemberById,
  updateProfile,
  updateRole,
  deleteMember,
};
