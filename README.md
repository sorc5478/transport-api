# 運輸管理系統 API

這是一個用於運輸管理系統的 RESTful API，旨在幫助管理車趟、司機和用戶。系統支持多租戶架構，提供完整的身份驗證和授權機制。

## 功能特點

- 多租戶架構：每個租戶有自己獨立的數據域
- 用戶角色：管理員、操作員、司機
- 車趟管理：創建、派發、跟蹤和完成貨運車趟
- 司機管理：管理司機信息、車輛和狀態
- 身份驗證：JWT 令牌認證
- 照片元數據：支持照片元數據管理（實際照片存儲在本地）
- 實時通訊：使用 WebSocket 提供實時更新和聊天功能
- 聊天系統：支持管理員與司機之間的即時通訊，包括文字和圖片訊息

## 技術棧

- Node.js + Express.js
- MySQL (通過 Sequelize ORM)
- JWT 身份驗證
- WebSocket (Socket.io)

## 安裝步驟

### 前提條件

- Node.js (>= 14.0.0)
- MySQL 數據庫

### 安裝步驟

1. 克隆存儲庫：

```bash
git clone <repository-url>
cd transport-management-api
```

2. 安裝依賴：

```bash
npm install
```

3. 配置環境變數：

環境變數已配置在 `.env` 文件中：

```
PORT=3001
NODE_ENV=development
DB_HOST=153.92.15.45
DB_PORT=3306
DB_NAME=u471925438_sorc
DB_USER=u471925438_sorc5477
DB_PASSWORD=Ab520431
DB_DIALECT=mysql
USE_MEMORY_DB=false
JWT_SECRET=vd257cjt
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000
```

4. 初始化數據庫：

有兩種方式可以初始化數據庫：

**選項 1: 使用 SQL 腳本**

在 MySQL 數據庫中執行 `database-init.sql` 腳本以創建所有表和示例數據。

**選項 2: 使用自動化腳本**

執行以下命令：

```bash
npm run db:init
```

這將創建所有表和初始數據。

5. 啟動伺服器：

```bash
# 開發模式
npm run dev

# 生產模式
npm start
```

## API 端點

### 身份驗證

- `POST /api/auth/register` - 註冊新用戶
- `POST /api/auth/login` - 用戶登入
- `POST /api/auth/driver/login` - 司機登入
- `GET /api/auth/logout` - 登出
- `GET /api/auth/me` - 獲取當前用戶信息

### 用戶管理

- `GET /api/users` - 獲取所有用戶
- `GET /api/users/:id` - 獲取特定用戶
- `POST /api/users` - 創建用戶
- `PUT /api/users/:id` - 更新用戶
- `DELETE /api/users/:id` - 刪除用戶
- `PUT /api/users/updatepassword` - 更新密碼

### 司機管理

- `GET /api/drivers` - 獲取所有司機
- `GET /api/drivers/:id` - 獲取特定司機
- `POST /api/drivers` - 創建司機
- `PUT /api/drivers/:id` - 更新司機信息
- `DELETE /api/drivers/:id` - 刪除司機
- `PUT /api/drivers/:id/updatepassword` - 更新司機密碼
- `PUT /api/drivers/location` - 更新司機位置
- `PUT /api/drivers/status` - 更新司機狀態

### 車趟管理

- `GET /api/trips` - 獲取所有車趟
- `GET /api/trips/:id` - 獲取特定車趟
- `POST /api/trips` - 創建車趟
- `PUT /api/trips/:id` - 更新車趟
- `DELETE /api/trips/:id` - 刪除車趟
- `PUT /api/trips/:id/assign` - 分配司機到車趟
- `PUT /api/trips/:id/transfer` - 轉移車趟給其他司機
- `PUT /api/trips/:id/status` - 更新車趟狀態（包括完成車趟時上傳照片元數據）
- `POST /api/trips/:id/photos/metadata` - 記錄車趟照片元數據
- `GET /api/trips/:id/photos/metadata` - 獲取車趟照片元數據
- `DELETE /api/trips/:id/photos/:photoId` - 刪除車趟照片元數據

### 租戶管理

- `GET /api/tenants` - 獲取所有租戶
- `GET /api/tenants/:id` - 獲取特定租戶
- `POST /api/tenants` - 創建租戶
- `PUT /api/tenants/:id` - 更新租戶
- `DELETE /api/tenants/:id` - 刪除租戶
- `GET /api/tenants/current` - 獲取當前租戶信息

### 聊天功能

- `GET /api/chat/unread` - 獲取所有司機的未讀訊息數量
- `GET /api/chat/drivers/:id/messages` - 獲取與特定司機的聊天訊息
- `POST /api/chat/drivers/:id/messages` - 發送訊息給司機
- `POST /api/chat/drivers/:id/images` - 上傳圖片訊息給司機
- `POST /api/chat/drivers/:id/read` - 標記司機訊息為已讀
- `POST /api/chat/test/driver/:id/message` - 模擬司機發送訊息（僅用於測試）

## 司機完成車趟流程

當司機完成車趟時，需遵循以下流程：

1. 司機拍攝照片並存儲在本地設備上
2. 司機應用將照片元數據（文件名、大小等）與狀態更新一起發送
3. 調用 API：`PUT /api/trips/:id/status` 並提供如下數據：

```json
{
  "status": "已完成",
  "photos": [
    {
      "fileName": "delivery_photo_20250309_001.jpg",
      "fileSize": 1024000,
      "fileType": "image/jpeg",
      "localIdentifier": "local-uuid-12345"
    },
    {
      "fileName": "delivery_confirmation_20250309_001.jpg",
      "fileSize": 1048576,
      "fileType": "image/jpeg",
      "localIdentifier": "local-uuid-67890"
    }
  ]
}
```

4. API 會記錄照片元數據並更新車趟狀態
5. API 還會通過 WebSocket 廣播狀態變更通知
6. 當管理員需要查看照片時，他們可以從司機那裡請求完整照片

## 認證與授權

API 使用 JWT 進行認證。所有受保護的路由需要在請求頭中包含 Bearer 令牌：

```
Authorization: Bearer <token>
```

不同角色具有不同的權限：

- **管理員**：可以管理所有資源
- **操作員**：可以創建和管理車趟，但不能管理用戶
- **司機**：只能訪問分配給他們的車趟和更新自己的狀態

## 司機登入特性

本系統支持司機使用以下兩種方式登入：
1. 使用電話號碼和密碼
2. 使用車牌號碼和密碼

司機登入時需要提供租戶代碼以確認其所屬租戶。

## 司機位置更新

API 支持司機位置的即時更新：

1. 司機應用程序定期獲取 GPS 位置
2. 將位置發送到 `PUT /api/drivers/location` 端點
3. API 通過 WebSocket 向管理員廣播位置更新
4. 管理員應用程序可以在地圖上實時顯示司機位置

## WebSocket 事件

API 使用 Socket.io 提供以下實時事件：

### 身份驗證
- `authenticate` (客戶端到服務器): 驗證 WebSocket 連接
- `authenticated` (服務器到客戶端): 認證結果

### 聊天功能
- `send_message` (客戶端到服務器): 發送聊天消息
- `new_message` (服務器到客戶端): 接收新消息
- `send_image_message` (客戶端到服務器): 發送圖片消息
- `new_image_message` (服務器到客戶端): 接收新圖片消息
- `mark_as_read` (客戶端到服務器): 標記消息已讀
- `messages_read` (服務器到客戶端): 消息已被讀取通知
- `message_sent` (服務器到客戶端): 消息發送確認
- `image_message_sent` (服務器到客戶端): 圖片消息發送確認
- `driver_message` (服務器到客戶端): 司機發送消息通知
- `driver_image_message` (服務器到客戶端): 司機發送圖片通知

### 車趟更新
- `trip_created` (服務器到客戶端): 新車趟創建通知
- `trip_updated` (服務器到客戶端): 車趟更新通知
- `trip_status_changed` (服務器到客戶端): 車趟狀態變更通知
- `trip_assigned` (服務器到客戶端): 車趟分配通知
- `trip_assigned_to_you` (服務器到客戶端): 車趟分配給司機通知
- `trip_transferred` (服務器到客戶端): 車趟轉移通知

### 司機更新
- `driver_status_changed` (客戶端到服務器): 更新司機狀態
- `driver_status_update` (服務器到客戶端): 司機狀態更新通知
- `driver_location_updated` (服務器到客戶端): 司機位置更新通知

## 初始用戶憑據

系統初始化後會創建以下用戶：

**管理員**:
- 電子郵件: admin@example.com
- 密碼: admin123

**操作員**:
- 電子郵件: operator@example.com
- 密碼: operator123

**司機**:
- 司機 ID: D001
- 電話: 0912345678
- 車牌: ABC-1234
- 密碼: driver123

## 部署與維護

### 文件上傳

照片文件存儲在客戶端本地，API 只存儲照片元數據。

### 數據庫同步

如需在修改模型後同步數據庫（不刪除現有數據），可以執行：

```bash
npm run db:sync
```

### 故障排除

如遇資料庫連接問題，請檢查：
1. 資料庫主機是否可以訪問（153.92.15.45:3306）
2. 資料庫用戶名和密碼是否正確
3. 資料庫 `u471925438_sorc` 是否存在

## 前端整合

前端應用需要：
1. 與 API 通信以獲取/提交數據
2. 使用 WebSocket 接收實時更新
3. 在本地存儲照片和聊天記錄
4. 實現照片本地管理和同步機制

### 聊天功能的前端整合

聊天功能是本系統的重要組成部分，前端需要實現以下功能：

1. **初始化 Socket.IO 連接並進行認證**：
```javascript
// 初始化 Socket.IO 連接
const socket = io(API_BASE_URL);
socket.emit('authenticate', jwtToken);
socket.on('authenticated', (response) => {
  if (response.success) {
    console.log('Socket.IO 認證成功');
  } else {
    console.warn('Socket.IO 認證失敗');
  }
});
```

2. **發送訊息給司機**：
```javascript
// 通過 API 發送訊息
const sendMessage = async (driverId, text) => {
  // 保存到本地存儲
  const localMessage = await saveMessageLocally(driverId, text);
  
  // 通過 API 發送訊息
  const response = await fetch(`${API_BASE_URL}/api/chat/drivers/${driverId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ text })
  });
  
  return response.json();
};
```

3. **監聽新訊息和圖片訊息**：
```javascript
// 接收司機發送的文字訊息
socket.on('new_message', (message) => {
  if (message.senderType === 'driver') {
    // 更新聊天介面
    updateChatInterface(message);
    // 保存到本地存儲
    saveMessageLocally(message.senderId, message.content);
  }
});

// 接收司機發送的圖片訊息
socket.on('new_image_message', (message) => {
  if (message.senderType === 'driver') {
    // 更新聊天介面
    updateChatInterface(message, true);
    // 保存到本地存儲
    saveImageLocally(message.senderId, message.thumbnail);
  }
});
```

4. **標記訊息為已讀**：
```javascript
// 標記司機訊息為已讀
const markAsRead = async (driverId) => {
  // 通過 API 標記為已讀
  const response = await fetch(`${API_BASE_URL}/api/chat/drivers/${driverId}/read`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  // 更新本地存儲的訊息狀態
  await updateLocalMessageStatus(driverId);
  
  return response.json();
};
```

5. **上傳圖片訊息**：
```javascript
// 上傳圖片訊息
const uploadImage = async (driverId, imageData) => {
  // 保存到本地存儲
  await saveImageLocally(driverId, imageData);
  
  // 通過 API 上傳圖片
  const response = await fetch(`${API_BASE_URL}/api/chat/drivers/${driverId}/images`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ imageData })
  });
  
  return response.json();
};
```

6. **獲取未讀訊息計數**：
```javascript
// 獲取所有司機的未讀訊息數量
const getUnreadCounts = async () => {
  const response = await fetch(`${API_BASE_URL}/api/chat/unread`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return response.json();
};
```

7. **本地儲存實現**：
為了支持離線使用和提高性能，前端應該實現本地訊息儲存，可以使用 IndexedDB 或 localStorage：

```javascript
// 使用 IndexedDB 儲存訊息
const dbPromise = openDB('chatDB', 1, {
  upgrade(db) {
    db.createObjectStore('messages', { keyPath: 'id' });
    db.createObjectStore('images', { keyPath: 'id' });
  }
});

async function saveMessageLocally(driverId, text, isFromDriver = false) {
  const db = await dbPromise;
  const message = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2)}`,
    driverId,
    text,
    senderId: isFromDriver ? driverId : 'admin',
    timestamp: new Date().toISOString(),
    unread: isFromDriver
  };
  
  await db.put('messages', message);
  return message;
}
```

通過整合上述功能，前端可以實現完整的聊天系統，支持離線使用並提供良好的用戶體驗。

## 離線功能與同步機制

運輸管理系統的一個重要特性是支持離線操作。前端應用需要實現以下機制：

1. **本地數據存儲**：使用 IndexedDB 或其他客戶端存儲解決方案
2. **同步隊列**：跟踪離線期間的操作，在網絡恢復後同步
3. **衝突解決**：實現衝突檢測和解決策略
4. **資源緩存**：使用 Service Workers 緩存靜態資源和數據

這種架構可以確保系統在網絡不穩定的環境中也能可靠運行。
