---
tags:
  - 数据库
  - MySQL
---
## 分页
```mysql

DECS table_name

# 三个为一组取出，分页功能实现
# LIMIT 可用于抽样和限制返回量提高效率
select name
from instructor
order by name
limit 0, 3;
```

## 多表查询

### 笛卡尔乘积

1. 多表查询，参考矩阵的笛卡尔乘积（例如，取表1的第一行，和表2的每一行匹配）；返回的记录数=两张表的行数相乘
2. 写出正确的过滤条件！
3. condition不能少于（表的个数-1），这些条件把所有表都连接起来了——否则会出现笛卡尔积
4. 不过……当我们需要系统性地组合两个独立集合的所有可能情况时，就需要笛卡尔积。这不是错误，而是一种设计模式。

```mysql

SELECT i.ID
FROM instructor i
INNER JOIN teaches t ON i.ID = t.ID -- 明确连接条件
WHERE t.year = 2009; -- 明确过滤条件
```

### 自连接

常见场景：
- 组织架构：员工和经理在同一张员工表中
- 产品分类：父子分类在同一张分类表中
- 交通路线：起点和终点在同一张城市表中
- 社交网络：用户间的关注关系在同一张用户表中
- 论坛回复：回复链在同一张帖子表中

```mysql
-- 基本语法：使用不同的别名区分同一表的不同“角色”
SELECT t1.column, t2.column
FROM table_name t1
JOIN table_name t2 ON t1.common_field = t2.common_field
WHERE [conditions];

```

## 子查询

### 行子查询

```mysql
# 单行子查询
## 返回且仅返回一行一列（一个标量值）
SELECT column1, column2, ...
FROM table_name
WHERE column_name operator (
    SELECT single_value_column
    FROM table_name
    WHERE condition
);

# 多行子查询
## 返回多行但只有一列的结果集
## 必须使用多行操作符：IN, ANY, ALL, EXISTS
## 常用于集合比较

SELECT name, department, salary 
FROM employees 
WHERE salary > ANY( 
	SELECT salary 
	FROM employees 
	WHERE department = 'Sales' 
);

SELECT name 
FROM employees e1 
WHERE EXISTS ( 
	SELECT 1 -- 习惯写SELECT 1，实际不返回内容，只检查是否存在 
	FROM employees e2 
	WHERE e2.manager_id = e1.emp_id 
);
```
### 列子查询
```mysql
-- 找出和张三在同一个部门且职位相同的员工
SELECT emp_id, name, department, position
FROM employees e1
WHERE (department, position) = (
    SELECT department, position
    FROM employees e2
    WHERE name = '张三'
)
AND name != '张三';  -- 排除张三本人

```

# 连接 

| 连接类型     | SQL语句             | 结果说明         | 结果集                                       |
| -------- | ----------------- | ------------ | ----------------------------------------- |
| **内连接**  | `INNER JOIN`      | 只返回匹配的记录     | Alice-市场部, Bob-技术部                        |
| **左外连接** | `LEFT JOIN`       | 所有员工 + 匹配的部门 | Alice-市场部, Bob-技术部, Carol-销售部, David-NULL |
| **右外连接** | `RIGHT JOIN`      | 所有部门 + 匹配的员工 | 市场部-Alice, 技术部-Bob, 财务部-NULL              |
| **全外连接** | `FULL OUTER JOIN` | 所有员工 + 所有部门  | 所有组合，没有匹配的用NULL填充                         |

```mysql
# 左外连接（推荐+尽量）
SELECT 左表列, 右表列
FROM 左表
LEFT JOIN 右表 ON 连接条件;

# 

```

