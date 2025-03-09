const Tenant = require('./Tenant');
const User = require('./User');
const Driver = require('./Driver');
const Trip = require('./Trip');
const TripDriver = require('./TripDriver');
const TripPhoto = require('./TripPhoto');

// 設置關聯關係

// Tenant 關聯
Tenant.hasMany(User, { foreignKey: 'tenantId', as: 'users' });
Tenant.hasMany(Driver, { foreignKey: 'tenantId', as: 'drivers' });
Tenant.hasMany(Trip, { foreignKey: 'tenantId', as: 'trips' });
Tenant.hasMany(TripPhoto, { foreignKey: 'tenantId', as: 'photos' });

// User 關聯
User.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
User.hasMany(Trip, { foreignKey: 'createdBy', as: 'createdTrips' });
User.hasMany(TripPhoto, { foreignKey: 'uploadedBy', as: 'uploadedPhotos' });

// Driver 關聯
Driver.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
Driver.belongsToMany(Trip, { through: TripDriver, foreignKey: 'driverId', as: 'trips' });
Driver.hasMany(TripPhoto, { foreignKey: 'uploadedByDriver', as: 'uploadedPhotos' });

// Trip 關聯
Trip.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
Trip.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Trip.belongsToMany(Driver, { through: TripDriver, foreignKey: 'tripId', as: 'drivers' });
Trip.hasMany(TripPhoto, { foreignKey: 'tripId', as: 'photos' });

// 新增：Trip 和 TripDriver 之間的直接關係
Trip.hasMany(TripDriver, { foreignKey: 'tripId', as: 'tripDrivers' });

// TripDriver 關聯
TripDriver.belongsTo(Trip, { foreignKey: 'tripId' });
TripDriver.belongsTo(Driver, { foreignKey: 'driverId', as: 'driver' });

// TripPhoto 關聯
TripPhoto.belongsTo(Trip, { foreignKey: 'tripId' });
TripPhoto.belongsTo(User, { foreignKey: 'uploadedBy' });
TripPhoto.belongsTo(Driver, { foreignKey: 'uploadedByDriver' });
TripPhoto.belongsTo(Tenant, { foreignKey: 'tenantId' });

module.exports = {
  Tenant,
  User,
  Driver,
  Trip,
  TripDriver,
  TripPhoto
};
