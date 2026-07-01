# decisions/

全局技术决策（ADR）。每条一个文件，命名 `NNNN-kebab-title.md`，编号一经分配不变。

模块内部的实现选型（不跨模块约束）放在 `docs/modules/{module}/decisions/`，由模块自行维护。

## 索引

| 编号 | 标题 | 范围 |
|------|------|------|
| [0001](0001-tech-stack.md) | 技术栈选型 | Java / Spring Boot / Spring Cloud 基线 |
| [0002](0002-infrastructure.md) | 基础设施 | Nacos / Redis / Flyway / Docker |
| [0003](0003-observability.md) | 可观测性 | Micrometer Tracing / Prometheus / Loki |
| [0004](0004-base-entity.md) | BaseEntity 设计 | UUID v7 / 审计字段 / 软删除 |
| [0005](0005-exception-handling.md) | 异常体系 | ErrorType / NexaException / 错误码编码 |
| [0006](0006-security.md) | 安全策略 | 网关鉴权 / `permitAll` / `@PreAuthorize` |
| [0007](0007-scheduler-lock.md) | 定时任务分布式锁 | ShedLock 7.x + Redis Spring Provider |
| [0008](0008-naming-and-mapping.md) | DTO/VO 命名与层间映射 | \*Vo\/\*Dto\/\*Param\ 业务层后缀强制 + \*Request\/\*Response\ Integration 层后缀 / MapStruct 按需使用 |

## 上一级

- [docs/AGENTS.md](../AGENTS.md)

## 新增 ADR

取下一个未用编号，文件名为 `NNNN-kebab-title.md`；按"背景 / 方案对比 / 决策 / 理由 / 影响"组织。写完在本索引追加一行。
