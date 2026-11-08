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

router.use(authenticate);

router.get('/', listMembersValidator, validate, membersController.list);

router.post(
  '/',
  authorize('LEAD'),
  createMemberValidator,
  validate,
  membersController.create
);

router.get('/:id', memberIdParamValidator, validate, membersController.getById);

router.put('/:id', updateProfileValidator, validate, membersController.update);
router.patch('/:id', updateProfileValidator, validate, membersController.update);

router.patch(
  '/:id/role',
  authorize('LEAD'),
  updateRoleValidator,
  validate,
  membersController.updateRole
);

router.delete(
  '/:id',
  authorize('LEAD'),
  memberIdParamValidator,
  validate,
  membersController.deleteMember
);

module.exports = router;
