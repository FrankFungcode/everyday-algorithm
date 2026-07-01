# timesheet — 钉钉待办与工作通知

工时模块对钉钉出站能力的统一抽象是 `MfgTodoPushClient`。

## 抽象与实现

- `MfgTodoPushClient`：定义制造填报、补填、催办、研发填报、审批提醒及各类 `dismiss*` 方法
- `IntegrationTimesheetTodoPushClient`：真实集成实现
- `NoOpMfgTodoPushClient`：空实现，保留日志与通知行为

切换配置：

- `nexa.timesheet.dingtalk-todo.enabled=true`：启用真实待办集成
- `false`：不创建待办，走 NoOp

## 出站方式

真实集成实现包含两类出站：

- 通过 `IntegrationServiceClient` 调用 `nexa-integration` 创建/删除待办
- 通过 `DingNotifyService` 发送 Markdown 工作通知

稳定结论：

- 真实实现中，创建待办后会伴生发送工作通知
- 远程调用与通知都在事务提交后执行，避免数据库回滚与钉钉状态不一致
- NoOp 模式不会创建集成待办，但仍可发送工作通知

## 业务键

`TimesheetDingTodoKeys` 负责生成稳定的 `businessTaskId`，用于创建与删除待办时对齐。

常见维度包括：

- 批次 id
- 审批头 id
- 申报日/催办日
- 申请人或处理人

## 场景

### 制造

- 生成申请单：推送填报待办
- D0 17:00：`MfgFillReminderScheduler` 对申报日为上一工作日、仍为 `PENDING_FILL` / `FILLING` 且未提交的申请人发送未提交提醒工作通知（ShedLock 多实例互斥 + Redis 按 batch/申请人/日幂等；不新建待办）
- 进入补填：推送处理人待办、成员提醒
- 经理催办：推送 +2 经理催办待办/通知
- 一键催填：支持成员通知，也支持对处理人发送无入口链接的通知

### 研发

- 项目成员离职自动退出（`ProjectMemberOffboardingScheduler` 每日 4:00）：**研发/制造角色**成员退出时，向项目财务与项目经理发送工作通知；深链 `/timesheet/project/{id}`；不创建待办
- 生成申请单：推送填报待办
- 截止前第 1 工作日 9/14/18：发送填报提醒工作通知（`RdFillReminderScheduler`；ShedLock 多实例互斥 + Redis 按 batch/申请人/日/时刻幂等）
- 生成审批头：推送 Leader 审批待办
- 审批截止前第 1 工作日 9/14/18：发送 M05 审批催办工作通知（`RdApprovalUrgeScheduler`，与填报提醒同一「前第 1 工作日」口径）

### M06 修改单 / 修改审批

- 生成修改单（`DRAFT`）：推送成员修改填报待办，深链 `/timesheet/rd/modify/{id}`
- 生成修改审批单（`PENDING`）：推送 Leader 审批待办，深链 `/timesheet/rd/modify-approval/{id}`
- 截止前第 1 工作日 9/14/18：`RdModifyFillReminderScheduler` / `RdModifyApprovalUrgeScheduler` 发送催填/催审工作通知（不新建待办）
- 成员提交或锁定修改单：消除 `rdModifyFill` 待办
- Leader 提交或超截止自动完结修改审批：消除 `rdModifyApproval` 待办

### M07A 月度补填

- 生成补填单（`DRAFT`）：推送成员待办 + 工作通知，深链 `/timesheet/monthly-supplement/{id}`
- 工作日 10:00 / 14:00：`MonthlySupplementReminderScheduler` 对仍为 `DRAFT` 的单发送催办工作通知（上海日历工作日，含调休上班）
- 成员提交或管理员锁定：消除 `monthlySupplementTodo` 待办

**香港代收（`nexa.timesheet.dingtalk-todo.notify-receiver-delegates`）**：

- 原定收件人工号（映射表 key，如香港侧）除月度补填外，其余工时待办/工作通知均 suppress
- 月度补填生成待办与工作日催办：**待办不挂 pcUrl/appUrl**；正文改为纯文本指引（请使用香港账号登录 + 发送日 + 3 工作日截止（文案仅展示 `yyyy-MM-dd` 日期，不含工号）+ 完整 HTTPS 网址），工作通知不追加 DingTalk 外链块，由 `sendMarkdownInternal` 路由至代收 tech 账号

### M07B 月度审批

- 生成审批单（`PENDING`）：推送 Leader 审批待办 + 工作通知，深链 `/timesheet/rd/monthly-approval/{id}`
- 截止前第 1 工作日 9/14/18：`RdMonthlyApprovalUrgeScheduler` 对仍为 `PENDING` 的单发送催审工作通知（不新建待办）
- Leader 提交或超截止自动结案：消除 `rdMonthlyApproval` 待办

### 消除时机

- 制造员工提交、休息日拒绝、进入补填前：消除制造填报待办
- 制造补填完成或处理人无剩余补填项：消除补填待办
- 研发提交成功或批次锁定：消除研发填报待办
- M05 审批提交或超时自动完结：消除 Leader 审批待办
- M06 修改单提交或锁定、修改审批提交或自动完结：消除对应 M06 待办

## 链接与配置

- `TimesheetDingClientUrls` 负责拼接各业务入口
- `TimesheetDingtalkTodoProperties` 维护待办开关与 `sourceSystemKey`
- 当前代码注释说明：工时入口 HTTPS 路径由 `app.client-base-url` 与模块内 URL 生成逻辑拼接

## 当前实现边界

- 工时模块当前没有填充 `participantCodes`
- 钉钉待办与工作通知是“业务抽象”，具体菜单、前端入口和可见性不在此处定义
