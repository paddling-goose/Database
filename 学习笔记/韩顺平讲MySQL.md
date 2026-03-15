---
title: 韩顺平讲MySQL
tags:
  - 数据库
  - MySQL
source: https://www.runoob.com/mysql/mysql-tutorial.html
---

[MySQL教程](https://www.runoob.com/mysql/mysql-tutorial.html)
# 1. 环境配置

- 用custom自定义安装
- 链接到mysql的指令`mysql -h 主机ip -P 端口 -u 用户名 -p 密码`
	- 主机默认本机，端口默认3306

# 2. 基础概念

## 元数据

### 定义及查询

- MySQL 元数据是关于数据库和其对象（如表、列、索引等）的信息
```mysql
SHOW DATABASES;
USE db_name;
show tables; -- show all tables in db
DESC table_name -- show structure
show index from table_name;
select count(*) from table_name;
```

###  information_schema 数据库

- information_schema 是 MySQL 数据库中的一个系统数据库，它包含有关数据库服务器的元数据信息，这些信息以表的形式存储在 information_schema 数据库中
- 包括：
	- `SCHEMATA`表——存储有关数据库的信息，如数据库名、字符集、排序规则等
	- `TABLES`表——包含有关数据库中所有表的信息，如表名、数据库名、引擎、行数等
	- `COLUMNS`表——包含有关表中列的信息，如列名、数据类型、是否允许 NULL 等
	- `STATISTIC`表——提供有关表索引的统计信息，如索引名、列名、唯一性等
	-  `KEY_COLUMN_USAGE`表——包含有关表中外键的信息，如外键名、列名、关联表
	- `REFERENTIAL_CONSTRAINTS` 表——存储有关外键约束的信息，如约束名、关联表

## SQL语句分类

- DDL: 数据定义语句 【create, drop, alter】
- DML: 数据操作语句 【insert，delete，update】
- DQL: 数据查询语句 【select】
- DCL: 数据控制语句 【管理数据库：用户权限 grant, revoke】

```java

// 加载类，得到mysql链接
Class.forName("com.mysql.jdbc.Driver");
Connection connection = DriverManager.getConnection("jdbc:mysql://localhost:3306/db01", "root");

// 编写sql 【create, select, insert, update, delete...】
String sql_0 = "create table goods(id int, name varchar(32), price double,introduce text)";

String sql_1 = "insert into goods(1,"apple",10,"苹果")";

String sql_2 = "drop table goods";

// 得到statement对象，发送给mysql执行
Statement statement = connection。createStatement();
statement.executeUpdate(sql);

// 关闭连接
statement.close();
connection.close();
```

## 数据类型

尽量选小
比较常见的：
- 数值
	- int
	- float，double
	- `decimal[M,D]`:M——位数的总数，精度  D——小数点后面的位数；D默认0，没有小数点；M默认10。D<=30, M<=65
- 文本
	- char(255字符)，varchar（65535字节）
		- char(4), varchar(4) 表示的都是字节;
		- 如果编码是 utf8 size(varchar) = (65535-3)/3 =21844
		- 如果编码是 gbk size(varchar) = (65535-3)/2 = 32766
		-  第1~3个字节用于记录大小——varchar会根据实际内容分配大小
		- 查询速度char>varchar
		- varchar不够用——使用mediumtext或longtext或text
	- text
- 二进制
- 日期时间
	- date
	- time
	- datetime
	- timestamp

```mysql
# DECIMAL可以存放很大的数(65)

CREATE TABLE t06(
	num1 FLOAT,
	num2 DECIMAL(30,20));
	num3 DECIMAL (65);
INSERT INTO t06 VALUES(88.123455677);
INSERT INTO t06 VALUES(65);
```

```mysql
# 自动更新时间：

CREATE TABLE users ( 
	id INT PRIMARY KEY AUTO_INCREMENT, 
	username VARCHAR(50),
	-- 记录创建时间：只在插入时设置 
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
	-- 记录最后修改时间：插入和更新时都会自动变化 
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP );

```
## 表的限制/约束

==约束管的是：数据能否写入==

### 键

- 通常，表不能插入完全相同的两项，这是通过人工设置键来实现的。==键字段所对应的值只能唯一==，如，学生ID作为键值
- 键的类型有两种：
	- 主键（Primary Key）：主键字段的值在整个表中必须是唯一的，且不能为空。一个表只能有一个主键，但可以是复合主键
	- 唯一键（Unique Key）：唯一键字段的值也必须是唯一的，但不同于主键，唯一键允许字段值为 `NULL`，且一个表可以有多个唯一键
```mysql
# 方法一：直接写
create table t17(
	id int primary key,
	'name' varchar(32)
);

# 方法二：附在后面
## 联合主键只能使用这个方式
create table t17(
	id int,
	'name' varchar(32),
	primary key (order_id, item_id)
);

# 方法三：表创建后添加
## 在添加主键前，必须确保该列中没有任何重复值，且所有值都不为 `NULL`
ALTER TABLE users 
ADD PRIMARY KEY (id);

# 🟢最佳实践：自增
CREATE TABLE students (
    id INT AUTO_INCREMENT, -- 自动增长，从 1 开始
    name VARCHAR(20),
    PRIMARY KEY (id)
);
```
## unique

```mysql
id int unique  -- 表示不可重复

-- 如果没有指定not null，可以null重复
id int unique not null
```

### 辨析unique和键

- **主键**通常是**聚簇索引**：这意味着表中的数据在磁盘上的物理存储顺序，就是按主键顺序排的。查主键就像在字典里按拼音查字，直接就能翻到那一页。
    
- **Unique** 是**辅助索引（Secondary Index）**：它更像书最后的“索引页”。你先在索引页找到“手机号”，它告诉你这一行数据在主键 ID 的哪个位置，你需要再跳一次才能找到完整数据（这个过程叫“回表”）。

## 外键

- foreign key
- 注意事项
	- 外键指向的表的字段必须为 `primary key`或 `unique`
	- 表的类型必须为`innodb`才能支持外键
	- 字段类型一致，长度可以不同
	- 外键的值必须在主键字段中存在过或者为null
- 可以通过 `ON DELETE CASCADE` 或 `ON DELETE SET NULL` 来控制删除主表记录时副表怎么处理，比如班级删了，学生记录是跟着删掉还是把 `class_id` 设为 NULL

```mysql
# 主表: 班级表
CREATE TABLE class(
	id INT PRIMARY KEY -- 必须是主键，才能被引用
);
# 副表:学生表
CREATE table student(
	class_id int ,
	id int PRIMARY KEY,
	name varchar(50),
	FOREIGN KEY (class_id) REFERENCES class(id) -- 外键约束
);

# student.class_id 必须在class.id 中存在才能写入
```

## check

- 强制行数据必须满足的条件
```mysql
CREATE TABLE T(
	id int primary key,
	name varchar(50),
	gender varchar(6) check (sex in('male','female')),
	sal double check (sal> 1000 and sal <2000)
);

```

# 3. 常见指令

## 书写顺序和执行顺序

```mysql
-- 书写顺序 --
SELECT dept_name, AVG(salary) AS avg_salary  -- 5. 选择列
FROM instructor                             -- 1. 从表
WHERE salary > 0                            -- 2. 筛选
GROUP BY dept_name                          -- 3. 分组
HAVING AVG(salary) > 50000                  -- 4. 筛选分组
ORDER BY avg_salary DESC;                   -- 6. 排序
```

执行顺序：
1. **`FROM`**：确定要查询的表
2. **`WHERE`**：对表中的行进行筛选
3. **`GROUP BY`**：对筛选后的行进行分组
4. **`HAVING`**：对分组后的结果进行筛选
5. **`SELECT`**：选择要返回的列，并进行计算
6. **`ORDER BY`**：对最终结果排序

## 数据库层面

```MYSQL
 
# 创建一个使用utf8字符集的数据库db，斌带有校对规则
# 在创建数据库时，可以用``规避关键字，如`CREATE`
# bin ——区分大小写，默认utf8_general_ci ——不区分
CREATE DATABASE DB CHARACTER SET utf8 COLLATE utf8_bin

# 删除数据库
DROP DATABASE DB

# 查询：*表示所有字段
SELECT * 
	FROM t1 
	WHERE NAME = 'tom'
	
# 显示所有数据库
SHOW DATABASES
# 显示数据库创建语句
SHOW CREATE DATABASE db_name
DROP DATABASE [IF EXISTS] db_name
```   

```mysql
# 备份数据库(在DOS执行)
# 实际上就是生成对应的sql语句，用于后续重构出数据库
mysqldump -u user_name -p -B db_0 db_1 > bak.sql

# 恢复数据库(在SQLyog执行) 
# 或者粘贴备份文件的内容执行
Source bak.sql

# 备份表
mysqldump -u user_name -p db_0 table_0 table_1 > bak.sql
```
## 表层面

### 创建表

```mysql
 CREATE TABLE table_name
 (
	 field1 datatype,
	 field2 datatype
 )CHARACTER SET 字符集 COLLATE 校对规则 ENGINE 引擎(默认innoDB)
```

```mysql
CREATE TABLE `user`(
	id INT,
	ID TINYINT UNSIGNED,
	`name` VARCHAR(255),
	`pin` VARCHAR(255)
	)CHARACTER SET utf8 COLLATE utf8_bin ENGINE INNODB;
```

### 修改表 ALERT TABLE

```mysql
# 1. 添加列 == 修改字段
ALTER TABLE employees
ADD COLUMN birth_date DATE;

# 2. 修改列的数据类型
ALTER TABLE `table_name`
MODIFY COLUMN `column_name` new_datatype;
MODIFY COLUMN salary DECIMAL(10,2);

# 3. 修改列名
ALTER TABLE `table_name`
CHANGE COLUMN `old_column_name` `new_column_name` datatype(必填);

change column address addr varchar(100);

# 4. 删除列
ALTER TABLE employees
DROP COLUMN birth_date;

# 5.添加PRIMARY KEY
ALTER TABLE employees
ADD PRIMARY KEY (column_name);

# 6. 添加 FOREIGN KEY
ALTER TABLE orders
ADD CONSTRAINT fk_name
FOREIGN KEY (column_name)
REFERENCES parent_table (column_name);

# 7.修改表名
ALTER TABLE old_table_name
RENAME TO new_table_name;
```
### 临时表

- 临时表只在当前连接可见，当关闭连接时，MySQL 会自动删除表并释放所有空间
```mysql
# 独特之处在于创建，其他与普通表类似；
# 可以drop，但没必要
CREATE TEMPORARY TABLE temp_table AS
SELECT...

```

### 复制表

#### 自我复制/蠕虫复制

```mysql
# 蠕虫复制
-- 将表自己的数据再次插入自身
INSERT INTO 表名 
SELECT * FROM 同一表名;

-- 或者指定列（避免自增主键冲突）
INSERT INTO 表名 (非自增主键的列1, 列2, 列3)
SELECT 非自增主键的列1, 列2, 列3 
FROM 同一表名;

# 清理：
-- 预先设置事务，可回滚
START TRANSACTION;
-- 执行蠕虫复制...
-- 确认无误后
COMMIT;
-- 或回滚
ROLLBACK;

-- 或使用临时表
CREATE TEMPORARY TABLE temp_data AS SELECT * FROM source LIMIT 100;
-- 对临时表进行复制测试

```

主要用途：
1. 快速生成测试数据
    - 从少量基础数据开始，通过几次复制就能得到大量测试数据
    - 适用于性能测试、压力测试场景
2. 数据模式验证
    - 测试表结构是否支持大量数据
    - 验证索引、约束在大数据量下的表现
3. 数据迁移测试
    - 用小表生成大表，测试迁移工具的性能
#### 复制新表

- 方法1：
```mysql
# 1. 通过show语句得到创建时代码
SHOW CREATE TABLE table_0

# 2. 复制代码，修改表名为table_1

# 3. 使用insert快速填充内容
insert into table_1(col1, col2,...)
select col1, col2,...
from table_0

## 如果 `table_0` 数据量非常大，此 `INSERT ... SELECT` 操作可能会耗费较长时间并锁定表，请在业务低峰期进行。

```

- 方法2：
```shell
# 用于备份和还原 MySQL 数据库
mysqldump -u username -p dbname old_table > old_table_dump.sql
mysql -u username -p new_dbname < old_table_dump.sql
```

- 性能与适用场景总结

| 特性         | `INSERT ... SELECT                                 | `mysqldump`                                                         |
| ---------- | -------------------------------------------------- | ------------------------------------------------------------------- |
| **操作本质**   | 数据库内部单条 SQL                                        | 两个独立过程：导出为 SQL 文件，再导入执行该文件                                          |
| **资源占用**   | **集中且持续**。一次性占用大量内存和 CPU，直到语句完成                    | **阶段性**。导出消耗读资源；导入消耗写和 CPU 资源，但可分步优化                                |
| **可控性与容错** | 较差。执行中出错较难中途恢复。                                    | **更强**。导出文件即备份。导入可中断、重试、拆分或调整参数。                                    |
| **网络传输**   | 无（同库操作）或较少（跨库同实例）                                  | 导出文件需要存储和传输，可能成为额外开销，但也便于迁移到不同服务器                                   |
| **最佳适用场景** | 同实例下的**单表或简单关联查询**的数据复制，数据量**不是特别巨大**且业务可接受短时锁定的情况 | **全库或大量表迁移/备份**、跨服务器数据迁移、需要保留完整逻辑结构（视图、存储过程等）、或**数据量极大**需要分步谨慎处理的场景 |

## 数据层面

### 增 INSERT
```mysql
# 插入多行数据
INSERT INTO users (username, email, birthdate, is_active)
VALUES
    ('test1', 'test1@runoob.com', '1985-07-10', true),
    ('test2', 'test2@runoob.com', '1988-11-25', false),
    ('test3', 'test3@runoob.com', '1993-05-03', true);
```
1. 插入数据类型与字段一致，并且长度在范围内
2.  列允许插入为空的前提：允许为空（NULL）或有自动填充（DEFAULT）
### 删 DELETE
```mysql
# 删除数据

-- 简单删除
DELETE FROM 表名 
WHERE id = 1;

-- 删除所有状态为 'inactive' 的用户
DELETE FROM users 
WHERE status = 'inactive';

-- 删除 ID 在 10 到 20 之间的所有记录
DELETE FROM logs 
WHERE id BETWEEN 10 AND 20;

-- 删除创建时间早于 2023 年的数据
DELETE FROM orders 
WHERE created_at < '2023-01-01';

-- 只想删除符合条件的前 10 条数据（例如清理过期日志）
DELETE FROM logs 
WHERE level = 'debug' LIMIT 10;

-- 删除表里的**所有**数据，并重置自增 ID
TRUNCATE TABLE 表名;
```

不能删除某一列的值，只能用 UPDATE 置空
### 查 SELECT
```mysql
# 基本格式
SELECT column1, column2, ...
FROM table_name
[WHERE condition]
[ORDER BY column_name [ASC | DESC]]  -- 默认升序
[LIMIT number];  -- 限制返回的行数

# 去重：每个字段都相同才会去重
SELECT DISTINCT * FROM ...;

# 别名
SELECT column_0 AS nick_name 

# 统计行数
# count(*):返回所有的行数
# count(列名)：排除指定列中为NULL的情况;只接受一个列
SELECT COUNT(*) FROM ...
SELECT COUNT(column_0) FROM ...

# 统计综合
SELECT SUM(column_0) FROM ...

# 求平均
AVG()

# 求最值
MAX(); MIN()
```

```mysql
select name as '名字', 
	(chinese+english+math) as tot_score
from student;
order by asc name, id desc  -- 依次排序
```
[[MySQL查询增强]]
### 改 UPDATE
```MYSQL
UPDATE table_name
SET column1 = value1, column2 = value2, ...
WHERE condition;

-- EXAMPLE
UPDATE employees
SET salary = 60000
WHERE employee_id = 101;
```

### WHERE
```mysql

# where
# 可以比较大小
# 条件AND, OR, LIKE, IN, NOT(一般不用，使用！=), BETWEEN, IS NULL, IS NOT ,NULL

-- 模糊匹配条件
SELECT * 
FROM customers 
WHERE first_name LIKE 'J%';

-- IN:在in列表中的值
SELECT * 
FROM countries 
WHERE country_code IN ('US', 'CA', 'MX');

-- IS NULL
SELECT * 
FROM employees 
WHERE department IS NULL;
```

### LIKE
```mysql

# 百分号通配符 %
# %表示零个或多个字符
SELECT * 
FROM customers 
WHERE last_name LIKE 'S%'; -- 所有S开头的客户

# 下划线通配符 _
# _通配符表示一个字符
SELECT * 
FROM products
WHERE product_name LIKE '_a%' ;  -- 第二个字母是a

# _和% 可以组合使用

# 不区分大小写的匹配
SELECT * 
FROM employees 
WHERE last_name LIKE 'smi%' 
COLLATE utf8mb4_general_ci;  -- 加入这一句
```

### UNION
```mysql
# 连接两个以上的 SELECT 语句的结果组合到一个结果集合，并去重
# 每个 SELECT 语句的列数和对应位置的数据类型必须相同。

```

### GROUP+HAVING
```MYSQL
SELECT dept_name, avg(salary) AS avg_salary
FROM instructor
GROUP BY dept_name
having avg(salary)>80000;
```

### AUTO_INCREMENT

- 注意点
	- 只能用于整数类型，且必须是键
	- 删除记录后，编号不会"回收"，删去3，下次起始是4
	- 在插入时可以手动指定值
```MYSQL
CREATE TABLE student (
    id    INT   PRIMARY KEY AUTO_INCREMENT,
    name  VARCHAR(50)  NOT NULL
) auto_increment = 1000 #可指定;

ALTER TABLE student AUTO_INCREMENT = 1000; # 建表后修改
```

```mysql
-- 现有数据 id: 1, 2, 4, 5（3是空洞） 
INSERT INTO student(id, name) VALUES(3, '填空洞'); 
INSERT INTO student(name) VALUES('自动分配'); 
-- 自动分配的 id 是 6，不是 7 
-- 因为当前最大值是 5，从 5+1 继续
```
# 4. 函数

[菜鸟教程-MySQL函数](大二下/数据库/MySQL函数)

## 数学类
```mysql
ABS()
BIN()/HEX()
CONV(number,from_base,to_base) -- 进制转化, 进制填数字
CELLING()/FLOOR()
FORMAT(number,decimal_places)  -- 格式化小数位数
LEAST(num1, num2,...) -- 求最小值
MOD(numerator, denominator) -- 求余 MOD(10,3) = 1
RAND([SEED])  -- 随机数，范围 0<= x<= 1.0
			-- 每次调用都明确指定相同的SEED，那么每次都会返回相同的随机数值
```
### MIN() VS LEAST()

|          | LEAST()                                   | MIN()                            |
| -------- | ----------------------------------------- | -------------------------------- |
| **操作范围** | 行内                                        | 跨行                               |
| 搭配       | 与分组无关，处理的是分组后或单行内的数据                      | 常与`GROUP BY`搭配                   |
| 性能       | 只涉及单行计算，通常非常快                             | 作为聚合函数，可能需要扫描多行数据，在无索引的大表上性能开销更大 |
| 灵活性      | 1. 参数可以是完全不同的表达式，甚至可以比较字符串或日期<br>2. 参数>=2 | 通常作用在单一的数据列上                     |
*一句话总结：`LEAST()` 帮你在一堆选项里挑最小的（横向比），`MIN()` 帮你在一列数据里找最小的（纵向找）*

## 日期类
```mysql
CURDATE() -- 返回YYYY-MM-DD或YYYYMMDD
CURTIME() -- 返回HH:MM:SS
CURRENT_TIMESTAMP() or NOW() -- 返回YYYY-MM-DD HH:MM:SS

DATEDIFF() -- 返回日期差（天)
TIMEDIFF()
DATE_ADD() or DATE_SUB()  -- 得到任意单位；可以为负
-- SELECT * 
-- FROM TV 
-- WHERE send_time >= DATE_SUB(NOW(), INTERVAL 10 MINITE)
-- INTERVAL 这东西也很好用

DATE()  -- 返回日期部分
DAY() OR MONTH() OR YEAR()

FROM_UNIXTIME()
UNIX_TIMESTAMP()
-- 从 1970年1月1日00:00:00 UTC（协调世界时）开始
-- 1. 存储时优先使用 UNIX_TIMESTAMP() 存储为整数，节省空间且避免时区混淆
-- 2. 使用时用 FROM_UNIXTIME() 转换为人类可读格式

SELECT FROM_UNIXTIME(1618483484, '%y-%-m%-d') FROM...

```
## 加密函数
```mysql
USER() -- 获取连接用户信息
DATABASE() -- 获取当前数据库
SHA2(str,256) -- 生成哈希值

-- 推荐做法（安全）
CREATE TABLE users_secure (
    password_hash CHAR(64),  -- 加盐SHA-256
    salt CHAR(36)
);

```
## 流程控制函数

```mysql
IF(expr1, expr2, expr3) -- 等效于？：

IFNULL(expr1, expr2)  -- 若expr1不为null则返回expr1

CASE
	WHEN THEN
	WHEN THEN
END
```
# 5. 索引

- MySQL 索引是一种数据结构，用于加快数据库查询的速度和性能。
- 类型
	- 主键索引 primary key (同时是约束和索引)
	- 唯一索引 unique
	- 普通索引 index
	- 全文索引 fulltex
		- 一般用Solr和Elasticsearch（es）
- 注意点
	- 一个索引可以包含多个列
	- 索引需要占用额外的存储空间。
	- 对表进行插入、更新和删除操作时，索引需要维护，可能会影响性能。
	- 过多或不合理的索引可能会导致性能下降，因此需要谨慎选择和规划索引。

```mysql
# 创建
-- 单列
CREATE INDEX index_name
ON table_name (column1 [ASC|DESC], column2 [ASC|DESC], ...);
-- 组合
CREATE TABLE table_name (
  column1 data_type,
  column2 data_type,
  ...,
  INDEX index_name (column1 [ASC|DESC], column2 [ASC|DESC], ...)
);

# 修改
ALTER TABLE table_name
ADD INDEX index_name (column1 [ASC|DESC], column2 [ASC|DESC], ...);

# 删除
-- 1.
DROP INDEX index_name ON table_name;

-- 2. alter
ALTER TABLE testalter_tbl DROP PRIMARY KEY;

# 显示
SHOW INDEX FROM table_name\G
-- `\G`: 格式化输出信息。“”“”“”“

```
# 6. 事务

- 在 MySQL 中只有使用了 Innodb 数据库引擎的数据库或表才支持事务。
- 事务处理可以用来维护数据库的完整性，保证成批的 SQL 语句要么全部执行，要么全部不执行。
- 满足四个条件——ACID
- *C 是目标，AID 是数据库提供的工具，约束是数据库提供的规则，三者加上开发者的业务逻辑一起才能实现真正的一致性*

| 事务控制语句                         | 功能                                 |
| ------------------------------ | ---------------------------------- |
| `BEGIN`/`START TRANSACTION`    | 显式地开启一个事务                          |
| `COMMIT`                       | 提交事务，并使已对数据库进行的所有修改成为永久性的          |
| `ROLLBACK`                     | 结束用户的事务，并撤销正在进行的所有未提交的修改           |
| `SAVEPOINT indentifier`        | 允许在事务中创建一个保存点，一个事务中可以有多个 SAVEPOINT |
| `RELEASE SAVEPOINT identifier` | 删除一个事务的保存点，当没有指定的保存点时，执行该语句会抛出一个异常 |
| `ROLLBACK TO identifier`       | 把事务回滚到标记点                          |
| `SET TRANSACTION`              | 用来设置事务的隔离级别                        |

## MySQL中的事务处理

- 自动提交设置
	- ==默认情况下，事务是开启的==，dml操作自动提交，不能回滚
	- SET AUTOCOMMIT=0 禁止自动提交
	- SET AUTOCOMMIT=1 开启自动提交

```mysql
-- 开始事务
START TRANSACTION;

-- 执行一些SQL语句
UPDATE accounts SET balance = balance - 100 WHERE user_id = 1;
UPDATE accounts SET balance = balance + 100 WHERE user_id = 2;

-- 判断是否要提交还是回滚
IF (条件) THEN
    COMMIT; -- 提交事务
ELSE
    ROLLBACK; -- 回滚事务
END IF;
```


## 事务的隔离级别

- InnoDB 存储引擎提供事务的隔离级别有`READ UNCOMMITTED`、`READ COMMITTED`、`REPEATABLE READ` 和 `SERIALIZABLE`
- 默认为`repeatable read`
- 不隔离的问题（两个事务同时进行时）
	- 脏读：事务2 读到了事务1 还没提交、最终也没生效的数据，
	- 不可重复读：同一个事务里，两次查询同一行数据，结果不一样，因为中间被别的事务修改并提交了
	- 幻读：行数前后不一致（被插入/删除）

![[f860067c130ae5df5c657d71dc3f4a76.jpg]]

### 查看隔离级别
```mysql
-- MySQL 8.0+
SELECT @@transaction_isolation;

-- 或者
SHOW VARIABLES LIKE 'transaction_isolation';

```

### 设置隔离级别
```sql
-- 只影响当前会话
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- 影响全局（所有新连接）
SET GLOBAL TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- 只影响下一个事务
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
```

### 隔离实例

```mysql
SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ;

BEGIN;
SELECT * FROM account WHERE id = 1;
UPDATE account SET balance = balance - 100 WHERE id = 1;
COMMIT;
```

# 7. 存储引擎

## 最重要的区别：锁粒度

**MyISAM 用表锁**，一个人在写，整张表都锁住，其他人都得等：

```
事务1 正在 UPDATE → 整张表被锁
事务2 想 SELECT  → 等待...
事务3 想 INSERT  → 等待...
```

**InnoDB 用行锁**，只锁住正在操作的那一行：

```
事务1 正在 UPDATE 第1行 → 只锁第1行
事务2 想 SELECT 第2行   → 直接可以读！
事务3 想 INSERT 新行    → 直接可以插！
```

这就是为什么并发场景下 InnoDB 性能更好

## 使用指令

```mysql
-- 查看 MySQL 支持哪些引擎
SHOW ENGINES;

-- 建表时指定
CREATE TABLE test (
    id INT PRIMARY KEY
) ENGINE = InnoDB;

-- 修改已有表的引擎
ALTER TABLE test ENGINE = MyISAM;

-- 查看某张表用的什么引擎
SHOW CREATE TABLE test;
```

# 8. 视图 View

- 视图是一张**虚拟表**，本身不存储数据，而是存储了一条 SELECT 语句。每次查询视图时，MySQL 会去执行那条 SELECT，把结果呈现给你
- 类比一下：视图就像一个**快捷方式**，背后指向的是真实的表
- 现在视图最核心的价值其实是**权限控制**，简化查询反而是次要的
## 创建视图

```mysql
-- 原表
SELECT * FROM purchase
JOIN customer ON purchase.customer_id = customer.customer_id
JOIN goods    ON purchase.goods_id = goods.goods_id;

-- 每次都写这么长很麻烦，封装成视图
CREATE VIEW v_purchase_detail AS
SELECT 
    purchase.order_id,
    customer.name    AS customer_name,
    goods.goods_name,
    goods.unitprice,
    purchase.nums,
    goods.unitprice * purchase.nums AS total
FROM purchase
JOIN customer ON purchase.customer_id = customer.customer_id
JOIN goods    ON purchase.goods_id = goods.goods_id;
```

之后直接查视图，就像查普通表一样：

```sql
SELECT * FROM v_purchase_detail;
SELECT * FROM v_purchase_detail WHERE customer_name = '张三';
```

## 查看和删除视图

```mysql
-- 查看所有视图
SHOW FULL TABLES WHERE table_type = 'VIEW';

-- 查看视图定义
SHOW CREATE VIEW v_purchase_detail;

-- 删除视图
DROP VIEW v_purchase_detail;

-- 修改视图
CREATE OR REPLACE VIEW v_purchase_detail AS
SELECT ...;
```
## 能对视图增删改吗？

可以，但有限制：
```sql
-- 简单视图可以直接改，会反映到原表
UPDATE v_customer_safe SET name = '李四' WHERE customer_id = 'C001';
```

以下情况**不能修改**：

- 视图包含 `GROUP BY`、`DISTINCT`、聚合函数
- 视图涉及多张表的 JOIN
- 包含子查询

所以视图**主要用来查询**，增删改还是直接操作原表更稳妥。

# 9. DB管理

## 用户管理

### 查看用户

```mysql
-- 所有用户存在 mysql 系统库里
SELECT user, host FROM mysql.user;
```
### 创建用户

```mysql
-- host 表示允许从哪里连接
-- % 表示任意地址，不指定host就是 % (别这样)，所有ip都有权限连接
-- localhost 表示只能本机连接

-- identified by 设置密码

-- 只允许本机连接
CREATE USER 'zhang3'@'localhost' IDENTIFIED BY '123456';

-- 允许任意地址连接
CREATE USER 'zhang3'@'%' IDENTIFIED BY '123456';
CREATE user 'kiki'@'192.168.1.%';
```
### 修改密码

```mysql
ALTER USER 'zhang3'@'localhost' IDENTIFIED BY '新密码';
```
### 删除用户

```mysql
DROP USER 'zhang3'@'localhost';
-- 如果host不是%，需要明确指定'user'@'host'
```

## 权限管理
### 授权

```mysql
-- 语法
GRANT 权限 ON 数据库.表 TO '用户'@'host';

-- 给 zhang3 shop_db 所有表的查询权限
GRANT SELECT ON shop_db.* TO 'zhang3'@'localhost';

-- 给多个权限
GRANT SELECT, INSERT, UPDATE ON shop_db.* TO 'zhang3'@'localhost';

-- 给所有权限
GRANT ALL PRIVILEGES ON shop_db.* TO 'zhang3'@'localhost';

-- 授权后刷新
FLUSH PRIVILEGES;
```
### 撤销权限

```mysql
REVOKE SELECT ON shop_db.* FROM 'zhang3'@'localhost';
```
### 查看某用户的权限

```mysql
SHOW GRANTS FOR 'zhang3'@'localhost';
```

### 权限层级

```mysql
-- 全局，所有数据库
GRANT SELECT ON *.* TO 'zhang3'@'localhost';

-- 指定数据库
GRANT SELECT ON shop_db.* TO 'zhang3'@'localhost';

-- 指定表
GRANT SELECT ON shop_db.goods TO 'zhang3'@'localhost';

-- 指定列
GRANT SELECT(goods_name, unitprice) ON shop_db.goods TO 'zhang3'@'localhost';
```

权限粒度从粗到细，实际项目里**最小权限原则**很重要——只给用户完成工作所需要的最小权限，比如前台查询用的账号就只给 SELECT，绝对不给 DROP。