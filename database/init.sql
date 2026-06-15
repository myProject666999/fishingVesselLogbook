-- 渔船捕捞作业电子日志系统 - 数据库初始化脚本
-- 创建数据库
CREATE DATABASE IF NOT EXISTS fishing_logbook DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE fishing_logbook;

-- 渔船表
CREATE TABLE IF NOT EXISTS vessels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vessel_name VARCHAR(100) NOT NULL COMMENT '船名',
    vessel_no VARCHAR(50) UNIQUE NOT NULL COMMENT '船舶编号',
    captain_name VARCHAR(50) COMMENT '船长姓名',
    phone VARCHAR(20) COMMENT '联系电话',
    gross_tonnage DECIMAL(10,2) COMMENT '总吨位',
    length DECIMAL(10,2) COMMENT '船长(米)',
    status TINYINT DEFAULT 1 COMMENT '状态：1-正常 0-停用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_vessel_no (vessel_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='渔船表';

-- 航次表
CREATE TABLE IF NOT EXISTS voyages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vessel_id INT NOT NULL COMMENT '渔船ID',
    voyage_no VARCHAR(50) UNIQUE NOT NULL COMMENT '航次编号',
    departure_time DATETIME COMMENT '开航时间',
    arrival_time DATETIME COMMENT '返港时间',
    departure_port VARCHAR(100) COMMENT '出发港口',
    arrival_port VARCHAR(100) COMMENT '抵达港口',
    status TINYINT DEFAULT 0 COMMENT '状态：0-进行中 1-已完成 2-已取消',
    total_distance DECIMAL(12,2) DEFAULT 0 COMMENT '总航程(海里)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_vessel_id (vessel_id),
    INDEX idx_voyage_no (voyage_no),
    INDEX idx_status (status),
    FOREIGN KEY (vessel_id) REFERENCES vessels(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='航次表';

-- GPS轨迹点表
CREATE TABLE IF NOT EXISTS track_points (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    voyage_id INT NOT NULL COMMENT '航次ID',
    vessel_id INT NOT NULL COMMENT '渔船ID',
    longitude DECIMAL(10,6) NOT NULL COMMENT '经度',
    latitude DECIMAL(10,6) NOT NULL COMMENT '纬度',
    speed DECIMAL(8,2) COMMENT '航速(节)',
    heading DECIMAL(5,2) COMMENT '航向(度)',
    timestamp DATETIME NOT NULL COMMENT '定位时间',
    is_offline_upload TINYINT DEFAULT 0 COMMENT '是否离线补传：0-实时 1-补传',
    is_simplified TINYINT DEFAULT 0 COMMENT '是否抽稀保留点：0-否 1-是',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_voyage_id (voyage_id),
    INDEX idx_vessel_id (vessel_id),
    INDEX idx_timestamp (timestamp),
    FOREIGN KEY (voyage_id) REFERENCES voyages(id),
    FOREIGN KEY (vessel_id) REFERENCES vessels(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='GPS轨迹点表';

-- 捕捞日志表
CREATE TABLE IF NOT EXISTS catch_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    voyage_id INT NOT NULL COMMENT '航次ID',
    vessel_id INT NOT NULL COMMENT '渔船ID',
    log_date DATE NOT NULL COMMENT '作业日期',
    fish_type VARCHAR(50) NOT NULL COMMENT '鱼种',
    weight DECIMAL(10,2) NOT NULL COMMENT '重量(公斤)',
    estimated_value DECIMAL(12,2) COMMENT '预估价值(元)',
    buyer VARCHAR(100) COMMENT '买家',
    fishing_area VARCHAR(200) COMMENT '作业海域',
    remarks TEXT COMMENT '备注',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_voyage_id (voyage_id),
    INDEX idx_vessel_id (vessel_id),
    INDEX idx_log_date (log_date),
    FOREIGN KEY (voyage_id) REFERENCES voyages(id),
    FOREIGN KEY (vessel_id) REFERENCES vessels(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='捕捞日志表';

-- 禁渔区表
CREATE TABLE IF NOT EXISTS no_fishing_zones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    zone_name VARCHAR(100) NOT NULL COMMENT '禁渔区名称',
    zone_type VARCHAR(50) COMMENT '禁渔区类型',
    polygon_coords TEXT NOT NULL COMMENT '多边形坐标(JSON格式，点数组)',
    description TEXT COMMENT '描述',
    is_active TINYINT DEFAULT 1 COMMENT '是否启用：0-禁用 1-启用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='禁渔区表';

-- 禁渔期表
CREATE TABLE IF NOT EXISTS no_fishing_periods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    period_name VARCHAR(100) NOT NULL COMMENT '禁渔期名称',
    start_date DATE NOT NULL COMMENT '开始日期',
    end_date DATE NOT NULL COMMENT '结束日期',
    zone_ids VARCHAR(200) COMMENT '关联禁渔区ID列表(逗号分隔)',
    description TEXT COMMENT '描述',
    is_active TINYINT DEFAULT 1 COMMENT '是否启用：0-禁用 1-启用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_is_active (is_active),
    INDEX idx_dates (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='禁渔期表';

-- 违规记录表
CREATE TABLE IF NOT EXISTS violation_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vessel_id INT NOT NULL COMMENT '渔船ID',
    voyage_id INT COMMENT '航次ID',
    violation_type TINYINT NOT NULL COMMENT '违规类型：1-禁渔区 2-禁渔期',
    violation_time DATETIME NOT NULL COMMENT '违规时间',
    longitude DECIMAL(10,6) COMMENT '违规地点经度',
    latitude DECIMAL(10,6) COMMENT '违规地点纬度',
    zone_id INT COMMENT '涉事禁渔区ID',
    period_id INT COMMENT '涉事禁渔期ID',
    evidence TEXT COMMENT '证据(JSON格式)',
    status TINYINT DEFAULT 0 COMMENT '状态：0-待处理 1-已处理',
    handled_at DATETIME COMMENT '处理时间',
    handler VARCHAR(50) COMMENT '处理人',
    remarks TEXT COMMENT '处理备注',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_vessel_id (vessel_id),
    INDEX idx_voyage_id (voyage_id),
    INDEX idx_violation_type (violation_type),
    INDEX idx_status (status),
    FOREIGN KEY (vessel_id) REFERENCES vessels(id),
    FOREIGN KEY (voyage_id) REFERENCES voyages(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='违规记录表';

-- 买家表
CREATE TABLE IF NOT EXISTS buyers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    buyer_name VARCHAR(100) NOT NULL COMMENT '买家名称',
    contact_person VARCHAR(50) COMMENT '联系人',
    phone VARCHAR(20) COMMENT '联系电话',
    address VARCHAR(200) COMMENT '地址',
    status TINYINT DEFAULT 1 COMMENT '状态：1-正常 0-停用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='买家表';

-- 插入测试数据
INSERT INTO vessels (vessel_name, vessel_no, captain_name, phone, gross_tonnage, length) VALUES
('鲁渔001号', 'LUYU-001', '张大明', '13800138001', 50.5, 25.8),
('鲁渔002号', 'LUYU-002', '李海峰', '13800138002', 45.0, 22.5),
('鲁渔003号', 'LUYU-003', '王建国', '13800138003', 60.0, 28.0);

INSERT INTO buyers (buyer_name, contact_person, phone, address) VALUES
('青岛海鲜批发市场', '刘经理', '13900139001', '青岛市市南区海鲜市场'),
('烟台水产公司', '陈总', '13900139002', '烟台市芝罘区水产路');

INSERT INTO no_fishing_zones (zone_name, zone_type, polygon_coords, description) VALUES
('渤海湾产卵场', '产卵保护区', 
'[{"lng":121.0,"lat":38.5},{"lng":122.0,"lat":38.5},{"lng":122.0,"lat":39.0},{"lng":121.0,"lat":39.0}]',
'渤海湾对虾产卵保护区，每年5-7月禁渔'),
('莱州湾养殖区', '养殖保护区',
'[{"lng":119.5,"lat":37.2},{"lng":120.0,"lat":37.2},{"lng":120.0,"lat":37.5},{"lng":119.5,"lat":37.5}]',
'莱州湾水产养殖保护区');

INSERT INTO no_fishing_periods (period_name, start_date, end_date, description) VALUES
('黄渤海伏季休渔期', '2026-05-01', '2026-09-01', '黄渤海伏季休渔期，北纬35度以北的渤海和黄海海域');
