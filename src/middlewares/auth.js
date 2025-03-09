const jwt = require('jsonwebtoken');
const { User, Driver } = require('../models');
const ErrorResponse = require('../utils/errorResponse');

// 保護路由 - 確保用户已登入
exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // 從 Bearer token 提取 token
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    // 或從 cookie 提取
    token = req.cookies.token;
  }

  // 檢查 token 是否存在
  if (!token) {
    return next(new ErrorResponse('未授權訪問', 401));
  }

  try {
    // 驗證 token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 根據角色和 ID 取得用户
    if (decoded.role === 'driver') {
      req.user = await Driver.findByPk(decoded.id);
      req.userType = 'driver';
    } else {
      req.user = await User.findByPk(decoded.id);
      req.userType = 'admin';
    }

    if (!req.user) {
      return next(new ErrorResponse('找不到使用者', 401));
    }

    // 設置租戶 ID
    req.tenantId = decoded.tenantId;

    next();
  } catch (err) {
    return next(new ErrorResponse('未授權訪問', 401));
  }
};

// 授權特定角色
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (req.userType === 'driver' && !roles.includes('driver')) {
      return next(new ErrorResponse(`司機角色無權訪問此資源`, 403));
    }

    if (req.userType === 'admin' && !roles.includes(req.user.role)) {
      return next(new ErrorResponse(`${req.user.role} 角色無權訪問此資源`, 403));
    }

    next();
  };
};

// 確保用户只能訪問其租户的数据
exports.ensureTenantAccess = async (req, res, next) => {
  if (!req.tenantId) {
    return next(new ErrorResponse('未指定租户', 400));
  }

  // 檢查請求中的租户 ID 是否與用户的租户 ID 匹配
  const requestTenantId = req.params.tenantId || req.body.tenantId || req.query.tenantId;

  if (requestTenantId && parseInt(requestTenantId) !== parseInt(req.tenantId)) {
    return next(new ErrorResponse('無權訪問其他租户的数据', 403));
  }

  next();
};
