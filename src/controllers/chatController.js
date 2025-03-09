const { Driver, User } = require('../models');
const ErrorResponse = require('../utils/errorResponse');

// 創建一個簡單的記憶體存儲來模擬聊天訊息數據庫
// 在實際生產環境中，這應該使用數據庫持久化
const chatMessages = new Map(); // driverId -> messages[]
const unreadMessages = new Map(); // driverId -> count

/**
 * 初始化訊息存儲
 * @param {string} driverId 司機ID
 */
const initializeMessageStore = (driverId) => {
  if (!chatMessages.has(driverId)) {
    chatMessages.set(driverId, []);
  }
  
  if (!unreadMessages.has(driverId)) {
    unreadMessages.set(driverId, 0);
  }
};

/**
 * 獲取司機的聊天訊息
 * @route   GET /api/chat/drivers/:id/messages
 * @access  Private
 */
exports.getDriverMessages = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // 檢查該司機是否存在
    const driver = await Driver.findOne({
      where: {
        id,
        tenantId: req.tenantId
      }
    });
    
    if (!driver) {
      return next(new ErrorResponse(`找不到ID為 ${id} 的司機`, 404));
    }
    
    // 初始化訊息存儲
    initializeMessageStore(id);
    
    // 獲取訊息
    const messages = chatMessages.get(id) || [];
    
    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 發送訊息給司機
 * @route   POST /api/chat/drivers/:id/messages
 * @access  Private
 */
exports.sendMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text, isImage } = req.body;
    
    if (!text) {
      return next(new ErrorResponse('請提供訊息內容', 400));
    }
    
    // 檢查該司機是否存在
    const driver = await Driver.findOne({
      where: {
        id,
        tenantId: req.tenantId
      }
    });
    
    if (!driver) {
      return next(new ErrorResponse(`找不到ID為 ${id} 的司機`, 404));
    }
    
    // 初始化訊息存儲
    initializeMessageStore(id);
    
    // 創建新訊息
    const message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      senderId: 'admin',
      senderName: req.user?.name || '管理員',
      text,
      isImage: isImage || false,
      timestamp: new Date().toISOString(),
      unread: true
    };
    
    // 保存訊息
    const messages = chatMessages.get(id);
    messages.push(message);
    
    // 更新司機未讀消息數量
    unreadMessages.set(id, (unreadMessages.get(id) || 0) + 1);
    
    // 透過 Socket.IO 發送實時訊息
    const io = req.app.get('io');
    if (io) {
      io.to(`driver-${id}`).emit('new_message', {
        messageId: message.id,
        content: text,
        senderId: 'admin',
        senderType: 'admin',
        senderName: req.user?.name || '管理員',
        timestamp: message.timestamp,
        isImage: message.isImage
      });
    }
    
    res.status(201).json({
      success: true,
      data: message
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 上傳圖片訊息
 * @route   POST /api/chat/drivers/:id/images
 * @access  Private
 */
exports.uploadImage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { imageData } = req.body;
    
    if (!imageData) {
      return next(new ErrorResponse('請提供圖片數據', 400));
    }
    
    // 檢查該司機是否存在
    const driver = await Driver.findOne({
      where: {
        id,
        tenantId: req.tenantId
      }
    });
    
    if (!driver) {
      return next(new ErrorResponse(`找不到ID為 ${id} 的司機`, 404));
    }
    
    // 初始化訊息存儲
    initializeMessageStore(id);
    
    // 創建新圖片訊息
    const message = {
      id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      senderId: 'admin',
      senderName: req.user?.name || '管理員',
      text: imageData,
      isImage: true,
      timestamp: new Date().toISOString(),
      unread: true
    };
    
    // 保存訊息
    const messages = chatMessages.get(id);
    messages.push(message);
    
    // 更新司機未讀消息數量
    unreadMessages.set(id, (unreadMessages.get(id) || 0) + 1);
    
    // 透過 Socket.IO 發送實時圖片訊息
    const io = req.app.get('io');
    if (io) {
      io.to(`driver-${id}`).emit('new_image_message', {
        messageId: message.id,
        senderId: 'admin',
        senderType: 'admin',
        senderName: req.user?.name || '管理員',
        thumbnail: imageData,
        timestamp: message.timestamp
      });
    }
    
    res.status(201).json({
      success: true,
      data: message
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 標記司機訊息為已讀
 * @route   POST /api/chat/drivers/:id/read
 * @access  Private
 */
exports.markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // 檢查該司機是否存在
    const driver = await Driver.findOne({
      where: {
        id,
        tenantId: req.tenantId
      }
    });
    
    if (!driver) {
      return next(new ErrorResponse(`找不到ID為 ${id} 的司機`, 404));
    }
    
    // 初始化訊息存儲
    initializeMessageStore(id);
    
    // 獲取司機訊息
    const messages = chatMessages.get(id);
    
    // 標記所有司機發送的訊息為已讀
    let markedCount = 0;
    const markedIds = [];
    
    for (const message of messages) {
      if (message.senderId === id && message.unread) {
        message.unread = false;
        markedCount++;
        markedIds.push(message.id);
      }
    }
    
    // 重置未讀消息計數
    unreadMessages.set(id, 0);
    
    // 透過 Socket.IO 通知司機訊息已讀
    const io = req.app.get('io');
    if (io && markedIds.length > 0) {
      io.to(`driver-${id}`).emit('messages_read', {
        messageIds: markedIds,
        readBy: req.user?.id || 'admin',
        readByType: 'admin',
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        markedCount,
        markedIds
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 獲取所有司機的未讀訊息數量
 * @route   GET /api/chat/unread
 * @access  Private
 */
exports.getUnreadCounts = async (req, res, next) => {
  try {
    // 獲取租戶下所有司機
    const drivers = await Driver.findAll({
      where: { tenantId: req.tenantId },
      attributes: ['id']
    });
    
    // 初始化所有司機的訊息存儲
    for (const driver of drivers) {
      initializeMessageStore(driver.id);
    }
    
    // 構建未讀消息數量對象
    const unreadCounts = {};
    
    for (const driver of drivers) {
      unreadCounts[driver.id] = unreadMessages.get(driver.id.toString()) || 0;
    }
    
    res.status(200).json({
      success: true,
      data: unreadCounts
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 模擬司機發送訊息 (測試用)
 * @route   POST /api/chat/test/driver/:id/message
 * @access  Private/Admin
 */
exports.simulateDriverMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    
    if (!text) {
      return next(new ErrorResponse('請提供訊息內容', 400));
    }
    
    // 檢查該司機是否存在
    const driver = await Driver.findOne({
      where: {
        id,
        tenantId: req.tenantId
      }
    });
    
    if (!driver) {
      return next(new ErrorResponse(`找不到ID為 ${id} 的司機`, 404));
    }
    
    // 初始化訊息存儲
    initializeMessageStore(id);
    
    // 創建新訊息
    const message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      senderId: id,
      senderName: driver.name,
      text,
      isImage: false,
      timestamp: new Date().toISOString(),
      unread: true
    };
    
    // 保存訊息
    const messages = chatMessages.get(id);
    messages.push(message);
    
    // 更新管理員未讀消息數量
    unreadMessages.set(id, (unreadMessages.get(id) || 0) + 1);
    
    // 透過 Socket.IO 發送實時訊息到管理員
    const io = req.app.get('io');
    if (io) {
      // 向所有管理員和操作員發送通知
      io.to(`tenant-${req.tenantId}`).emit('new_message', {
        messageId: message.id,
        content: text,
        senderId: id,
        senderType: 'driver',
        senderName: driver.name,
        timestamp: message.timestamp
      });
    }
    
    res.status(201).json({
      success: true,
      data: message
    });
  } catch (err) {
    next(err);
  }
};
