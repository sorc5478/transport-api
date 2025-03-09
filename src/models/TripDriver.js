const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// 車趟與司機的關聯表，因為一個車趟可以分配給多個司機
const TripDriver = sequelize.define('TripDriver', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tripId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'trips',
      key: 'id'
    }
  },
  driverId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'drivers',
      key: 'id'
    }
  },
  driverName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  driverPhone: {
    type: DataTypes.STRING,
    allowNull: false
  },
  licensePlate: {
    type: DataTypes.STRING,
    allowNull: false
  },
  assignedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  status: {
    type: DataTypes.ENUM('已派發', '進行中', '已完成', '已取消'),
    defaultValue: '已派發'
  }
}, {
  tableName: 'trip_drivers',
  timestamps: true
});

module.exports = TripDriver;
