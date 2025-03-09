const express = require('express');
const {
  getTenants,
  getTenant,
  createTenant,
  updateTenant,
  deleteTenant,
  getCurrentTenant
} = require('../controllers/tenantController');

const { protect, authorize, ensureTenantAccess } = require('../middlewares/auth');

const router = express.Router();

// 獲取當前租戶資訊的路由
router.get('/current', protect, ensureTenantAccess, getCurrentTenant);

// 以下路由只有超級管理員可以訪問
// 注意：這裡假設系統支持一個超級管理員角色，該角色不屬於任何租戶
router.route('/')
  .get(protect, authorize('超級管理員'), getTenants)
  .post(protect, authorize('超級管理員'), createTenant);

router.route('/:id')
  .get(protect, authorize('超級管理員'), getTenant)
  .put(protect, authorize('超級管理員'), updateTenant)
  .delete(protect, authorize('超級管理員'), deleteTenant);

module.exports = router;
