// 僅修改 updateTripStatus 函數部分
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
          model: TripDriver,
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
      const isAssigned = trip.drivers.some(d => d.driverId.toString() === req.user.id.toString());
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
        for (const driver of trip.drivers) {
          await Driver.update({ status: '空車' }, {
            where: { id: driver.driverId },
            transaction: t
          });
        }
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
          model: TripDriver,
          as: 'drivers',
          include: [
            {
              model: Driver,
              as: 'driver'
            }
          ]
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
        trip.drivers.forEach(driver => {
          io.to(`driver-${driver.driverId}`).emit('trip_status_updated', {
            tripId: trip.id,
            tripCode: trip.tripId,
            status,
            updatedAt: new Date().toISOString()
          });
        });
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
