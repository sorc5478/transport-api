const Tenant = require('../models/Tenant');
const ErrorResponse = require('../utils/errorResponse');

// @desc    獲取所有租户
// @route   GET /api/tenants
// @access  Private/超級管理員
exports.getTenants = async (req, res, next) => {
  try {
    const tenants = await Tenant.find();

    res.status(200).json({
      success: true,
      count: tenants.length,
      data: tenants
    });
  } catch (err) {
    next(err);
  }
};

// @desc    獲取單個租户
// @route   GET /api/tenants/:id
// @access  Private/超級管理員
exports.getTenant = async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.params.id);

    if (!tenant) {
      return next(new ErrorResponse(`找不到 ID 為 ${req.params.id} 的租户`, 404));
    }

    res.status(200).json({
      success: true,
      data: tenant
    });
  } catch (err) {
    next(err);
  }
};

// @desc    創建租户
// @route   POST /api/tenants
// @access  Private/超級管理員
exports.createTenant = async (req, res, next) => {
  try {
    // 檢查租户代碼是否已存在
    const existingTenant = await Tenant.findOne({ code: req.body.code });
    
    if (existingTenant) {
      return next(new ErrorResponse('租户代碼已存在', 400));
    }

    const tenant = await Tenant.create(req.body);

    res.status(201).json({
      success: true,
      data: tenant
    });
  } catch (err) {
    next(err);
  }
};

// @desc    更新租户
// @route   PUT /api/tenants/:id
// @access  Private/超級管理員
exports.updateTenant = async (req, res, next) => {
  try {
    // 如果嘗試更新租户代碼，檢查是否已存在
    if (req.body.code) {
      const existingTenant = await Tenant.findOne({
        code: req.body.code,
        _id: { $ne: req.params.id }
      });
      
      if (existingTenant) {
        return next(new ErrorResponse('租户代碼已存在', 400));
      }
    }

    const tenant = await Tenant.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!tenant) {
      return next(new ErrorResponse(`找不到 ID 為 ${req.params.id} 的租户`, 404));
    }

    res.status(200).json({
      success: true,
      data: tenant
    });
  } catch (err) {
    next(err);
  }
};

// @desc    刪除租户
// @route   DELETE /api/tenants/:id
// @access  Private/超級管理員
exports.deleteTenant = async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.params.id);

    if (!tenant) {
      return next(new ErrorResponse(`找不到 ID 為 ${req.params.id} 的租户`, 404));
    }

    // TODO: 刪除租户前先檢查是否有關聯的用户、司機和車趟
    // 這裡應該添加邏輯來防止刪除有關聯數據的租户，或者提供級聯刪除選項

    await tenant.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    獲取當前租户信息
// @route   GET /api/tenants/current
// @access  Private
exports.getCurrentTenant = async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.tenantId);

    if (!tenant) {
      return next(new ErrorResponse('找不到當前租户信息', 404));
    }

    res.status(200).json({
      success: true,
      data: tenant
    });
  } catch (err) {
    next(err);
  }
};
