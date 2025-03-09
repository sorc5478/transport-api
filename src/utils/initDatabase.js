const { sequelize } = require('../config/db');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// 模型
const { Tenant, User, Driver } = require('../models');

// 初始化數據庫和示例數據
const initDatabase = async () => {
  try {
    console.log('開始初始化數據庫...');

    // 同步所有模型到數據庫
    await sequelize.sync({ force: true });
    console.log('數據表已創建');

    // 創建默認租戶
    const tenant = await Tenant.create({
      name: '預設租戶',
      code: 'DEFAULT',
      contactPerson: '系統管理員',
      contactEmail: 'admin@example.com',
      contactPhone: '0912345678',
      address: '台北市信義區',
      status: 'active'
    });

    console.log('默認租戶已創建');

    // 創建管理員用戶
    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash('admin123', salt);
    
    await User.create({
      name: '系統管理員',
      email: 'admin@example.com',
      phone: '0912345678',
      password: adminPassword,
      role: '管理員',
      tenantId: tenant.id
    });

    console.log('管理員用戶已創建');

    // 創建操作員用戶
    const operatorPassword = await bcrypt.hash('operator123', salt);
    
    await User.create({
      name: '操作員',
      email: 'operator@example.com',
      phone: '0923456789',
      password: operatorPassword,
      role: '操作員',
      tenantId: tenant.id
    });

    console.log('操作員用戶已創建');

    // 創建示例司機
    const driverPassword = await bcrypt.hash('driver123', salt);
    
    await Driver.create({
      driverId: 'D001',
      name: '張小龍',
      phone: '0912345678',
      licensePlate: 'ABC-1234',
      vehicleType: '中型車',
      password: driverPassword,
      status: '空車',
      tenantId: tenant.id
    });

    await Driver.create({
      driverId: 'D002',
      name: '李大華',
      phone: '0923456789',
      licensePlate: 'DEF-5678',
      vehicleType: '一噸半',
      password: driverPassword,
      status: '空車',
      tenantId: tenant.id
    });

    console.log('示例司機已創建');
    console.log('數據庫初始化完成');

    process.exit(0);
  } catch (error) {
    console.error('數據庫初始化失敗:', error);
    process.exit(1);
  }
};

// 執行初始化
if (require.main === module) {
  initDatabase();
}

module.exports = initDatabase;
