# 0001 — 技术栈选型

## 背景

需要为 nexa-apps 选择稳定、长期可维护的核心技术栈，覆盖框架、数据访问、服务通信、开发效率与 JSON 处理。要求与 Nexa 生态其他服务（auth / org / gateway 等）兼容，方便后续整合。

## 考虑过的方案

| 维度 | 候选方案 | 取舍 |
|------|---------|------|
| 框架版本 | Spring Boot 3.x（稳定）vs **4.0.x**（最新） | 选 4.x：与 Nexa 全家桶统一，享受 Jakarta EE 完整迁移与原生 GraalVM 支持 |
| Java 版本 | Java 21 LTS vs **Java 25** | 选 25：虚拟线程、模式匹配等现代特性更成熟 |
| 服务发现 | Eureka vs **Nacos** | 选 Nacos：同时承担注册中心与配置中心，减少基础设施数量；Spring Cloud Alibaba 集成 |
| ORM | MyBatis vs **Spring Data JPA + Hibernate 7** | 选 JPA：`BaseEntity` / `BaseRepo` 抽象简化业务模块；Hibernate 7 软删除原生支持 |
| JSON | 仅 Jackson 2 vs **Jackson 3 + Jackson 2 共存** | Boot 4 默认 Jackson 3，业务代码统一用 `tools.jackson.*`；三方库的 Jackson 2 共存即可 |

## 决定

### 核心框架

| 技术 | 版本 |
|------|------|
| Java | 25 |
| Spring Boot | 4.0.x |
| Spring Cloud | 2025.1.0 |
| Spring Cloud Alibaba | 2025.1.0.0 |

### 数据层

- Spring Data JPA + Hibernate 7（含原生软删除 `@SoftDelete`）
- MySQL（主数据存储）
- Flyway（schema 版本管理）
- Redisson 4.3.0（分布式锁、缓存、Redis 操作高级封装）

### 服务通信

- OpenFeign（声明式 HTTP 客户端）
- Nacos（注册 + 配置）
- Spring Cloud LoadBalancer（客户端负载均衡）

### 开发效率

- Lombok 1.18.44
- MapStruct 1.5.5（编译期类型安全映射）
- JSpecify 1.0.0（渐进式 Null Safety）
- SpringDoc OpenAPI 3.0.2

### JSON 处理

Boot 4 默认 **Jackson 3**（包名 `tools.jackson.*`）。注解仍为 `com.fasterxml.jackson.annotation.*`（官方共享设计）。三方库传递的 Jackson 2 允许共存，**无需排除**。

## 理由

- **与 Nexa 生态对齐**：所有 Nexa 后端项目统一在 Boot 4 / Java 25，避免版本碎片
- **长期可维护**：选最新稳定 LTS+1 版本，享受 5 年以上社区支持窗口
- **基础设施数量最小**：Nacos 一物两用、JPA 抽象覆盖 95% 场景，减少新人理解成本
- **Hibernate 7 原生软删除**：规避手动写 `WHERE deleted = false` 容易遗漏的问题

## 影响

- **正面**：模块开发只需关注业务逻辑；统一的版本基线降低升级与排错成本
- **负面**：Java 25 对部分 IDE / 老旧工具支持有限，需团队统一升级 IDE
- **必须遵守**：业务代码统一使用 Jackson 3 包名 `tools.jackson.*`；新模块 Repository 必须继承 `BaseRepo`
