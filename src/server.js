const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { sequelize, connectDB } = require('./config/db');
const errorHandler = require('./middlewares/error');
const { Driver } = require('./models');

// 載入環境變數
dotenv.config();

// 初始化 Express 應用
const app = express();

// 創建 HTTP 服務器
const server = http.createServer(app);

// 連接資料庫
connectDB();

// 中間件
// 設置 CORS - 允許所有來源
const corsOptions = {
  origin: '*',  // 允許所有來源
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// 靜態文件服務
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 路由
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/drivers', require('./routes/driverRoutes'));
app.use('/api/trips', require('./routes/tripRoutes'));
app.use('/api/tenants', require('./routes/tenantRoutes'));

// 根路由
app.get('/', (req, res) => {
  res.json({
    message: '運輸管理系統 API 運行中',
    version: '1.0.0',
    documentation: '/api/docs'
  });
});

// 初始化 Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',  // 允許所有來源
    methods: ["GET", "POST"],
    credentials: true
  }
});

// 存儲用戶連接信息
const userConnections = new Map();

// WebSocket 連接處理
io.on('connection', (socket) => {
  console.log('新客戶端連接');
  
  // 用戶認證
  socket.on('authenticate', async (token) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // 設置 socket 用戶信息
      socket.userId = decoded.id;
      socket.userType = decoded.role === 'driver' ? 'driver' : 'user';
      socket.userRole = decoded.role;
      socket.tenantId = decoded.tenantId;
      
      // 保存連接信息
      const userKey = `${socket.userType}-${socket.userId}`;
      userConnections.set(userKey, socket.id);
      
      // 加入租戶房間
      socket.join(`tenant-${socket.tenantId}`);
      
      // 加入角色房間
      if (socket.userType === 'driver') {
        socket.join('drivers');
        socket.join(`driver-${socket.userId}`);
      } else {
        socket.join(`${socket.userRole}-users`);
        socket.join(`user-${socket.userId}`);
      }
      
      socket.emit('authenticated', { success: true });
      console.log(`用戶 ${userKey} 已認證`);
    } catch (err) {
      socket.emit('authenticated', { 
        success: false, 
        message: '認證失敗'
      });
    }
  });
  
  // 斷開連接處理
  socket.on('disconnect', () => {
    if (socket.userId) {
      const userKey = `${socket.userType}-${socket.userId}`;
      userConnections.delete(userKey);
      console.log(`用戶 ${userKey} 已斷開連接`);
    }
  });
  
  // 聊天消息處理
  socket.on('send_message', (data) => {
    const { receiverId, receiverType, content, messageId } = data;
    
    if (!socket.userId) {
      return socket.emit('error', { message: '未認證' });
    }
    
    const message = {
      messageId,
      content,
      senderId: socket.userId,
      senderType: socket.userType,
      senderName: data.senderName || 'Unknown',
      timestamp: new Date().toISOString()
    };
    
    // 發送給接收者
    const receiverRoom = receiverType === 'driver' ? 
      `driver-${receiverId}` : `user-${receiverId}`;
    io.to(receiverRoom).emit('new_message', message);
    
    // 確認消息已發送
    socket.emit('message_sent', { messageId });
  });
  
  // 圖片消息處理
  socket.on('send_image_message', (data) => {
    const { receiverId, receiverType, thumbnail, messageId } = data;
    
    if (!socket.userId) {
      return socket.emit('error', { message: '未認證' });
    }
    
    // 發送縮略圖給接收者
    const receiverRoom = receiverType === 'driver' ? 
      `driver-${receiverId}` : `user-${receiverId}`;
    
    io.to(receiverRoom).emit('new_image_message', {
      messageId,
      senderId: socket.userId,
      senderType: socket.userType,
      senderName: data.senderName || 'Unknown',
      thumbnail,
      timestamp: new Date().toISOString()
    });
    
    // 確認消息已發送
    socket.emit('image_message_sent', { messageId });
  });
  
  // 通知司機狀態變更
  socket.on('driver_status_changed', async (data) => {
    if (!socket.userId || socket.userType !== 'driver') {
      return socket.emit('error', { message: '未授權' });
    }
    
    const { status } = data;
    if (!['空車', '忙碌中'].includes(status)) {
      return socket.emit('error', { message: '無效的狀態' });
    }
    
    try {
      // 更新數據庫中的司機狀態
      await Driver.update(
        { status },
        { where: { id: socket.userId } }
      );
      
      // 通知管理員和操作員
      io.to(`tenant-${socket.tenantId}`).emit('driver_status_update', {
        driverId: socket.userId,
        status
      });
      
      socket.emit('status_updated', { status });
    } catch (err) {
      socket.emit('error', { message: '更新狀態失敗' });
    }
  });
  
  // 車趟狀態變更通知
  socket.on('trip_status_changed', async (data) => {
    // 相應處理邏輯會在控制器中實現
    socket.emit('error', { message: '請使用 API 更新車趟狀態' });
  });
  
  // 已讀消息通知
  socket.on('mark_as_read', (data) => {
    const { messageIds, senderId, senderType } = data;
    
    if (!socket.userId) {
      return socket.emit('error', { message: '未認證' });
    }
    
    // 通知發送者消息已讀
    if (senderId && senderType) {
      const senderRoom = senderType === 'driver' ? 
        `driver-${senderId}` : `user-${senderId}`;
      
      io.to(senderRoom).emit('messages_read', {
        messageIds,
        readBy: socket.userId,
        readByType: socket.userType,
        timestamp: new Date().toISOString()
      });
    }
    
    socket.emit('mark_as_read_confirmed', { messageIds });
  });
});

// 讓 io 可以在其他地方訪問
app.set('io', io);

// 錯誤處理中間件
app.use(errorHandler);

// 404 路由處理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: '找不到請求的路徑'
  });
});

// 啟動伺服器
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`伺服器運行在 http://localhost:${PORT}`);
  console.log(`環境: ${process.env.NODE_ENV}`);
});

// 導出 app 和 io 以便在測試中使用
module.exports = { app, io, server };
