-- ============================================================
-- 初始化测试数据
-- 在 DBeaver 中对 aviation_mgmt 数据库执行
-- ============================================================

USE aviation_mngt;

-- ============================================================
-- 人员
-- ============================================================
INSERT INTO Operator (name, role, employee_no, phone) VALUES
('张伟', 'installer',  'EMP001', '13800001111'),
('李明', 'technician', 'EMP002', '13800002222'),
('王芳', 'supervisor', 'EMP003', '13800003333'),
('赵磊', 'admin',      'EMP004', '13800004444'),
('陈刚', 'installer',  'EMP005', '13800005555');

-- ============================================================
-- 飞机
-- ============================================================
INSERT INTO Aircraft (registration_no, model, status, commissioned_date) VALUES
('B-8001', 'ARJ21-700', 'active',       '2020-03-15'),
('B-8002', 'C919',      'active',       '2022-06-01'),
('B-8003', 'ARJ21-700', 'maintenance',  '2019-11-20');

-- ============================================================
-- 部件型号
-- ============================================================
INSERT INTO ComponentModel (model_code, category, design_life_hours, maintenance_interval_hours, applicable_aircraft, manufacturer) VALUES
('CF34-10A',   '发动机',   30000.00, 3000.00, 'ARJ21-700',       'GE Aviation'),
('LEAP-1C',    '发动机',   35000.00, 3500.00, 'C919',            'CFM International'),
('MLG-ARJ-01', '起落架',   50000.00, 5000.00, 'ARJ21-700',       '中国航空工业集团'),
('ADIRU-001',  '传感器',   20000.00, 2000.00, 'ARJ21-700,C919',  'Honeywell'),
('APU-131-9A', '辅助动力', 25000.00, 2500.00, 'ARJ21-700,C919',  'Honeywell');

-- ============================================================
-- 部件实例（入库）
-- ============================================================
INSERT INTO Component (serial_no, model_id, batch_no, manufacture_date, inbound_date, status, accumulated_hours) VALUES
('SN-ENG-0001', 1, 'BATCH-2020-A', '2020-01-10', '2020-02-01', 'available', 1250.50),
('SN-ENG-0002', 1, 'BATCH-2020-A', '2020-01-10', '2020-02-01', 'available', 0.00),
('SN-ENG-0003', 2, 'BATCH-2022-B', '2022-04-01', '2022-05-01', 'available', 430.00),
('SN-MLG-0001', 3, 'BATCH-2019-C', '2019-09-01', '2019-10-01', 'available', 3200.00),
('SN-MLG-0002', 3, 'BATCH-2021-C', '2021-03-01', '2021-04-01', 'available', 0.00),
('SN-ADI-0001', 4, 'BATCH-2021-D', '2021-06-01', '2021-07-01', 'available', 980.00),
('SN-ADI-0002', 4, 'BATCH-2022-D', '2022-01-01', '2022-02-01', 'available', 0.00),
('SN-APU-0001', 5, 'BATCH-2020-E', '2020-03-01', '2020-03-20', 'available', 2100.00),
('SN-ENG-0004', 2, 'BATCH-2023-B', '2023-01-01', '2023-02-01', 'available', 0.00),
('SN-MLG-0003', 3, 'BATCH-2022-C', '2022-06-01', '2022-07-01', 'available', 0.00);

-- ============================================================
-- 安装记录（触发器会自动把部件状态改为 installed）
-- ============================================================

-- B-8001：安装发动机、起落架、传感器
INSERT INTO InstallationRecord (component_id, aircraft_id, install_pos, installed_at, install_reason, installed_by)
VALUES (1, 1, '左发动机位', '2020-03-15 08:00:00', '新机出厂装配', 1);

INSERT INTO InstallationRecord (component_id, aircraft_id, install_pos, installed_at, install_reason, installed_by)
VALUES (4, 1, '主起落架', '2020-03-15 08:30:00', '新机出厂装配', 1);

INSERT INTO InstallationRecord (component_id, aircraft_id, install_pos, installed_at, install_reason, installed_by)
VALUES (6, 1, '前传感器组', '2020-03-15 09:00:00', '新机出厂装配', 1);

-- B-8002：安装发动机、辅助动力
INSERT INTO InstallationRecord (component_id, aircraft_id, install_pos, installed_at, install_reason, installed_by)
VALUES (3, 2, '左发动机位', '2022-06-01 10:00:00', '新机出厂装配', 5);

INSERT INTO InstallationRecord (component_id, aircraft_id, install_pos, installed_at, install_reason, installed_by)
VALUES (8, 2, 'APU舱', '2022-06-01 10:30:00', '新机出厂装配', 5);

-- B-8003：安装传感器（该机在维修状态）
INSERT INTO InstallationRecord (component_id, aircraft_id, install_pos, installed_at, install_reason, installed_by)
VALUES (7, 3, '前传感器组', '2021-04-01 09:00:00', '定期装配', 1);

-- ============================================================
-- 历史拆卸记录（SN-ENG-0001 曾经被拆下送修）
-- 先关闭旧安装记录
-- ============================================================
UPDATE InstallationRecord
SET removed_at    = '2024-06-01 10:00:00',
    remove_reason = '到寿更换',
    removed_by    = 2
WHERE component_id = 1
  AND removed_at IS NULL;

-- 装上新发动机
INSERT INTO InstallationRecord (component_id, aircraft_id, install_pos, installed_at, install_reason, installed_by)
VALUES (2, 1, '左发动机位', '2024-06-01 11:00:00', '定期更换', 1);

-- ============================================================
-- 维修记录
-- ============================================================

-- SN-ENG-0001 大修（已完成）
INSERT INTO MaintenanceRecord (component_id, maint_type, start_time, end_time, result, description, technician_id, approver_id)
VALUES (1, 'overhaul', '2024-06-02 08:00:00', '2024-06-20 17:00:00', 'pass',
        '发动机大修，更换高压涡轮叶片，检测合格放行', 2, 3);

-- SN-MLG-0001 例行检查（已完成）
INSERT INTO MaintenanceRecord (component_id, maint_type, start_time, end_time, result, description, technician_id, approver_id)
VALUES (4, 'routine', '2023-09-01 08:00:00', '2023-09-03 17:00:00', 'pass',
        '主起落架例行检查，结构完好', 2, 3);

-- SN-ADI-0001 故障修复（已完成，有条件放行）
INSERT INTO MaintenanceRecord (component_id, maint_type, start_time, end_time, result, description, technician_id, approver_id)
VALUES (6, 'repair', '2023-12-10 08:00:00', '2023-12-15 17:00:00', 'conditional',
        '传感器信号漂移，校准后有条件放行，需60天内复查', 2, 3);

-- SN-APU-0001 大修（进行中）
INSERT INTO MaintenanceRecord (component_id, maint_type, start_time, description, technician_id)
VALUES (8, 'overhaul', '2025-01-10 08:00:00', 'APU大修，检查燃烧室及附件', 2);

-- SN-ENG-0003 例行检查（已完成）
INSERT INTO MaintenanceRecord (component_id, maint_type, start_time, end_time, result, description, technician_id, approver_id)
VALUES (3, 'inspection', '2023-06-01 08:00:00', '2023-06-02 17:00:00', 'pass',
        '发动机孔探检查，叶片状态良好', 2, 3);

-- ============================================================
-- 飞行记录
-- ============================================================
INSERT INTO FlightLog (aircraft_id, flight_no, mission_type, departure_time, arrival_time, flight_hours, departure_loc, arrival_loc, pilot_id) VALUES
(1, 'ARJ-2024-001', 'commercial', '2024-01-10 08:00:00', '2024-01-10 09:30:00', 1.50, '上海浦东', '北京首都',  3),
(1, 'ARJ-2024-002', 'commercial', '2024-01-15 14:00:00', '2024-01-15 15:45:00', 1.75, '北京首都', '上海浦东',  3),
(1, 'ARJ-2024-003', 'commercial', '2024-02-20 09:00:00', '2024-02-20 10:30:00', 1.50, '上海浦东', '广州白云',  3),
(1, 'ARJ-2024-004', 'training',   '2024-03-05 07:00:00', '2024-03-05 09:00:00', 2.00, '上海浦东', '上海浦东',  3),
(1, 'ARJ-2024-005', 'commercial', '2024-04-12 11:00:00', '2024-04-12 12:45:00', 1.75, '上海浦东', '成都双流',  3),
(2, 'C919-2024-001','commercial', '2024-02-01 09:00:00', '2024-02-01 11:00:00', 2.00, '上海浦东', '广州白云',  3),
(2, 'C919-2024-002','commercial', '2024-03-18 13:00:00', '2024-03-18 15:30:00', 2.50, '广州白云', '北京首都',  3),
(2, 'C919-2024-003','test',       '2024-04-01 06:00:00', '2024-04-01 09:00:00', 3.00, '上海浦东', '上海浦东',  3),
(3, 'B8003-2021-01','training',   '2021-05-10 08:00:00', '2021-05-10 10:00:00', 2.00, '上海浦东', '上海浦东',  3);

-- ============================================================
-- 退役记录（SN-ADI-0001 超寿退役）
-- 先确认它已被拆卸（当前状态 available），再退役
-- ============================================================
INSERT INTO ScrapOrRetirementRecord (component_id, retire_type, retire_time, reason, approver_id)
VALUES (6, 'retired', '2024-09-01 09:00:00',
        '传感器累计使用超出设计寿命上限，按适航规定执行退役处理', 3);

-- ============================================================
-- 完成
-- ============================================================
SELECT '测试数据初始化完成' AS 结果;
SELECT status, COUNT(*) AS 数量 FROM Component GROUP BY status;