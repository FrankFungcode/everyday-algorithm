# modules/ — 各业务模块稳定知识

每个模块包含三件套（必要时可拆成子目录）：

- `AGENTS.md` — 模块索引（模块定位 + 文件指引）
- `design.md` 或 `design/` — 页面/交互/业务规则、数据模型、设计理由
- `interfaces.md` 或 `interfaces/` — 对外契约（API、DTO、外部系统接口、暴露的工具/Bean）

新模块从 [`_template/`](_template/AGENTS.md) 复制骨架。

## 模块清单

- [`core/`](core/AGENTS.md) — 基础设施与通用能力（含 businessconfig 子模块）
- [`client/`](client/AGENTS.md) — 内部微服务调用（Org 服务）
- [`integration-mk/`](integration-mk/AGENTS.md) — MK 平台集成
- [`integration-ehr/`](integration-ehr/AGENTS.md) — EHR 考勤直连（五类考勤只读查询）
- [`timesheet/`](timesheet/AGENTS.md) — 工时管理（M01 / M06 已交付；M07 等见 `_bmad-output` 规划）
- `platform/` — TODO：待补充（源码 AGENTS.md 已有，见 `src/main/java/shokz/nexa/apps/platform/AGENTS.md`）
- [`_template/`](_template/AGENTS.md) — 新模块骨架模板
