const { Trip, TripPhoto, TripDriver } = require('../models');
const ErrorResponse = require('../utils/errorResponse');

// @desc    記錄車趟照片元數據
// @route   POST /api/trips/:id/photos/metadata
// @access  Private
exports.recordTripPhotos = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { photos } = req.body;
    
    if (!photos || !Array.isArray(photos)) {
      return next(new ErrorResponse('請提供照片信息', 400));
    }
    
    const trip = await Trip.findOne({
      where: {
        id,
        tenantId: req.tenantId
      }
    });
    
    if (!trip) {
      return next(new ErrorResponse(`找不到ID為 ${id} 的車趟`, 404));
    }
    
    // 檢查權限
    if (req.userType === 'driver') {
      const isAssigned = await TripDriver.findOne({
        where: {
          tripId: id,
          driverId: req.user.id
        }
      });
      
      if (!isAssigned) {
        return next(new ErrorResponse('您未被分配到此車趟', 403));
      }
    }
    
    // 記錄照片元數據
    const photoRecords = [];
    for (const photo of photos) {
      const record = await TripPhoto.create({
        tripId: trip.id,
        fileName: photo.fileName,
        fileSize: photo.fileSize || 0,
        fileType: photo.fileType || 'image/jpeg',
        localIdentifier: photo.localIdentifier,
        uploadedBy: req.userType === 'driver' ? null : req.user.id,
        uploadedByDriver: req.userType === 'driver' ? req.user.id : null,
        tenantId: req.tenantId
      });
      
      photoRecords.push(record);
    }
    
    // 更新車趟照片計數
    await trip.update({
      hasPhotos: true,
      photoCount: (trip.photoCount || 0) + photos.length
    });
    
    res.status(201).json({
      success: true,
      count: photoRecords.length,
      data: photoRecords
    });
  } catch (err) {
    next(err);
  }
};

// @desc    獲取車趟照片元數據
// @route   GET /api/trips/:id/photos/metadata
// @access  Private
exports.getTripPhotosMetadata = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const trip = await Trip.findOne({
      where: {
        id,
        tenantId: req.tenantId
      }
    });
    
    if (!trip) {
      return next(new ErrorResponse(`找不到ID為 ${id} 的車趟`, 404));
    }
    
    // 檢查權限
    if (req.userType === 'driver') {
      const isAssigned = await TripDriver.findOne({
        where: {
          tripId: id,
          driverId: req.user.id
        }
      });
      
      if (!isAssigned) {
        return next(new ErrorResponse('您未被分配到此車趟', 403));
      }
    }
    
    const photos = await TripPhoto.findAll({
      where: { tripId: id },
      order: [['createdAt', 'DESC']]
    });
    
    res.status(200).json({
      success: true,
      count: photos.length,
      data: photos
    });
  } catch (err) {
    next(err);
  }
};

// @desc    刪除車趟照片元數據
// @route   DELETE /api/trips/:id/photos/:photoId
// @access  Private
exports.deleteTripPhoto = async (req, res, next) => {
  try {
    const { id, photoId } = req.params;
    
    const photo = await TripPhoto.findOne({
      where: {
        id: photoId,
        tripId: id,
        tenantId: req.tenantId
      }
    });
    
    if (!photo) {
      return next(new ErrorResponse(`找不到ID為 ${photoId} 的照片`, 404));
    }
    
    // 檢查權限
    if (req.userType === 'driver') {
      if (photo.uploadedByDriver !== req.user.id) {
        return next(new ErrorResponse('無權刪除此照片', 403));
      }
    }
    
    await photo.destroy();
    
    // 更新車趟照片計數
    const trip = await Trip.findByPk(id);
    const remainingPhotos = await TripPhoto.count({ where: { tripId: id } });
    
    await trip.update({
      hasPhotos: remainingPhotos > 0,
      photoCount: remainingPhotos
    });
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};
