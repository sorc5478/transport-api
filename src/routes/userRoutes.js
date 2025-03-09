const express = require('express');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  updatePassword
} = require('../controllers/userController');

const { protect, authorize, ensureTenantAccess } = require('../middlewares/auth');

const router = express.Router();

// 所有路由都添加認證中間件
router.use(protect);
router.use(ensureTenantAccess);

router.route('/')
  .get(authorize('管理員'), getUsers)
  .post(authorize('管理員'), createUser);

router.route('/:id')
  .get(authorize('管理員'), getUser)
  .put(authorize('管理員'), updateUser)
  .delete(authorize('管理員'), deleteUser);

router.put('/updatepassword', updatePassword);

module.exports = router;
