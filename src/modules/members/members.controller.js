/**
 * @file members.controller.js
 * @description Controller handling incoming requests for members endpoints.
 * Sanitizes request payload to prevent mass-assignment attacks.
 */

const membersService = require('./members.service');
const { success } = require('../../utils/apiResponse');

/**
 * List members with filtering, search, sorting, and pagination.
 */
const list = async (req, res, next) => {
  try {
    const { page, limit, search, role, division_id, sort, order } = req.query;
    const { members, total, totalPages, page: currentPage, limit: currentLimit } =
      await membersService.getMembers({
        page,
        limit,
        search,
        role,
        division_id,
        sort,
        order,
      });

    return success(res, members, 200, {
      total,
      page: currentPage,
      limit: currentLimit,
      totalPages,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Create a new member (LEAD only).
 */
const create = async (req, res, next) => {
  try {
    const { name, email, password, role, division_id, nim, phone } = req.body;
    const createdMember = await membersService.createMember(
      { name, email, password, role, division_id, nim, phone },
      req.user,
      req.ip
    );
    return success(res, createdMember, 201);
  } catch (err) {
    next(err);
  }
};

/**
 * Get member detail by ID.
 */
const getById = async (req, res, next) => {
  try {
    const member = await membersService.getMemberById(req.params.id);
    return success(res, member, 200);
  } catch (err) {
    next(err);
  }
};

/**
 * Update member profile.
 * Strictly whitelists allowed payload fields.
 */
const update = async (req, res, next) => {
  try {
    const { name, phone, nim, division_id } = req.body;
    const updatedMember = await membersService.updateProfile(
      req.params.id,
      { name, phone, nim, division_id },
      req.user
    );

    return success(res, updatedMember, 200);
  } catch (err) {
    next(err);
  }
};

/**
 * Update member role (LEAD only).
 */
const updateRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const updatedUser = await membersService.updateRole(
      req.params.id,
      role,
      req.user,
      req.ip
    );

    return success(res, updatedUser, 200);
  } catch (err) {
    next(err);
  }
};

/**
 * Soft delete member (LEAD only).
 */
const deleteMember = async (req, res, next) => {
  try {
    const result = await membersService.deleteMember(req.params.id, req.user, req.ip);

    return success(res, result, 200);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  list,
  create,
  getById,
  update,
  updateRole,
  deleteMember,
};
