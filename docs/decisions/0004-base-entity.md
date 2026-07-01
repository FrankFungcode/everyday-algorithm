# 0004 — BaseEntity 统一基类

## 背景

所有业务实体需要统一的主键策略、审计字段（创建/更新时间与人）、软删除支持。若每个实体重复定义会造成：

- 字段命名不一致
- 软删除遗漏过滤条件导致数据泄露
- 主键策略碎片化（自增 ID / UUID v4 / 雪花 ID 混用）

## 考虑过的方案

| 维度 | 候选 | 取舍 |
|------|------|------|
| 主键 | 自增 `BIGINT` / UUID v4 / **UUID v7** / 雪花 ID | UUID v7：分布式无中心、时间排序友好 |
| 审计字段实现 | 手动赋值 / AOP 拦截 / **JPA `@CreatedDate`/`@LastModifiedDate`** | JPA 注解：与持久化层耦合最自然 |
| 软删除 | 业务代码手动 `WHERE deleted=false` / **Hibernate 7 `@SoftDelete`** | 注解：查询层自动过滤，减少遗漏 |
| 抽象方式 | 接口 + 默认方法 / **抽象类继承** | 抽象类：审计字段需被持久化，接口默认方法做不到 |

## 决定

提供 `BaseEntity` 抽象基类，**所有业务实体必须继承**。

### 主键策略

- 使用 **UUID v7**（时间排序 UUID）
- 通过 Hibernate `@UuidGenerator(style = VERSION_7)` 原生生成

### 审计字段

- `createdAt` / `updatedAt`：Spring Data JPA `@CreatedDate` / `@LastModifiedDate` 自动填充
- `createdBy` / `updatedBy`：通过 `AuditorAwareImpl`（基于 `ContextUtil` 读 MDC）自动填充

### 软删除

- 使用 Hibernate 7 原生 `@SoftDelete` 注解
- 查询时自动过滤已删除记录，**无需手动添加条件**
- **唯一性约束**：由于软删除行仍在数据库中，唯一键需配合虚拟列实现（如 `config_key_active = IF(deleted, NULL, config_key)`）

## 理由

- **UUID v7 vs 自增 ID**：分布式环境无需中心化生成器；v7 的时间排序性保持索引友好（B+Tree 顺序写入）
- **继承 vs 组合**：审计字段 / 软删除是所有实体的通用需求，继承使用最简洁；JPA 持久化要求字段必须在被持久化的类层级中
- **Hibernate 原生软删除 vs 手动**：在查询层面自动过滤，编译期无遗漏可能

## 影响

- **正面**：业务实体定义简洁；查询无需关心软删除；审计字段不再被开发者手动赋值或遗漏
- **必须遵守**：
  - 所有实体表必须包含 `id`(UUID) + 审计字段 + `deleted`
  - 不得在业务代码中直接修改审计字段或 `deleted` 字段（删除走 `Repository.deleteById()`）
  - 添加唯一索引必须考虑软删除场景，使用虚拟列方案
