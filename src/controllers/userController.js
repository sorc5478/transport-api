const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');

// @desc    獲取所有用户
// @route   GET /api/users
// @access  Private/管理員
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find({ tenantId: req.tenantId });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (err) {
    next(err);
  }
};

// @desc    獲取單個用户
// @route   GET /api/users/:id
// @access  Private/管理員
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      tenantId: req.tenantId
    });

    if (!user) {
      return next(new ErrorResponse(`找不到 ID 為 ${req.params.id} 的用户`, 404));
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

// @desc    創建用户
// @route   POST /api/users
// @access  Private/管理員
exports.createUser = async (req, res, next) => {
  try {
    // 添加租户 ID
    req.body.tenantId = req.tenantId;

    // 檢查電子郵件是否已存在
    const existingUser = await User.findOne({ email: req.body.email });
    
    if (existingUser) {
      return next(new ErrorResponse('電子郵件已被註冊', 400));
    }

    const user = await User.create(req.body);

    res.status(201).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

// @desc    更新用户
// @route   PUT /api/users/:id
// @access  Private/管理員
exports.updateUser = async (req, res, next) => {
  try {
    // 不允許更新租户 ID
    if (req.body.tenantId) {
      delete req.body.tenantId;
    }

    // 如果嘗試更新電子郵件，檢查是否已存在
    if (req.body.email) {
      const existingUser = await User.findOne({
        email: req.body.email,
        _id: { $ne: req.params.id }
      });
      
      if (existingUser) {
        return next(new ErrorResponse('電子郵件已被註冊', 400));
      }
    }

    let user = await User.findOne({
      _id: req.params.id,
      tenantId: req.tenantId
    });

    if (!user) {
      return next(new ErrorResponse(`找不到 ID 為 ${req.params.id} 的用户`, 404));
    }

    // 檢查是否嘗試更新自己的角色
    if (req.user.id === req.params.id && req.body.role && req.body.role !== user.role) {
      return next(new ErrorResponse('用户不能更改自己的角色', 403));
    }

    user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

// @desc    刪除用户
// @route   DELETE /api/users/:id
// @access  Private/管理員
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      tenantId: req.tenantId
    });

    if (!user) {
      return next(new ErrorResponse(`找不到 ID 為 ${req.params.id} 的用户`, 404));
    }

    // 防止管理員刪除自己
    if (req.user.id === req.params.id) {
      return next(new ErrorResponse('用户不能刪除自己的帳戶', 403));
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    更新密碼
// @route   PUT /api/users/updatepassword
// @access  Private
exports.updatePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+password');

    // 檢查當前密碼
    const isMatch = await user.matchPassword(req.body.currentPassword);

    if (!isMatch) {
      return next(new ErrorResponse('密碼不正確', 401));
    }

    user.password = req.body.newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};
