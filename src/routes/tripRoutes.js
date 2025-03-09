const express = require('express');
const {
  getTrips,
  getTrip,
  createTrip,
  updateTrip,
  deleteTrip,
  assignDrivers,
  transferTrip,
  updateTripStatus
} = require('../controllers/tripController');

const {
  recordTripPhotos,
  getTripPhotosMetadata,
  deleteTripPhoto
} = require('../controllers/tripPhotoController');

const { protect, authorize, ensureTenantAccess } = require('../middlewares/auth');

const router = express.Router();

// 所有路由都添加認證中間件
router.use(protect);
router.use(ensureTenantAccess);

router.route('/')
  .get(getTrips)
  .post(authorize('管理員', '操作員'), createTrip);

router.route('/:id')
  .get(getTrip)
  .put(authorize('管理員', '操作員'), updateTrip)
  .delete(authorize('管理員'), deleteTrip);

// 車趟分配和轉移
router.put('/:id/assign', authorize('管理員', '操作員'), assignDrivers);
router.put('/:id/transfer', authorize('管理員', '操作員'), transferTrip);

// 車趟狀態更新
router.put('/:id/status', updateTripStatus);

// 照片元數據管理
router.route('/:id/photos/metadata')
  .get(getTripPhotosMetadata)
  .post(recordTripPhotos);

router.delete('/:id/photos/:photoId', deleteTripPhoto);

module.exports = router;
