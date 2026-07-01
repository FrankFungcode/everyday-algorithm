# integration-ehr — EHR 考勤直连

封装 EHR 第三方五类考勤只读查询：日考勤汇总、请假、补卡、出差、调班。该模块只做协议适配与 Token 管理，不承载工时业务规则；工时侧通过 `MfgAttendanceClient` 固定走 EHR 直连。

## 文件

- [`design.md`](design.md) — 包结构、Token 流程、与 MK 差异、联调 Runbook
- [`interfaces.md`](interfaces.md) — 配置键、Token 接口、五类业务接口 envelope、响应字段与错误语义

## 代码级上下文

- `src/main/java/shokz/nexa/apps/integration/ehr/` — EHR 协议层
- `src/main/java/shokz/nexa/apps/timesheet/integration/ehr/` — 工时考勤 EHR 适配
