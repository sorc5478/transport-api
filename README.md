# 運輸管理系統 API

這是一個用於運輸管理系統的 RESTful API，旨在幫助管理車趟、司機和用戶。系統支持多租戶架構，提供完整的身份驗證和授權機制。

## 功能特點

- 多租戶架構：每個租戶有自己獨立的數據域
- 用戶角色：管理員、操作員、司機
- 車趟管理：創建、派發、跟蹤和完成貨運車趟
- 司機管理：管理司機信息、車輛和狀態
- 身份驗證：JWT 令牌認證
- 照片元數據：支持照片元數據管理（實際照片存儲在本地）
- 實時通知：使用 WebSocket 提供實時更新和聊天功能

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
- `mark_as_read` (客戶端到服務器): 標記消息已讀
- `messages_read` (服務器到客戶端): 消息已被讀取通知

### 車趟更新
- `trip_created` (服務器到客戶端): 新車趟創建通知
- `trip_updated` (服務器到客戶端): 車趟更新通知
- `trip_status_changed` (服務器到客戶端): 車趟狀態變更通知
- `trip_assigned` (服務器到客戶端): 車趟分配通知
- `trip_assigned_to_you` (服務器到客戶端): 車趟分配給司機通知
- `trip_transferred` (服務器到客戶端): 車趟轉移通知

### 司機更新
- `driver_status_updated` (服務器到客戶端): 司機狀態更新通知
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

前端使用範例：

```javascript
// 司機完成車趟並上傳照片元數據
const completeTrip = async (tripId, photos) => {
  // 照片元數據
  const photosMetadata = photos.map(photo => ({
    fileName: photo.name,
    fileSize: photo.size,
    fileType: photo.type,
    localIdentifier: photo.localId
  }));
  
  // 發送請求
  const response = await fetch(`/api/trips/${tripId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      status: '已完成',
      photos: photosMetadata
    })
  });
  
  return response.json();
};
```
