-- 創建租戶表
CREATE TABLE IF NOT EXISTS `tenants` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL UNIQUE,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `contact_person` VARCHAR(255) NOT NULL,
  `contact_email` VARCHAR(255) NOT NULL,
  `contact_phone` VARCHAR(50) NOT NULL,
  `address` VARCHAR(255),
  `status` ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 創建用戶表
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `phone` VARCHAR(50) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('管理員', '操作員') DEFAULT '操作員',
  `tenant_id` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 創建司機表 (已修改狀態枚舉為只有'空車'和'忙碌中')
CREATE TABLE IF NOT EXISTS `drivers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `driver_id` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(50) NOT NULL UNIQUE,
  `license_plate` VARCHAR(50) NOT NULL,
  `vehicle_type` ENUM('中型車', '一噸半', '大型車', '發財', '其他') NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `status` ENUM('空車', '忙碌中') DEFAULT '空車',
  `lat` DECIMAL(10,7) DEFAULT 0,
  `lng` DECIMAL(10,7) DEFAULT 0,
  `tenant_id` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 創建車趟表
CREATE TABLE IF NOT EXISTS `trips` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `trip_id` VARCHAR(100) NOT NULL UNIQUE,
  `customer` VARCHAR(255) NOT NULL,
  `shipper` VARCHAR(255) NOT NULL,
  `customs_broker` VARCHAR(255) NOT NULL,
  `company_amount` DECIMAL(10,2) NOT NULL,
  `driver_amount` DECIMAL(10,2) NOT NULL,
  `pickup_date` DATE NOT NULL,
  `pickup_time` VARCHAR(10) NOT NULL,
  `pickup_location` VARCHAR(255) NOT NULL,
  `delivery_location` VARCHAR(255) NOT NULL,
  `quantity` DECIMAL(10,2) NOT NULL,
  `quantity_unit` VARCHAR(20) NOT NULL,
  `volume` DECIMAL(10,2) NULL,
  `volume_unit` VARCHAR(20) NULL,
  `weight` DECIMAL(10,2) NULL,
  `vehicle_type` ENUM('中型車', '一噸半', '大型車', '發財', '其他') NOT NULL,
  `status` ENUM('待派發', '已派發', '進行中', '已完成', '已取消') DEFAULT '待派發',
  `remarks` TEXT NULL,
  `has_photos` BOOLEAN DEFAULT 0,
  `photo_count` INT DEFAULT 0,
  `tenant_id` INT NOT NULL,
  `created_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 創建車趟司機關聯表
CREATE TABLE IF NOT EXISTS `trip_drivers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `trip_id` INT NOT NULL,
  `driver_id` INT NOT NULL,
  `driver_name` VARCHAR(255) NOT NULL,
  `driver_phone` VARCHAR(50) NOT NULL,
  `license_plate` VARCHAR(50) NOT NULL,
  `assigned_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `status` ENUM('已派發', '進行中', '已完成', '已取消') DEFAULT '已派發',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`trip_id`) REFERENCES `trips` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 創建車趟照片表 (已修改，只存储元數據)
CREATE TABLE IF NOT EXISTS `trip_photos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `trip_id` INT NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_size` INT NULL,
  `file_type` VARCHAR(50) NULL,
  `uploaded_by` INT NULL,
  `uploaded_by_driver` INT NULL,
  `tenant_id` INT NOT NULL,
  `local_identifier` VARCHAR(255) NULL COMMENT '前端用於識別本地照片的標識符',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`trip_id`) REFERENCES `trips` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`uploaded_by_driver`) REFERENCES `drivers` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 創建初始租戶
INSERT INTO `tenants` (`name`, `code`, `contact_person`, `contact_email`, `contact_phone`, `address`, `status`)
VALUES ('預設租戶', 'DEFAULT', '系統管理員', 'admin@example.com', '0912345678', '台北市信義區', 'active');

-- 創建初始管理員用戶 (密碼: admin123，以下是bcrypt加密後的值)
INSERT INTO `users` (`name`, `email`, `phone`, `password`, `role`, `tenant_id`)
VALUES ('系統管理員', 'admin@example.com', '0912345678', '$2a$10$OMUKXBiTNuRGe1eY5HLWCOZEinZ5UhEtQSbaSfAfAV5CKjF4KVrWq', '管理員', 1);

-- 創建初始操作員用戶 (密碼: operator123，以下是bcrypt加密後的值)
INSERT INTO `users` (`name`, `email`, `phone`, `password`, `role`, `tenant_id`)
VALUES ('操作員', 'operator@example.com', '0923456789', '$2a$10$EyKzAXVtQsGQZO5hPk56hOQfJbZXPvw1.aRjKLCafGiQVkzT0LO/K', '操作員', 1);

-- 創建初始司機 (密碼: driver123，以下是bcrypt加密後的值)
INSERT INTO `drivers` (`driver_id`, `name`, `phone`, `license_plate`, `vehicle_type`, `password`, `status`, `tenant_id`)
VALUES 
('D001', '張小龍', '0912345678', 'ABC-1234', '中型車', '$2a$10$FMQ2xZZ5Ssj6UKU/t5dFY.L/MnBJO4XkGJoiEoAP9CuWpzXmRLI0u', '空車', 1),
('D002', '李大華', '0923456789', 'DEF-5678', '一噸半', '$2a$10$FMQ2xZZ5Ssj6UKU/t5dFY.L/MnBJO4XkGJoiEoAP9CuWpzXmRLI0u', '空車', 1);
