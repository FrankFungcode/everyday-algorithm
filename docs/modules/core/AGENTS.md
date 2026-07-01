# core — 基础设施与通用能力

为所有业务模块提供：统一响应、异常体系、基础实体/仓储、安全配置、上下文、动态查询、工具类。本身不含业务逻辑、不暴露业务 Controller。

## 文件

- [`design.md`](design.md) — 包结构、核心流程、数据模型、设计理由
- [`interfaces.md`](interfaces.md) — 对外契约（NexaResponse / BaseEntity / BaseRepo / ErrorType / ContextUtil / 业务配置注解）

## 代码级上下文

- [`core/AGENTS.md`](../../../src/main/java/shokz/nexa/apps/core/AGENTS.md) — 主包代码结构与组件清单
- [`core/businessconfig/AGENTS.md`](../../../src/main/java/shokz/nexa/apps/core/businessconfig/AGENTS.md) — 动态业务配置子模块
