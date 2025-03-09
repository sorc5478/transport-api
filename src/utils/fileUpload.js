const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ErrorResponse = require('./errorResponse');

/**
 * 配置文件上傳
 * @param {string} destination - 文件上傳目標文件夾
 * @param {string} filePrefix - 文件名前綴
 * @param {string} fieldName - 表單字段名稱
 * @param {number} maxCount - 最大文件數量
 * @param {Array} allowedTypes - 允許的 MIME 類型
 * @param {number} maxSize - 最大文件大小 (bytes)
 */
exports.setupUpload = (
  destination,
  filePrefix = 'file',
  fieldName = 'file',
  maxCount = 1,
  allowedTypes = ['image/jpeg', 'image/png', 'image/gif'],
  maxSize = 5 * 1024 * 1024 // 默認 5MB
) => {
  // 創建存儲配置
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, '../../uploads', destination);
      
      // 確保目錄存在
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      // 創建唯一文件名
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
      cb(null, `${filePrefix}_${uniqueSuffix}${path.extname(file.originalname)}`);
    }
  });

  // 文件過濾器
  const fileFilter = (req, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ErrorResponse(
        `不支持的文件類型。允許的類型: ${allowedTypes.join(', ')}`, 
        400
      ), false);
    }
  };

  // 創建 multer 實例
  const upload = multer({
    storage,
    limits: { fileSize: maxSize },
    fileFilter
  });

  // 依據參數返回適當的 multer 中間件
  if (maxCount === 1) {
    return upload.single(fieldName);
  } else {
    return upload.array(fieldName, maxCount);
  }
};

/**
 * 移除上傳的文件
 * @param {string|Array} filePaths - 文件路徑或路徑數組
 */
exports.removeUploadedFiles = (filePaths) => {
  const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
  
  paths.forEach(filePath => {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });
};

/**
 * 獲取上傳文件路徑
 * @param {string} destination - 文件夾
 * @param {string} filename - 文件名
 * @returns {string} 完整文件路徑
 */
exports.getFilePath = (destination, filename) => {
  return path.join(__dirname, '../../uploads', destination, filename);
};

/**
 * 獲取上傳文件的 URL
 * @param {string} destination - 文件夾
 * @param {string} filename - 文件名
 * @returns {string} 文件 URL
 */
exports.getFileUrl = (destination, filename) => {
  return `/uploads/${destination}/${filename}`;
};
