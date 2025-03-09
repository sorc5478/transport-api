const { Trip, TripDriver, Driver, TripPhoto } = require('../models');
const { Op } = require('sequelize');
const ErrorResponse = require('../utils/errorResponse');
const { sequelize } = require('../config/db');

// @desc    獲取所有車趟
// @route   GET /api/trips
// @access  Private
exports.getTrips = async (req, res, next) => {
  try {
    const trips = await Trip.findAll({
      where: { tenantId: req.tenantId },
      include: [
        {
          model: Driver,
          as: 'drivers'
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: trips.length,
      data: trips
    });
  } catch (err) {
    next(err);
  }
};

// @desc    獲取單個車趟
// @route   GET /api/trips/:id
// @access  Private
exports.getTrip = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({
      where: {
        id: req.params.id,
        tenantId: req.tenantId
      },
      include: [
        {
          model: Driver,
          as: 'drivers'
        },
        {
          model: TripPhoto,
          as: 'photos',
          attributes: ['id', 'fileName', 'fileSize', 'fileType', 'localIdentifier', 'createdAt']
        }
      ]
    });

    if (!trip) {
      return next(new ErrorResponse(`找不到 ID 為 ${req.params.id} 的車趟`, 404));
    }

    res.status(200).json({
      success: true,
      data: trip
    });
  } catch (err) {
    next(err);
  }
};

// @desc    創建車趟
// @route   POST /api/trips
// @access  Private
exports.createTrip = async (req, res, next) => {
  try {
    // 添加租戶ID
    req.body.tenantId = req.tenantId;
    req.body.createdBy = req.user.id;

    const trip = await Trip.create(req.body);

    res.status(201).json({
      success: true,
      data: trip
    });
  } catch (err) {
    next(err);
  }
};

// @desc    更新車趟
// @route   PUT /api/trips/:id
// @access  Private
exports.updateTrip = async (req, res, next) => {
  try {
    let trip = await Trip.findOne({
      where: {
        id: req.params.id,
        tenantId: req.tenantId
      }
    });

    if (!trip) {
      return next(new ErrorResponse(`找不到 ID 為 ${req.params.id} 的車趟`, 404));
    }

    // 更新車趟
    await Trip.update(req.body, {
      where: { id: req.params.id }
    });

    // 獲取更新後的車趟
    trip = await Trip.findByPk(req.params.id, {
      include: [
        {
          model: Driver,
          as: 'drivers'
        }
      ]
    });

    res.status(200).json({
      success: true,
      data: trip
    });
  } catch (err) {
    next(err);
  }
};

// @desc    刪除車趟
// @route   DELETE /api/trips/:id
// @access  Private
exports.deleteTrip = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({
      where: {
        id: req.params.id,
        tenantId: req.tenantId
      }
    });

    if (!trip) {
      return next(new ErrorResponse(`找不到 ID 為 ${req.params.id} 的車趟`, 404));
    }

    // 檢查是否可以刪除
    if (trip.status !== '待派發') {
      return next(new ErrorResponse(`只能刪除「待派發」狀態的車趟`, 400));
    }

    await Trip.destroy({
      where: { id: req.params.id }
    });

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    分配司機給車趟
// @route   PUT /api/trips/:id/assign
// @access  Private
exports.assignDrivers = async (req, res, next) => {
  try {
    const { driverIds } = req.body;

    if (!driverIds || !Array.isArray(driverIds) || driverIds.length === 0) {
      return next(new ErrorResponse('請提供司機 ID 列表', 400));
    }

    const trip = await Trip.findOne({
      where: {
        id: req.params.id,
        tenantId: req.tenantId
      },
      include: [
        {
          model: Driver,
          as: 'drivers'
        }
      ]
    });

    if (!trip) {
      return next(new ErrorResponse(`找不到 ID 為 ${req.params.id} 的車趟`, 404));
    }

    // 檢查司機是否存在並屬於同一租戶
    const drivers = await Driver.findAll({
      where: {
        id: driverIds,
        tenantId: req.tenantId
      }
    });

    if (drivers.length !== driverIds.length) {
      return next(new ErrorResponse('部分司機不存在或不屬於您的租戶', 400));
    }

    // 在事務中執行所有操作
    await sequelize.transaction(async (t) => {
      // 刪除現有的關聯
      await TripDriver.destroy({
        where: { tripId: trip.id },
        transaction: t
      });

      // 創建新的關聯
      for (const driver of drivers) {
        await TripDriver.create({
          tripId: trip.id,
          driverId: driver.id,
          driverName: driver.name,
          driverPhone: driver.phone,
          licensePlate: driver.licensePlate,
          status: trip.status
        }, { transaction: t });
      }

      // 更新車趟狀態為「已派發」（如果當前是「待派發」）
      if (trip.status === '待派發') {
        await Trip.update(
          { status: '已派發' },
          { 
            where: { id: trip.id },
            transaction: t
          }
        );
      }

      // 更新司機狀態為「忙碌中」
      await Driver.update(
        { status: '忙碌中' },
        {
          where: { id: driverIds },
          transaction: t
        }
      );
    });

    // 獲取更新後的車趟信息
    const updatedTrip = await Trip.findByPk(req.params.id, {
      include: [
        {
          model: Driver,
          as: 'drivers'
        }
      ]
    });

    // 發送實時通知
    const io = req.app.get('io');
    if (io) {
      // 通知租戶內所有用戶
      io.to(`tenant-${req.tenantId}`).emit('trip_assigned', {
        tripId: trip.id,
        tripCode: trip.tripId,
        status: updatedTrip.status,
        driverIds,
        updatedAt: new Date().toISOString(),
        updatedBy: {
          id: req.user.id,
          name: req.user.name
        }
      });
      
      // 通知所有被分配的司機
      driverIds.forEach(driverId => {
        io.to(`driver-${driverId}`).emit('trip_assigned_to_you', {
          tripId: trip.id,
          tripCode: trip.tripId,
          status: updatedTrip.status,
          details: {
            pickup: trip.pickupLocation,
            destination: trip.deliveryLocation,
            pickupTime: trip.pickupTime,
            notes: trip.remarks
          },
          assignedAt: new Date().toISOString(),
          assignedBy: req.user.name
        });
      });
    }

    res.status(200).json({
      success: true,
      data: updatedTrip
    });
  } catch (err) {
    next(err);
  }
};

// @desc    轉移車趟給其他司機
// @route   PUT /api/trips/:id/transfer
// @access  Private
exports.transferTrip = async (req, res, next) => {
  try {
    const { driverIds } = req.body;

    if (!driverIds || !Array.isArray(driverIds) || driverIds.length === 0) {
      return next(new ErrorResponse('請提供新的司機 ID 列表', 400));
    }

    const trip = await Trip.findOne({
      where: {
        id: req.params.id,
        tenantId: req.tenantId
      },
      include: [
        {
          model: Driver,
          as: 'drivers'
        }
      ]
    });

    if (!trip) {
      return next(new ErrorResponse(`找不到 ID 為 ${req.params.id} 的車趟`, 404));
    }

    // 檢查車趟狀態是否可以轉移
    if (trip.status === '已完成' || trip.status === '已取消') {
      return next(new ErrorResponse(`無法轉移已完成或已取消的車趟`, 400));
    }

    // 獲取當前分配的司機ID列表
    const currentDriverIds = trip.drivers.map(d => d.id);

    // 檢查新司機是否存在並屬於同一租戶
    const drivers = await Driver.findAll({
      where: {
        id: driverIds,
        tenantId: req.tenantId
      }
    });

    if (drivers.length !== driverIds.length) {
      return next(new ErrorResponse('部分司機不存在或不屬於您的租戶', 400));
    }

    // 在事務中執行所有操作
    await sequelize.transaction(async (t) => {
      // 刪除現有的關聯
      await TripDriver.destroy({
        where: { tripId: trip.id },
        transaction: t
      });

      // 創建新的關聯
      for (const driver of drivers) {
        await TripDriver.create({
          tripId: trip.id,
          driverId: driver.id,
          driverName: driver.name,
          driverPhone: driver.phone,
          licensePlate: driver.licensePlate,
          status: trip.status
        }, { transaction: t });
      }

      // 更新原來的司機狀態為「空車」，新司機狀態為「忙碌中」
      await Driver.update(
        { status: '空車' },
        {
          where: { 
            id: currentDriverIds,
            id: { [Op.notIn]: driverIds } // 排除已經在新列表中的司機
          },
          transaction: t
        }
      );

      await Driver.update(
        { status: '忙碌中' },
        {
          where: { id: driverIds },
          transaction: t
        }
      );
    });

    // 獲取更新後的車趟信息
    const updatedTrip = await Trip.findByPk(req.params.id, {
      include: [
        {
          model: Driver,
          as: 'drivers'
        }
      ]
    });

    // 發送實時通知
    const io = req.app.get('io');
    if (io) {
      // 通知租戶內所有用戶
      io.to(`tenant-${req.tenantId}`).emit('trip_transferred', {
        tripId: trip.id,
        tripCode: trip.tripId,
        status: updatedTrip.status,
        oldDriverIds: currentDriverIds,
        newDriverIds: driverIds,
        updatedAt: new Date().toISOString(),
        updatedBy: {
          id: req.user.id,
          name: req.user.name
        }
      });
      
      // 通知原來的司機
      currentDriverIds.forEach(driverId => {
        if (!driverIds.includes(driverId)) { // 只通知不再負責的司機
          io.to(`driver-${driverId}`).emit('trip_transferred_from_you', {
            tripId: trip.id,
            tripCode: trip.tripId,
            transferredAt: new Date().toISOString(),
            transferredBy: req.user.name
          });
        }
      });
      
      // 通知新分配的司機
      driverIds.forEach(driverId => {
        if (!currentDriverIds.includes(driverId)) { // 只通知新加入的司機
          io.to(`driver-${driverId}`).emit('trip_transferred_to_you', {
            tripId: trip.id,
            tripCode: trip.tripId,
            status: updatedTrip.status,
            details: {
              pickup: trip.pickupLocation,
              destination: trip.deliveryLocation,
              pickupTime: trip.pickupTime,
              notes: trip.remarks
            },
            transferredAt: new Date().toISOString(),
            transferredBy: req.user.name
          });
        }
      });
    }

    res.status(200).json({
      success: true,
      data: updatedTrip
    });
  } catch (err) {
    next(err);
  }
};

// @desc    更新車趟狀態
// @route   PUT /api/trips/:id/status
// @access  Private
exports.updateTripStatus = async (req, res, next) => {
  try {
    const { status, photos } = req.body;
    
    if (!status || !['待派發', '已派發', '進行中', '已完成', '已取消'].includes(status)) {
      return next(new ErrorResponse('請提供有效的狀態', 400));
    }

    const trip = await Trip.findOne({
      where: {
        id: req.params.id,
        tenantId: req.tenantId
      },
      include: [
        {
          model: Driver,
          as: 'drivers'
        }
      ]
    });

    if (!trip) {
      return next(new ErrorResponse(`找不到 ID 為 ${req.params.id} 的車趟`, 404));
    }

    // 權限檢查
    // 司機只能將狀態更新為 '進行中' 或 '已完成'
    if (req.userType === 'driver') {
      // 檢查司機是否被分配到此車趟
      const isAssigned = trip.drivers.some(d => d.id.toString() === req.user.id.toString());
      if (!isAssigned) {
        return next(new ErrorResponse('您未被分配到此車趟', 403));
      }

      // 司機權限檢查
      if (status !== '進行中' && status !== '已完成') {
        return next(new ErrorResponse('司機只能將狀態更新為"進行中"或"已完成"', 403));
      }

      // 狀態轉換檢查
      if (status === '進行中' && trip.status !== '已派發') {
        return next(new ErrorResponse('只能從"已派發"狀態更新為"進行中"', 400));
      }

      if (status === '已完成' && trip.status !== '進行中') {
        return next(new ErrorResponse('只能從"進行中"狀態更新為"已完成"', 400));
      }
      
      // 如果狀態為"已完成"，檢查是否提供了照片元數據
      if (status === '已完成' && (!photos || !Array.isArray(photos) || photos.length === 0)) {
        return next(new ErrorResponse('完成車趟時請提供照片', 400));
      }
    }

    // 在事務中執行所有操作
    await sequelize.transaction(async (t) => {
      // 更新車趟狀態
      await Trip.update({ status }, {
        where: { id: trip.id },
        transaction: t
      });
      
      // 更新 TripDriver 狀態
      await TripDriver.update({ status }, {
        where: { 
          tripId: trip.id,
          status: { [Op.ne]: status } // 只更新不同的狀態
        },
        transaction: t
      });
      
      // 如果車趟完成或取消，更新司機狀態為空車
      if (status === '已完成' || status === '已取消') {
        const driverIds = trip.drivers.map(d => d.id);
        await Driver.update({ status: '空車' }, {
          where: { id: driverIds },
          transaction: t
        });
      }
      
      // 如果司機完成車趟並附上照片元數據，記錄這些照片
      if (status === '已完成' && req.userType === 'driver' && photos && Array.isArray(photos)) {
        // 記錄照片元數據
        for (const photo of photos) {
          await TripPhoto.create({
            tripId: trip.id,
            fileName: photo.fileName,
            fileSize: photo.fileSize || 0,
            fileType: photo.fileType || 'image/jpeg',
            localIdentifier: photo.localIdentifier,
            uploadedBy: null,
            uploadedByDriver: req.user.id,
            tenantId: req.tenantId
          }, { transaction: t });
        }
        
        // 更新車趟照片計數
        await Trip.update({
          hasPhotos: true,
          photoCount: sequelize.literal(`photo_count + ${photos.length}`)
        }, {
          where: { id: trip.id },
          transaction: t
        });
      }
    });

    // 獲取更新後的車趟信息
    const updatedTrip = await Trip.findByPk(req.params.id, {
      include: [
        {
          model: Driver,
          as: 'drivers'
        },
        {
          model: TripPhoto,
          as: 'photos',
          attributes: ['id', 'fileName', 'fileSize', 'fileType', 'localIdentifier', 'createdAt']
        }
      ]
    });

    // 發送實時通知
    const io = req.app.get('io');
    if (io) {
      // 通知租戶內所有用戶
      io.to(`tenant-${req.tenantId}`).emit('trip_status_changed', {
        tripId: trip.id,
        tripCode: trip.tripId,
        oldStatus: trip.status,
        newStatus: status,
        hasPhotos: status === '已完成' && photos && photos.length > 0,
        photoCount: status === '已完成' && photos ? photos.length : 0,
        updatedAt: new Date().toISOString(),
        updatedBy: {
          id: req.user.id,
          type: req.userType,
          name: req.user.name
        }
      });
      
      // 如果是司機更新的狀態，也通知管理員和操作員
      if (req.userType === 'driver') {
        io.to(`管理員-users`).emit('driver_updated_trip', {
          tripId: trip.id,
          tripCode: trip.tripId,
          status,
          hasPhotos: status === '已完成' && photos && photos.length > 0,
          photoCount: status === '已完成' && photos ? photos.length : 0,
          driverId: req.user.id,
          driverName: req.user.name,
          updatedAt: new Date().toISOString()
        });
      }
      
      // 如果不是司機更新的狀態，通知所有相關司機
      else {
        if (trip.drivers && trip.drivers.length > 0) {
          trip.drivers.forEach(driver => {
            io.to(`driver-${driver.id}`).emit('trip_status_updated', {
              tripId: trip.id,
              tripCode: trip.tripId,
              status,
              updatedAt: new Date().toISOString()
            });
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      data: updatedTrip
    });
  } catch (err) {
    next(err);
  }
};
