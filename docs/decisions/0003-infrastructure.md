# 0003 — 基础设施基线

## 背景

业务模块需要一套统一、稳定的基础设施支撑：服务注册发现、配置中心、缓存、分布式锁、数据库版本管理、容器化、安全。约束：减少基础组件数量、降低新人理解成本。

## 考虑过的方案

| 维度 | 候选 | 取舍 |
|------|------|------|
| 注册 + 配置中心 | Eureka + Spring Cloud Config | **Nacos**（一物两用） |
| Redis 客户端 | Lettuce / Jedis | **Redisson**（封装分布式锁、原子操作） |
| 进程内缓存 | 直接用 Redis | **Caffeine + Redis 分层** |
| 数据库版本 | Liquibase | **Flyway**（迁移文件更直观） |
| 容器编排 | K8s 原生开发 | **Docker Compose**（本地） |
| 鉴权策略 | 一开始就实现完整 RBAC | **Security `permitAll` + 业务层 `@PreAuthorize` 渐进** |

## 决定

### Nacos —— 注册与配置中心

- 服务注册：应用启动时自动注册，其他微服务通过服务名发现
- 配置管理：DataId `nexa-apps.yaml`，支持动态刷新
- 动态日志级别：`LoggingLevelConfig` 监听 Nacos 变化，运行时调整

### Redis / Redisson —— 分布式缓存与锁

- Redisson 4.3.0
- `DistributedLockUtil`：可重入锁与分布式任务调度
- `RedissonUtil`：基础 get/set，含线程安全版本
- 进程内缓存使用 Caffeine（如 `UserResolver` / `DepartmentResolver`），与 Redis 分层

### Flyway —— 数据库版本管理

- 所有 schema 变更通过迁移脚本管理
- 文件位于 `src/main/resources/db/migration/`
- 多环境数据库结构一致

### Docker —— 容器化

- `Dockerfile`：多阶段构建（Maven builder + JRE runtime），镜像非 root 运行
- `docker-compose.yml`：本地开发环境编排
- `.env.example`：环境变量模板
- **Profile 由部署侧显式注入**：镜像有意不预设 `SPRING_PROFILES_ACTIVE`，由 docker-compose / k8s / 流水线注入 `test` 或 `prod`，避免 prod 部署漏注入时静默连到错误配置。本地单元测试由 Maven Surefire 强制注入 `unit-test` profile，跳过 Nacos 与 Loki。

### Spring Security

- 当前策略：`permitAll`（全部放行），配置在 `SecurityConfig`
- CSRF 禁用、Session 无状态
- 真实权限计划在业务 Application/Service 层通过 `@PreAuthorize` 实现

## 理由

- **Nacos 一物两用**：减少基础组件数量，简化部署
- **Redisson vs 原生 Lettuce/Jedis**：分布式锁、可重入、分布式任务等高级抽象能直接用，无需自己造
- **Caffeine + Redis 分层**：高频小数据走进程缓存（毫秒级），跨实例数据走 Redis（毫秒~十毫秒）
- **Flyway**：迁移文件即文档，便于评审；与 Spring Boot 集成最佳
- **Security 渐进**：避免在业务模型未稳前过早设计 RBAC，节省返工

## 影响

- **正面**：本地开发只需 `docker-compose up` 即可拉起依赖；schema 变更可追溯回放
- **风险**：当前 `permitAll` 不能用于公网暴露，必须通过网关层鉴权
- **必须遵守**：所有 schema 变更走 Flyway；不直接 `ALTER TABLE`；新 Bean 涉及 Redis 操作优先用 `RedissonUtil` / `DistributedLockUtil`
