const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Trip = sequelize.define('Trip', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tripId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: { msg: '請提供車趟ID' }
    }
  },
  customer: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: '請提供客戶名稱' }
    }
  },
  shipper: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: ""
  },
  customsBroker: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: ""
  },
  companyAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  driverAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  pickupDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  pickupTime: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: ""
  },
  pickupLocation: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: '請提供提貨地點' }
    }
  },
  deliveryLocation: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: '請提供送貨位置' }
    }
  },
  quantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  quantityUnit: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: ""
  },
  volume: {
    type: DataTypes.DECIMAL(10, 2)
  },
  volumeUnit: {
    type: DataTypes.STRING
  },
  weight: {
    type: DataTypes.DECIMAL(10, 2)
  },
  vehicleType: {
    type: DataTypes.ENUM('中型車', '一噸半', '大型車', '發財', '其他'),
    allowNull: true,
    defaultValue: '其他'
  },
  status: {
    type: DataTypes.ENUM('待派發', '已派發', '進行中', '已完成', '已取消'),
    defaultValue: '待派發'
  },
  remarks: {
    type: DataTypes.TEXT
  },
  hasPhotos: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  photoCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  tenantId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tenants',
      key: 'id'
    }
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'trips',
  timestamps: true,
  paranoid: true // 軟刪除
});

module.exports = Trip;