const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const Driver = sequelize.define('Driver', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  driverId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: { msg: '請提供司機ID' }
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: '請提供司機姓名' }
    }
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: { msg: '請提供電話號碼' }
    }
  },
  licensePlate: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: '請提供車牌號碼' }
    }
  },
  vehicleType: {
    type: DataTypes.ENUM('中型車', '一噸半', '大型車', '發財', '其他'),
    allowNull: false,
    validate: {
      notEmpty: { msg: '請提供車型' }
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: { args: [6, 100], msg: '密碼長度至少為6個字符' }
    }
  },
  status: {
    type: DataTypes.ENUM('空車', '忙碌中'),
    defaultValue: '空車'
  },
  lat: {
    type: DataTypes.DECIMAL(10, 7),
    defaultValue: 0,
    comment: '緯度'
  },
  lng: {
    type: DataTypes.DECIMAL(10, 7),
    defaultValue: 0,
    comment: '經度'
  },
  tenantId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tenants',
      key: 'id'
    }
  }
}, {
  tableName: 'drivers',
  timestamps: true,
  paranoid: true, // 軟刪除
  defaultScope: {
    attributes: { exclude: ['password'] }
  },
  scopes: {
    withPassword: {
      attributes: {}
    }
  }
});

// 密碼加密 Hook
Driver.beforeCreate(async (driver) => {
  const salt = await bcrypt.genSalt(10);
  driver.password = await bcrypt.hash(driver.password, salt);
});

Driver.beforeUpdate(async (driver) => {
  if (driver.changed('password')) {
    const salt = await bcrypt.genSalt(10);
    driver.password = await bcrypt.hash(driver.password, salt);
  }
});

// 比對密碼方法
Driver.prototype.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// 生成 JWT 方法
Driver.prototype.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this.id, driverId: this.driverId, tenantId: this.tenantId, role: 'driver' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

module.exports = Driver;
