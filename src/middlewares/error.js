const ErrorResponse = require('../utils/errorResponse');
const { ValidationError, UniqueConstraintError, ForeignKeyConstraintError } = require('sequelize');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log to console for dev
  console.error(err);

  // Sequelize validation error
  if (err instanceof ValidationError) {
    const message = Object.values(err.errors).map(val => val.message);
    error = new ErrorResponse(message, 400);
  }

  // Sequelize unique constraint error
  if (err instanceof UniqueConstraintError) {
    const message = Object.values(err.errors).map(val => val.message);
    error = new ErrorResponse(message, 400);
  }

  // Sequelize foreign key constraint error
  if (err instanceof ForeignKeyConstraintError) {
    error = new ErrorResponse('無法刪除已被引用的資料', 400);
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = `找不到 ID 為 ${err.value} 的資源`;
    error = new ErrorResponse(message, 404);
  }

  // JWT 錯誤
  if (err.name === 'JsonWebTokenError') {
    error = new ErrorResponse('無效的令牌', 401);
  }

  // JWT 過期
  if (err.name === 'TokenExpiredError') {
    error = new ErrorResponse('令牌已過期', 401);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || '伺服器內部錯誤'
  });
};

module.exports = errorHandler;
