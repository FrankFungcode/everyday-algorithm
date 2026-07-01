# timesheet/interfaces — 对外契约

按当前 Controller 实现拆分的接口契约，聚焦“路径、参数、返回形态、权限与下载语义”。

## 文件

- [`applications.md`](applications.md) — 制造/研发申请单、考勤刷新、生成与锁定触发器
- [`supplements.md`](supplements.md) — 制造补填、催办与相关触发器
- [`approvals.md`](approvals.md) — 研发审批与管理员审批视图
- [`ledger.md`](ledger.md) — 研发/制造台账与管理员台账视图
- [`reports.md`](reports.md) — 月度与项目报表
- [`master-data.md`](master-data.md) — 项目、工厂、产品与预算导入
- [`auth.md`](auth.md) — 鉴权上下文与 admin 守卫汇总
- [`external-integrations.md`](external-integrations.md) — 二进制下载、Excel 导入与考勤刷新类契约

## 何时查看

- 查 REST API、Query/Path/Body、导出下载契约时，先看本目录
- 查状态流转、业务规则、待办策略时，转到 [`../design/AGENTS.md`](../design/AGENTS.md)
