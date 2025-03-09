const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TripPhoto = sequelize.define('TripPhoto', {
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
  fileName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  fileSize: {
    type: DataTypes.INTEGER
  },
  fileType: {
    type: DataTypes.STRING
  },
  uploadedBy: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id'
    },
    allowNull: true
  },
  uploadedByDriver: {
    type: DataTypes.INTEGER,
    references: {
      model: 'drivers',
      key: 'id'
    },
    allowNull: true
  },
  tenantId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tenants',
      key: 'id'
    }
  },
  localIdentifier: {
    type: DataTypes.STRING,
    comment: '前端用於識別本地照片的標識符'
  }
}, {
  tableName: 'trip_photos',
  timestamps: true
});

module.exports = TripPhoto;
