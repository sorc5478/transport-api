const express = require('express');
const chatController = require('../controllers/chatController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// 保護所有路由 - 需要認證
router.use(protect);

// 獲取所有司機的未讀訊息數量
router.get('/unread', chatController.getUnreadCounts);

// 獲取司機的聊天訊息
router.get('/drivers/:id/messages', chatController.getDriverMessages);

// 發送訊息給司機
router.post('/drivers/:id/messages', chatController.sendMessage);

// 上傳圖片訊息
router.post('/drivers/:id/images', chatController.uploadImage);

// 標記司機訊息為已讀
router.post('/drivers/:id/read', chatController.markAsRead);

// 測試路由 - 只有管理員可以訪問
router.post('/test/driver/:id/message', authorize('admin'), chatController.simulateDriverMessage);

module.exports = router;
