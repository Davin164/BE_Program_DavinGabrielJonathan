/**
 * @file members.router.js
 * @description Express router for member management routes.
 */

const { Router } = require('express');
const membersController = require('./members.controller');
const {
  listMembersValidator,
  memberIdParamValidator,
  createMemberValidator,
  updateProfileValidator,
  updateRoleValidator,
} = require('./members.validator');
const { validate } = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const { authorize } = require('../../middleware/authorize');

const router = Router();

// All member endpoints require authentication
router.use(authenticate);

// List members (All authenticated roles)
router.get('/', listMembersValidator, validate, membersController.list);

// Create member (LEAD only)
router.post(
  '/',
  authorize('LEAD'),
  createMemberValidator,
  validate,
  membersController.create
);

// Get single member (All authenticated roles)
router.get('/:id', memberIdParamValidator, validate, membersController.getById);

// Update member profile (Self, or authorized division head / lead)
router.put('/:id', updateProfileValidator, validate, membersController.update);
router.patch('/:id', updateProfileValidator, validate, membersController.update);

// Update member role (LEAD only)
router.patch(
  '/:id/role',
  authorize('LEAD'),
  updateRoleValidator,
  validate,
  membersController.updateRole
);

// Soft delete member (LEAD only)
router.delete(
  '/:id',
  authorize('LEAD'),
  memberIdParamValidator,
  validate,
  membersController.deleteMember
);

module.exports = router;
