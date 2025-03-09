const { User, Driver, Tenant } = require('../models');
const ErrorResponse = require('../utils/errorResponse');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/db');

// @desc    註冊用户
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, phone, password, role, tenantCode } = req.body;

    // 查找租户
    const tenant = await Tenant.findOne({ where: { code: tenantCode } });
    
    if (!tenant) {
      return next(new ErrorResponse('無效的租户代碼', 400));
    }

    // 檢查電子郵件是否已存在
    const existingUser = await User.findOne({ where: { email } });
    
    if (existingUser) {
      return next(new ErrorResponse('電子郵件已被註冊', 400));
    }

    // 創建用户
    const user = await User.create({
      name,
      email,
      phone,
      password,
      role: role || '操作員',
      tenantId: tenant.id
    });

    // 移除密碼字段
    user.password = undefined;

    // 發送 token 響應
    sendTokenResponse(user, 201, res);
  } catch (err) {
    next(err);
  }
};

// @desc    登入用户
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 驗證輸入
    if (!email || !password) {
      return next(new ErrorResponse('請提供電子郵件和密碼', 400));
    }

    // 檢查用户 (使用 scope 包含密碼字段)
    const user = await User.scope('withPassword').findOne({ where: { email } });

    if (!user) {
      return next(new ErrorResponse('無效的憑據', 401));
    }

    // 檢查密碼
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return next(new ErrorResponse('無效的憑據', 401));
    }

    // 發送 token 響應
    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// @desc    司機登入
// @route   POST /api/auth/driver/login
// @access  Public
exports.driverLogin = async (req, res, next) => {
  try {
    const { identifier, password, tenantCode } = req.body;

    // 驗證輸入
    if (!identifier || !password) {
      return next(new ErrorResponse('請提供電話或車牌號碼和密碼', 400));
    }

    if (!tenantCode) {
      return next(new ErrorResponse('請提供租戶代碼', 400));
    }

    // 查找租户
    const tenant = await Tenant.findOne({ where: { code: tenantCode } });
    
    if (!tenant) {
      return next(new ErrorResponse('無效的租户代碼', 400));
    }

    // 檢查司機 (透過電話或車牌號碼)
    const driver = await Driver.scope('withPassword').findOne({
      where: {
        [sequelize.Op.or]: [
          { phone: identifier },
          { licensePlate: identifier }
        ],
        tenantId: tenant.id
      }
    });

    if (!driver) {
      return next(new ErrorResponse('無效的憑據', 401));
    }

    // 檢查密碼
    const isMatch = await driver.matchPassword(password);

    if (!isMatch) {
      return next(new ErrorResponse('無效的憑據', 401));
    }

    // 發送 token 響應
    sendTokenResponse(driver, 200, res);
  } catch (err) {
    next(err);
  }
};

// @desc    登出
// @route   GET /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    data: {}
  });
};

// @desc    獲取當前登入的用户
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: req.user
    });
  } catch (err) {
    next(err);
  }
};

// 獲取 token、創建 cookie 並發送響應
const sendTokenResponse = (user, statusCode, res) => {
  // 創建 token
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + parseInt(process.env.JWT_EXPIRES_IN) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token
    });
};
