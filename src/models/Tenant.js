const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Tenant = sequelize.define('Tenant', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: { msg: '請提供租戶名稱' }
    }
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: { msg: '請提供租戶代碼' }
    }
  },
  contactPerson: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: '請提供聯絡人' }
    }
  },
  contactEmail: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: { msg: '請提供有效的電子郵件' }
    }
  },
  contactPhone: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: '請提供聯絡電話' }
    }
  },
  address: {
    type: DataTypes.STRING
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'suspended'),
    defaultValue: 'active'
  }
}, {
  tableName: 'tenants',
  timestamps: true,
  paranoid: true // 軟刪除
});

module.exports = Tenant;
