const { Driver, Trip, TripDriver, sequelize } = require('../models');
const ErrorResponse = require('../utils/errorResponse');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');

// @desc    獲取所有司機
// @route   GET /api/drivers
// @access  Private
exports.getDrivers = async (req, res, next) => {
  try {
    const drivers = await Driver.findAll({
      where: { tenantId: req.tenantId },
      attributes: { exclude: ['password'] }
    });

    res.status(200).json({
      success: true,
      count: drivers.length,
      data: drivers
    });
  } catch (err) {
    next(err);
  }
};

// @desc    獲取單個司機
// @route   GET /api/drivers/:id
// @access  Private
exports.getDriver = async (req, res, next) => {
  try {
    const driver = await Driver.findOne({
      where: {
        id: req.params.id,
        tenantId: req.tenantId
      }
    });

    if (!driver) {
      return next(new ErrorResponse(`找不到 ID 為 ${req.params.id} 的司機`, 404));
    }

    res.status(200).json({
      success: true,
      data: driver
    });
  } catch (err) {
    next(err);
  }
};

// @desc    創建司機
// @route   POST /api/drivers
// @access  Private/管理員
exports.createDriver = async (req, res, next) => {
  try {
    // 添加租戶 ID
    req.body.tenantId = req.tenantId;

    // 檢查電話是否已存在
    const existingDriver = await Driver.findOne({
      where: {
        [Op.or]: [
          { phone: req.body.phone },
          { licensePlate: req.body.licensePlate }
        ]
      }
    });
    
    if (existingDriver) {
      let errorField = existingDriver.phone === req.body.phone ? '電話號碼' : '車牌號碼';
      return next(new ErrorResponse(`${errorField}已被註冊`, 400));
    }

    // 創建一個唯一的司機 ID
    const latestDriver = await Driver.findOne({
      order: [['createdAt', 'DESC']]
    });
    
    let nextId = 'D001';
    if (latestDriver && latestDriver.driverId) {
      const numPart = parseInt(latestDriver.driverId.substring(1));
      nextId = 'D' + String(numPart + 1).padStart(3, '0');
    }
    
    req.body.driverId = nextId;

    // 預設狀態為空車
    req.body.status = '空車';

    const driver = await Driver.create(req.body);

    // 發送實時通知
    const io = req.app.get('io');
    if (io) {
      io.to(`tenant-${req.tenantId}`).emit('driver_created', {
        driverId: driver.id,
        driverCode: driver.driverId,
        name: driver.name,
        licensePlate: driver.licensePlate,
        createdAt: driver.createdAt
      });
    }

    res.status(201).json({
      success: true,
      data: driver
    });
  } catch (err) {
    next(err);
  }
};

// @desc    更新司機
// @route   PUT /api/drivers/:id
// @access  Private/管理員
exports.updateDriver = async (req, res, next) => {
  try {
    // 不允許更新租戶 ID 和司機 ID
    ['tenantId', 'driverId'].forEach(field => {
      if (req.body[field]) delete req.body[field];
    });

    // 如果嘗試更新電話或車牌，檢查是否已存在
    if (req.body.phone || req.body.licensePlate) {
      const whereCondition = [];
      
      if (req.body.phone) {
        whereCondition.push({ phone: req.body.phone });
      }
      
      if (req.body.licensePlate) {
        whereCondition.push({ licensePlate: req.body.licensePlate });
      }
      
      const existingDriver = await Driver.findOne({
        where: {
          [Op.and]: [
            { [Op.or]: whereCondition },
            { id: { [Op.ne]: req.params.id } }
          ]
        }
      });
      
      if (existingDriver) {
        let errorField = existingDriver.phone === req.body.phone ? '電話號碼' : '車牌號碼';
        return next(new ErrorResponse(`${errorField}已被註冊`, 400));
      }
    }

    let driver = await Driver.findOne({
      where: {
        id: req.params.id,
        tenantId: req.tenantId
      }
    });

    if (!driver) {
      return next(new ErrorResponse(`找不到 ID 為 ${req.params.id} 的司機`, 404));
    }

    // 如果要更新狀態，驗證狀態值
    if (req.body.status && !['空車', '忙碌中'].includes(req.body.status)) {
      return next(new ErrorResponse('狀態必須是「空車」或「忙碌中」', 400));
    }

    // 防止更新狀態為忙碌中的司機為空車，除非通過指定API
    if (driver.status === '忙碌中' && req.body.status === '空車') {
      // 檢查是否有進行中的車趟
      const activeTrips = await TripDriver.findOne({
        where: {
          driverId: driver.id,
          status: { [Op.in]: ['已派發', '進行中'] }
        }
      });
      
      if (activeTrips) {
        return next(new ErrorResponse('此司機有進行中的車趟，無法直接更改為空車狀態', 400));
      }
    }

    // 更新司機
    await Driver.update(req.body, {
      where: { id: req.params.id }
    });

    // 獲取更新後的司機數據
    driver = await Driver.findByPk(req.params.id);

    // 發送實時通知
    const io = req.app.get('io');
    if (io) {
      io.to(`tenant-${req.tenantId}`).emit('driver_updated', {
        driverId: driver.id,
        driverCode: driver.driverId,
        name: driver.name,
        changes: Object.keys(req.body),
        updatedAt: new Date().toISOString()
      });
      
      // 如果狀態有變更，也向司機發送通知
      if (req.body.status) {
        io.to(`driver-${driver.id}`).emit('your_status_updated', {
          status: req.body.status,
          updatedAt: new Date().toISOString(),
          updatedBy: 'admin'
        });
      }
    }

    res.status(200).json({
      success: true,
      data: driver
    });
  } catch (err) {
    next(err);
  }
};

// @desc    刪除司機
// @route   DELETE /api/drivers/:id
// @access  Private/管理員
exports.deleteDriver = async (req, res, next) => {
  try {
    const driver = await Driver.findOne({
      where: {
        id: req.params.id,
        tenantId: req.tenantId
      }
    });

    if (!driver) {
      return next(new ErrorResponse(`找不到 ID 為 ${req.params.id} 的司機`, 404));
    }

    // 檢查司機是否有進行中的車趟
    const activeTrips = await TripDriver.findOne({
      where: {
        driverId: driver.id,
        status: { [Op.in]: ['已派發', '進行中'] }
      }
    });
    
    if (activeTrips) {
      return next(new ErrorResponse('無法刪除有進行中車趟的司機', 400));
    }

    // 軟刪除司機
    await Driver.destroy({
      where: { id: req.params.id }
    });

    // 發送實時通知
    const io = req.app.get('io');
    if (io) {
      io.to(`tenant-${req.tenantId}`).emit('driver_deleted', {
        driverId: driver.id,
        driverCode: driver.driverId,
        name: driver.name,
        deletedAt: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    更新司機密碼
// @route   PUT /api/drivers/:id/updatepassword
// @access  Private/管理員
exports.updateDriverPassword = async (req, res, next) => {
  try {
    const driver = await Driver.scope('withPassword').findOne({
      where: {
        id: req.params.id,
        tenantId: req.tenantId
      }
    });

    if (!driver) {
      return next(new ErrorResponse(`找不到 ID 為 ${req.params.id} 的司機`, 404));
    }

    // 更新密碼
    driver.password = req.body.newPassword;
    await driver.save();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    更新司機位置
// @route   PUT /api/drivers/location
// @access  Private/司機
exports.updateLocation = async (req, res, next) => {
  try {
    const { longitude, latitude } = req.body;

    if (!longitude || !latitude) {
      return next(new ErrorResponse('請提供經緯度座標', 400));
    }

    // 確保只能更新自己的位置
    if (req.userType !== 'driver') {
      return next(new ErrorResponse('只有司機可以更新位置', 403));
    }

    const updatedDriver = await Driver.update(
      {
        lat: latitude,
        lng: longitude
      },
      { 
        where: { id: req.user.id },
        returning: true
      }
    );

    // 發送實時通知 - 向管理員和操作員廣播位置更新
    const io = req.app.get('io');
    if (io) {
      io.to(`tenant-${req.tenantId}`).emit('driver_location_updated', {
        driverId: req.user.id,
        driverCode: req.user.driverId,
        name: req.user.name,
        location: {
          latitude,
          longitude
        },
        updatedAt: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      data: {
        lat: latitude,
        lng: longitude
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    更新司機狀態
// @route   PUT /api/drivers/status
// @access  Private/司機
exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!status || !['空車', '忙碌中'].includes(status)) {
      return next(new ErrorResponse('請提供有效的狀態', 400));
    }

    // 確保只能更新自己的狀態
    if (req.userType !== 'driver') {
      return next(new ErrorResponse('只有司機可以更新狀態', 403));
    }

    const driver = await Driver.findByPk(req.user.id);
    
    // 防止司機更新為空車，除非沒有進行中的車趟
    if (status === '空車' && driver.status === '忙碌中') {
      // 檢查是否有進行中的車趟
      const activeTrips = await TripDriver.findOne({
        where: {
          driverId: driver.id,
          status: { [Op.in]: ['已派發', '進行中'] }
        }
      });
      
      if (activeTrips) {
        return next(new ErrorResponse('您有進行中的車趟，無法將狀態更改為空車', 400));
      }
    }

    await Driver.update(
      { status },
      { where: { id: req.user.id } }
    );

    // 發送實時通知
    const io = req.app.get('io');
    if (io) {
      io.to(`tenant-${req.tenantId}`).emit('driver_status_updated', {
        driverId: req.user.id,
        driverCode: req.user.driverId,
        name: req.user.name,
        status,
        updatedAt: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      data: { status }
    });
  } catch (err) {
    next(err);
  }
};
