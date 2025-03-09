const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: process.env.DB_DIALECT || 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    define: {
      timestamps: true,
      underscored: true
    }
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('資料庫連線成功');
    
    // 如果設置了同步數據庫
    if (process.env.SYNC_DB === 'true') {
      console.log('同步數據庫模型中...');
      await sequelize.sync({ alter: true });
      console.log('數據庫模型同步完成');
    }
  } catch (error) {
    console.error('資料庫連線失敗:', error);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
