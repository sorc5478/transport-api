const express = require('express');
const {
  getDrivers,
  getDriver,
  createDriver,
  updateDriver,
  deleteDriver,
  updateDriverPassword,
  updateLocation,
  updateStatus
} = require('../controllers/driverController');

const { protect, authorize, ensureTenantAccess } = require('../middlewares/auth');

const router = express.Router();

// 所有路由都添加認證中間件
router.use(protect);
router.use(ensureTenantAccess);

router.route('/')
  .get(getDrivers)
  .post(authorize('管理員'), createDriver);

router.route('/:id')
  .get(getDriver)
  .put(authorize('管理員'), updateDriver)
  .delete(authorize('管理員'), deleteDriver);

router.put('/:id/updatepassword', authorize('管理員'), updateDriverPassword);

// 司機位置和狀態更新路由
router.put('/location', authorize('driver'), updateLocation);
router.put('/status', authorize('driver'), updateStatus);

module.exports = router;
