-- ============================================================
-- 航空部件生命周期与维修管理系统
-- 数据库建库脚本 (MySQL)
-- 适用工具：DBeaver + MySQL 8.0+
-- ============================================================

-- 创建并使用数据库
DROP DATABASE IF EXISTS aviation_mngt;
CREATE DATABASE aviation_mngt
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE aviation_mngt;

-- 关闭外键检查，方便建表顺序灵活
SET FOREIGN_KEY_CHECKS = 0;


-- ============================================================
-- 表 1：Operator（操作/技术人员表）
-- 记录安装、维修、审批等责任主体
-- ============================================================
CREATE TABLE Operator (
    operator_id   INT          NOT NULL AUTO_INCREMENT,
    name          VARCHAR(50)  NOT NULL COMMENT '姓名',
    role          ENUM('installer','technician','supervisor','admin')
                               NOT NULL COMMENT '角色',
    employee_no   VARCHAR(30)  NOT NULL COMMENT '工号',
    phone         VARCHAR(20)  NULL,
    is_active     TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '是否在职',
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (operator_id),
    UNIQUE KEY uq_employee_no (employee_no)
) ENGINE=InnoDB COMMENT='操作/技术人员表';


-- ============================================================
-- 表 2：Aircraft（飞机表）
-- ============================================================
CREATE TABLE Aircraft (
    aircraft_id       INT          NOT NULL AUTO_INCREMENT,
    registration_no   VARCHAR(20)  NOT NULL COMMENT '飞机注册号（唯一）',
    model             VARCHAR(50)  NOT NULL COMMENT '机型，如 B737、ARJ21',
    status            ENUM('active','maintenance','decommissioned')
                                   NOT NULL DEFAULT 'active' COMMENT '服役状态',
    commissioned_date DATE         NOT NULL COMMENT '启用日期',
    notes             TEXT         NULL,
    created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (aircraft_id),
    UNIQUE KEY uq_registration_no (registration_no)
) ENGINE=InnoDB COMMENT='飞机表';


-- ============================================================
-- 表 3：ComponentModel（部件型号表）
-- 区分"型号定义"与"实例"，体现设计寿命等公共属性
-- ============================================================
CREATE TABLE ComponentModel (
    model_id            INT           NOT NULL AUTO_INCREMENT,
    model_code          VARCHAR(30)   NOT NULL COMMENT '型号编码，唯一',
    category            VARCHAR(50)   NOT NULL COMMENT '部件类别，如发动机/起落架/传感器',
    design_life_hours   DECIMAL(10,2) NULL     COMMENT '设计寿命（飞行小时数），NULL表示无限制',
    maintenance_interval_hours DECIMAL(10,2) NULL COMMENT '维修周期（飞行小时）',
    applicable_aircraft VARCHAR(200)  NULL     COMMENT '适用机型（逗号分隔）',
    manufacturer        VARCHAR(100)  NULL,
    description         TEXT          NULL,
    created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (model_id),
    UNIQUE KEY uq_model_code (model_code)
) ENGINE=InnoDB COMMENT='部件型号表';


-- ============================================================
-- 表 4：Component（部件实例表）
-- 记录具体部件的入库、状态、累计使用
-- ============================================================
CREATE TABLE Component (
    component_id        INT           NOT NULL AUTO_INCREMENT,
    serial_no           VARCHAR(50)   NOT NULL COMMENT '部件序列号（全局唯一）',
    model_id            INT           NOT NULL COMMENT '对应型号',
    batch_no            VARCHAR(30)   NULL     COMMENT '批次号',
    manufacture_date    DATE          NULL     COMMENT '生产日期',
    inbound_date        DATE          NOT NULL COMMENT '入库日期',
    -- 状态枚举：available=库存可用, installed=已安装, under_maintenance=维修中,
    --           retired=已退役, scrapped=已报废
    status              ENUM('available','installed','under_maintenance','retired','scrapped')
                                      NOT NULL DEFAULT 'available',
    accumulated_hours   DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '累计飞行小时数',
    is_active           TINYINT(1)    NOT NULL DEFAULT 1 COMMENT '软删除标记：1正常，0逻辑删除',
    notes               TEXT          NULL,
    created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (component_id),
    UNIQUE KEY uq_serial_no (serial_no),
    CONSTRAINT fk_comp_model FOREIGN KEY (model_id)
        REFERENCES ComponentModel(model_id) ON UPDATE CASCADE,
    CONSTRAINT chk_accumulated_hours CHECK (accumulated_hours >= 0)
) ENGINE=InnoDB COMMENT='部件实例表';


-- ============================================================
-- 表 5：InstallationRecord（安装记录表）
-- 核心历史表：用"开始时间+结束时间"区间表示安装周期
-- 不允许覆盖旧记录
-- ============================================================
CREATE TABLE InstallationRecord (
    record_id       INT           NOT NULL AUTO_INCREMENT,
    component_id    INT           NOT NULL COMMENT '部件',
    aircraft_id     INT           NOT NULL COMMENT '飞机',
    install_pos     VARCHAR(50)   NULL     COMMENT '安装位置，如 左发动机/1号起落架',
    installed_at    DATETIME      NOT NULL COMMENT '安装时间',
    removed_at      DATETIME      NULL     COMMENT '拆卸时间，NULL=当前仍安装',
    install_reason  VARCHAR(200)  NULL     COMMENT '安装原因',
    remove_reason   VARCHAR(200)  NULL     COMMENT '拆卸原因',
    installed_by    INT           NULL     COMMENT '安装执行人',
    removed_by      INT           NULL     COMMENT '拆卸执行人',
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (record_id),
    CONSTRAINT fk_ir_component FOREIGN KEY (component_id)
        REFERENCES Component(component_id) ON UPDATE CASCADE,
    CONSTRAINT fk_ir_aircraft FOREIGN KEY (aircraft_id)
        REFERENCES Aircraft(aircraft_id) ON UPDATE CASCADE,
    CONSTRAINT fk_ir_installed_by FOREIGN KEY (installed_by)
        REFERENCES Operator(operator_id) ON UPDATE CASCADE,
    CONSTRAINT fk_ir_removed_by FOREIGN KEY (removed_by)
        REFERENCES Operator(operator_id) ON UPDATE CASCADE,
    -- 拆卸时间必须晚于安装时间
    CONSTRAINT chk_time_range CHECK (removed_at IS NULL OR removed_at > installed_at),
    -- 索引：加速查询某部件的历史安装
    INDEX idx_ir_component (component_id),
    INDEX idx_ir_aircraft  (aircraft_id)
) ENGINE=InnoDB COMMENT='安装记录表（历史保留，禁止覆盖）';

-- -------------------------------------------------------
-- 部分唯一索引：保证同一部件只能有一条"当前有效安装记录"
-- （removed_at IS NULL 表示仍在装机中）
-- MySQL 不直接支持部分唯一索引，用触发器实现（见后文）
-- -------------------------------------------------------


-- ============================================================
-- 表 6：MaintenanceRecord（维修记录表）
-- ============================================================
CREATE TABLE MaintenanceRecord (
    maint_id        INT           NOT NULL AUTO_INCREMENT,
    component_id    INT           NOT NULL COMMENT '被维修部件',
    -- 维修类型：routine=例行, repair=故障修复, overhaul=大修, inspection=检查
    maint_type      ENUM('routine','repair','overhaul','inspection')
                                  NOT NULL,
    start_time      DATETIME      NOT NULL COMMENT '送修时间',
    end_time        DATETIME      NULL     COMMENT '完成时间，NULL=维修中',
    -- 维修结论：pass=合格放行, conditional=有条件放行, failed=不可用/需报废
    result          ENUM('pass','conditional','failed') NULL,
    description     TEXT          NULL     COMMENT '维修描述',
    technician_id   INT           NULL     COMMENT '责任技术人员',
    approver_id     INT           NULL     COMMENT '审批人',
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (maint_id),
    CONSTRAINT fk_mr_component   FOREIGN KEY (component_id)
        REFERENCES Component(component_id) ON UPDATE CASCADE,
    CONSTRAINT fk_mr_technician  FOREIGN KEY (technician_id)
        REFERENCES Operator(operator_id) ON UPDATE CASCADE,
    CONSTRAINT fk_mr_approver    FOREIGN KEY (approver_id)
        REFERENCES Operator(operator_id) ON UPDATE CASCADE,
    -- 完成时间必须晚于送修时间
    CONSTRAINT chk_maint_time CHECK (end_time IS NULL OR end_time >= start_time),
    INDEX idx_mr_component (component_id)
) ENGINE=InnoDB COMMENT='维修记录表';


-- ============================================================
-- 表 7：FlightLog（飞行记录表）
-- ============================================================
CREATE TABLE FlightLog (
    flight_id       INT           NOT NULL AUTO_INCREMENT,
    aircraft_id     INT           NOT NULL COMMENT '执行飞行的飞机',
    flight_no       VARCHAR(30)   NULL     COMMENT '任务/航班编号',
    -- 任务类型：training=训练, mission=任务, test=测试, commercial=商业
    mission_type    ENUM('training','mission','test','commercial','other')
                                  NOT NULL DEFAULT 'other',
    departure_time  DATETIME      NOT NULL COMMENT '起飞时间',
    arrival_time    DATETIME      NOT NULL COMMENT '降落时间',
    flight_hours    DECIMAL(6,2)  NOT NULL COMMENT '本次飞行时长（小时）',
    departure_loc   VARCHAR(50)   NULL     COMMENT '出发地',
    arrival_loc     VARCHAR(50)   NULL     COMMENT '目的地',
    pilot_id        INT           NULL     COMMENT '机长（引用Operator）',
    notes           TEXT          NULL,
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (flight_id),
    CONSTRAINT fk_fl_aircraft FOREIGN KEY (aircraft_id)
        REFERENCES Aircraft(aircraft_id) ON UPDATE CASCADE,
    CONSTRAINT fk_fl_pilot    FOREIGN KEY (pilot_id)
        REFERENCES Operator(operator_id) ON UPDATE CASCADE,
    -- 降落时间必须晚于起飞时间
    CONSTRAINT chk_flight_time CHECK (arrival_time > departure_time),
    -- 飞行时长必须为正数
    CONSTRAINT chk_flight_hours CHECK (flight_hours > 0),
    INDEX idx_fl_aircraft    (aircraft_id),
    INDEX idx_fl_depart_time (departure_time)
) ENGINE=InnoDB COMMENT='飞行记录表';


-- ============================================================
-- 表 8：ScrapOrRetirementRecord（退役/报废记录表）
-- ============================================================
CREATE TABLE ScrapOrRetirementRecord (
    scrap_id        INT           NOT NULL AUTO_INCREMENT,
    component_id    INT           NOT NULL COMMENT '退役部件',
    -- 退役类型：retired=到寿退役, scrapped=损坏报废, admin=行政原因
    retire_type     ENUM('retired','scrapped','admin') NOT NULL,
    retire_time     DATETIME      NOT NULL COMMENT '退役时间',
    reason          TEXT          NOT NULL COMMENT '退役原因',
    approver_id     INT           NULL     COMMENT '审批人',
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (scrap_id),
    CONSTRAINT fk_sr_component FOREIGN KEY (component_id)
        REFERENCES Component(component_id) ON UPDATE CASCADE,
    CONSTRAINT fk_sr_approver  FOREIGN KEY (approver_id)
        REFERENCES Operator(operator_id) ON UPDATE CASCADE,
    INDEX idx_sr_component (component_id)
) ENGINE=InnoDB COMMENT='退役/报废记录表';


-- ============================================================
-- 恢复外键检查
-- ============================================================
SET FOREIGN_KEY_CHECKS = 1;


-- ============================================================
-- 触发器 1：安装前检查
-- 防止：①已退役部件安装  ②同一部件重复有效安装
-- ============================================================
DELIMITER $$

CREATE TRIGGER trg_before_install
BEFORE INSERT ON InstallationRecord
FOR EACH ROW
BEGIN
    DECLARE v_status VARCHAR(30);
    DECLARE v_active_count INT;

    -- 检查部件是否存在且状态合法
    SELECT status INTO v_status
    FROM Component
    WHERE component_id = NEW.component_id;

    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '错误：部件不存在';
    END IF;

    IF v_status IN ('retired', 'scrapped') THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '错误：退役或报废部件不能再次安装';
    END IF;

    -- 检查该部件是否已有未关闭的安装记录（确保同一时刻唯一性）
    SELECT COUNT(*) INTO v_active_count
    FROM InstallationRecord
    WHERE component_id = NEW.component_id
      AND removed_at IS NULL;

    IF v_active_count > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '错误：该部件当前已处于安装状态，请先执行拆卸';
    END IF;

    -- 检查飞机是否存在
    IF NOT EXISTS (SELECT 1 FROM Aircraft WHERE aircraft_id = NEW.aircraft_id) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '错误：指定飞机不存在';
    END IF;
END$$


-- ============================================================
-- 触发器 2：安装成功后更新部件状态为 installed
-- ============================================================
CREATE TRIGGER trg_after_install
AFTER INSERT ON InstallationRecord
FOR EACH ROW
BEGIN
    UPDATE Component
    SET status = 'installed', updated_at = CURRENT_TIMESTAMP
    WHERE component_id = NEW.component_id;
END$$


-- ============================================================
-- 触发器 3：拆卸前检查（更新安装记录前）
-- 防止：①对已关闭的安装记录重复关闭  ②拆卸时间早于安装时间
-- ============================================================
CREATE TRIGGER trg_before_removal
BEFORE UPDATE ON InstallationRecord
FOR EACH ROW
BEGIN
    -- 如果是给 removed_at 赋值（即执行拆卸）
    IF NEW.removed_at IS NOT NULL AND OLD.removed_at IS NOT NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '错误：该安装记录已关闭，不能重复拆卸';
    END IF;

    IF NEW.removed_at IS NOT NULL AND NEW.removed_at <= OLD.installed_at THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '错误：拆卸时间不能早于或等于安装时间';
    END IF;
END$$


-- ============================================================
-- 触发器 4：拆卸成功后更新部件状态为 available
-- ============================================================
CREATE TRIGGER trg_after_removal
AFTER UPDATE ON InstallationRecord
FOR EACH ROW
BEGIN
    -- 判断是执行了拆卸操作（removed_at 从 NULL 变为非 NULL）
    IF OLD.removed_at IS NULL AND NEW.removed_at IS NOT NULL THEN
        UPDATE Component
        SET status = 'available', updated_at = CURRENT_TIMESTAMP
        WHERE component_id = NEW.component_id;
    END IF;
END$$


-- ============================================================
-- 触发器 5：维修记录插入前检查
-- 防止：①对不存在的部件维修  ②退役/报废部件维修
-- ============================================================
CREATE TRIGGER trg_before_maintenance
BEFORE INSERT ON MaintenanceRecord
FOR EACH ROW
BEGIN
    DECLARE v_status VARCHAR(30);

    SELECT status INTO v_status
    FROM Component
    WHERE component_id = NEW.component_id;

    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '错误：部件不存在，无法创建维修记录';
    END IF;

    IF v_status IN ('retired', 'scrapped') THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '错误：退役或报废部件不能创建新的维修记录';
    END IF;
END$$


-- ============================================================
-- 触发器 6：维修完成后更新部件状态
-- 若结论为 failed，自动将部件置为 scrapped
-- ============================================================
CREATE TRIGGER trg_after_maintenance_update
AFTER UPDATE ON MaintenanceRecord
FOR EACH ROW
BEGIN
    -- 维修结束（end_time 从 NULL 变为非 NULL）
    IF OLD.end_time IS NULL AND NEW.end_time IS NOT NULL THEN
        IF NEW.result = 'failed' THEN
            UPDATE Component
            SET status = 'scrapped', updated_at = CURRENT_TIMESTAMP
            WHERE component_id = NEW.component_id;
        ELSEIF NEW.result IN ('pass', 'conditional') THEN
            -- 恢复为可用（若当前不是 installed）
            UPDATE Component
            SET status = IF(status = 'installed', 'installed', 'available'),
                updated_at = CURRENT_TIMESTAMP
            WHERE component_id = NEW.component_id;
        END IF;
    END IF;
END$$


-- ============================================================
-- 触发器 7：退役记录插入前检查
-- 防止：①对已退役部件重复退役  ②对仍在安装的部件直接退役
-- ============================================================
CREATE TRIGGER trg_before_retire
BEFORE INSERT ON ScrapOrRetirementRecord
FOR EACH ROW
BEGIN
    DECLARE v_status VARCHAR(30);
    DECLARE v_active_install INT;

    SELECT status INTO v_status
    FROM Component
    WHERE component_id = NEW.component_id;

    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '错误：部件不存在，无法退役';
    END IF;

    IF v_status IN ('retired', 'scrapped') THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '错误：该部件已处于退役或报废状态，不可重复操作';
    END IF;

    -- 检查是否仍在安装状态
    SELECT COUNT(*) INTO v_active_install
    FROM InstallationRecord
    WHERE component_id = NEW.component_id AND removed_at IS NULL;

    IF v_active_install > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '错误：部件当前仍处于安装状态，请先拆卸后再退役';
    END IF;
END$$


-- ============================================================
-- 触发器 8：退役记录插入后更新部件状态
-- ============================================================
CREATE TRIGGER trg_after_retire
AFTER INSERT ON ScrapOrRetirementRecord
FOR EACH ROW
BEGIN
    UPDATE Component
    SET status     = NEW.retire_type,  -- 'retired' 或 'scrapped'
        updated_at = CURRENT_TIMESTAMP
    WHERE component_id = NEW.component_id;
END$$


-- ============================================================
-- 触发器 9：防止物理删除 Component 核心数据
-- ============================================================
CREATE TRIGGER trg_prevent_delete_component
BEFORE DELETE ON Component
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = '错误：禁止物理删除部件数据，请使用退役/报废流程';
END$$


-- ============================================================
-- 触发器 10：防止物理删除 InstallationRecord 历史数据
-- ============================================================
CREATE TRIGGER trg_prevent_delete_install_record
BEFORE DELETE ON InstallationRecord
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = '错误：禁止物理删除安装记录，历史数据必须保留';
END$$


DELIMITER ;


-- ============================================================
-- 视图 1：v_active_installations（当前有效安装状态）
-- ============================================================
CREATE VIEW v_active_installations AS
SELECT
    ir.record_id,
    c.serial_no         AS component_serial,
    cm.model_code       AS component_model,
    cm.category,
    a.registration_no   AS aircraft_reg,
    a.model             AS aircraft_model,
    ir.install_pos,
    ir.installed_at,
    o.name              AS installed_by_name
FROM InstallationRecord ir
JOIN Component       c  ON ir.component_id = c.component_id
JOIN ComponentModel  cm ON c.model_id      = cm.model_id
JOIN Aircraft        a  ON ir.aircraft_id  = a.aircraft_id
LEFT JOIN Operator   o  ON ir.installed_by = o.operator_id
WHERE ir.removed_at IS NULL;


-- ============================================================
-- 视图 2：v_component_lifecycle（部件生命周期总览）
-- ============================================================
CREATE VIEW v_component_lifecycle AS
SELECT
    c.component_id,
    c.serial_no,
    cm.model_code,
    cm.category,
    c.batch_no,
    c.inbound_date,
    c.status              AS current_status,
    c.accumulated_hours,
    -- 安装次数
    (SELECT COUNT(*) FROM InstallationRecord ir
     WHERE ir.component_id = c.component_id)                         AS install_count,
    -- 维修次数
    (SELECT COUNT(*) FROM MaintenanceRecord mr
     WHERE mr.component_id = c.component_id)                         AS maint_count,
    -- 最近一次安装时间
    (SELECT MAX(ir2.installed_at) FROM InstallationRecord ir2
     WHERE ir2.component_id = c.component_id)                        AS last_installed_at,
    -- 是否当前在装
    (SELECT COUNT(*) FROM InstallationRecord ir3
     WHERE ir3.component_id = c.component_id
       AND ir3.removed_at IS NULL)                                    AS is_currently_installed,
    -- 退役时间
    (SELECT sr.retire_time FROM ScrapOrRetirementRecord sr
     WHERE sr.component_id = c.component_id
     ORDER BY sr.retire_time DESC LIMIT 1)                           AS retire_time
FROM Component c
JOIN ComponentModel cm ON c.model_id = cm.model_id;


-- ============================================================
-- 视图 3：v_flight_component_usage（飞行与部件关联视图）
-- 将飞行记录与当时处于安装状态的部件关联
-- ============================================================
CREATE VIEW v_flight_component_usage AS
SELECT
    fl.flight_id,
    fl.flight_no,
    fl.mission_type,
    fl.departure_time,
    fl.arrival_time,
    fl.flight_hours,
    a.registration_no   AS aircraft_reg,
    c.serial_no         AS component_serial,
    cm.model_code,
    cm.category,
    ir.install_pos
FROM FlightLog fl
JOIN Aircraft          a   ON fl.aircraft_id   = a.aircraft_id
JOIN InstallationRecord ir  ON ir.aircraft_id  = a.aircraft_id
                           AND ir.installed_at <= fl.departure_time
                           AND (ir.removed_at IS NULL OR ir.removed_at >= fl.arrival_time)
JOIN Component         c   ON ir.component_id  = c.component_id
JOIN ComponentModel    cm  ON c.model_id       = cm.model_id;


-- ============================================================

SELECT '数据库结构初始化完成。' AS 提示;

-- 增加trigger并手动修改原有的一些数据
USE aviation_mngt;

DROP TRIGGER IF EXISTS trg_after_maintenance_insert;

DELIMITER $$
CREATE TRIGGER trg_after_maintenance_insert
AFTER INSERT ON MaintenanceRecord
FOR EACH ROW
BEGIN
    UPDATE Component
    SET status = 'under_maintenance', updated_at = CURRENT_TIMESTAMP
    WHERE component_id = NEW.component_id
      AND status NOT IN ('retired', 'scrapped');
END$$
DELIMITER ;


UPDATE Component c
JOIN MaintenanceRecord m ON c.component_id = m.component_id
SET c.status = 'under_maintenance'
WHERE m.end_time IS NULL
  AND c.status NOT IN ('retired', 'scrapped');
