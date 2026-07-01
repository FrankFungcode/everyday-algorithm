# timesheet/design — 模块设计

按当前代码实现拆分的稳定设计文档，聚焦“为什么这样建模、规则如何流转、内部如何协作”。

## 文件

- [`data-model.md`](data-model.md) — 实体、表结构、生成列、唯一键与迁移演进
- [`state-machine.md`](state-machine.md) — 研发/制造申请、审批主表与台账状态模型
- [`business-rules.md`](business-rules.md) — 批次生成、补填、锁定、审批归集等核心规则
- [`dingtalk-integration.md`](dingtalk-integration.md) — 钉钉待办/工作通知、键生成与 after-commit 出站
- [`auth.md`](auth.md) — 五类管理员角色、业务事实与配置写权限
- [`ledger-and-reports.md`](ledger-and-reports.md) — 台账写入、查询范围与报表纳入口径
- [`known-limitations.md`](known-limitations.md) — M02/M06/M07A/M07B/M09 等已接受的技术债与边界

## 何时查看

- 查“业务规则/状态为什么这样走”时，先看本目录
- 查 HTTP 路径、请求体、返回体时，转到 [`../interfaces/AGENTS.md`](../interfaces/AGENTS.md)
- 查代码目录时，转到源码包内 `AGENTS.md`
