# timesheet — 工时管理

工时管理模块，覆盖制造/研发工时申请、补填、审批、台账与报表；**二期模块（M02/M06/M07A/M07B/M09）均已交付**。实现以源码与本目录文档为准；产品基线保留在 [`_bmad-output/planning-artifacts/timesheet/prd/`](../../../_bmad-output/planning-artifacts/timesheet/prd/)。

## 文件

- [`design/AGENTS.md`](design/AGENTS.md) — 业务规则、状态机、数据模型、权限与集成设计
- [`interfaces/AGENTS.md`](interfaces/AGENTS.md) — REST API、导入导出与 admin 契约

## 代码级上下文

- [`../../../src/main/java/shokz/nexa/apps/timesheet/AGENTS.md`](../../../src/main/java/shokz/nexa/apps/timesheet/AGENTS.md) — 模块代码总索引
- [`../../../src/main/java/shokz/nexa/apps/timesheet/application/AGENTS.md`](../../../src/main/java/shokz/nexa/apps/timesheet/application/AGENTS.md) — 编排层
- [`../../../src/main/java/shokz/nexa/apps/timesheet/controller/AGENTS.md`](../../../src/main/java/shokz/nexa/apps/timesheet/controller/AGENTS.md) — 控制器与 admin 路由
- [`../../../src/main/java/shokz/nexa/apps/timesheet/service/AGENTS.md`](../../../src/main/java/shokz/nexa/apps/timesheet/service/AGENTS.md) — 核心业务实现
- [`../../../src/main/java/shokz/nexa/apps/timesheet/scheduler/AGENTS.md`](../../../src/main/java/shokz/nexa/apps/timesheet/scheduler/AGENTS.md) — 定时任务
- [`../../../src/main/java/shokz/nexa/apps/timesheet/auth/AGENTS.md`](../../../src/main/java/shokz/nexa/apps/timesheet/auth/AGENTS.md) — 权限与业务事实
- [`../../../src/main/java/shokz/nexa/apps/timesheet/integration/AGENTS.md`](../../../src/main/java/shokz/nexa/apps/timesheet/integration/AGENTS.md) — 外部适配
- [`../../../src/main/java/shokz/nexa/apps/timesheet/support/AGENTS.md`](../../../src/main/java/shokz/nexa/apps/timesheet/support/AGENTS.md) — 查询规格与报表规则
- [`../../../src/main/java/shokz/nexa/apps/timesheet/config/AGENTS.md`](../../../src/main/java/shokz/nexa/apps/timesheet/config/AGENTS.md) — 模块配置
- [`timesheet/entity/AGENTS.md`](../../../src/main/java/shokz/nexa/apps/timesheet/entity/AGENTS.md) — 实体与数据模型
- [`timesheet/enums/AGENTS.md`](../../../src/main/java/shokz/nexa/apps/timesheet/enums/AGENTS.md) — 枚举定义
- [`timesheet/util/AGENTS.md`](../../../src/main/java/shokz/nexa/apps/timesheet/util/AGENTS.md) — 模块内工具类
