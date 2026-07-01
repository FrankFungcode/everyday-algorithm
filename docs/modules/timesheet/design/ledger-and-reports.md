# timesheet — 台账与报表

台账与报表都建立在 `ts_ledger_projections` 之上，但“可查询范围”和“纳入报表的口径”并不相同。

## 台账写入入口

来源：`TsLedgerProjectionService`

主要由以下业务动作触发：

- 研发锁定
- 制造提交
- 制造补填提交
- 制造补填截止自动提交
- 审批提交后对相关行重写投影
- **M06 修改单截止锁定**（`RdModifyLedgerWriter.writeLockSnapshot`）：写入 `modified_hours` 等修改字段；`submitSource=WORK_HOUR_MODIFICATION`；研发/供应链行均写 `rdModificationSubmitChannel`（成员曾自主提交修改单为 `USER_SELF`，截止未提交为 `SYSTEM`）
- **M06 修改审批结案**（`RdModifyLedgerWriter.applyApprovalDecisions`）：写 `submitSource=WORK_HOUR_MODIFICATION_APPROVAL`；研发行另写 `rdModificationApprovalSubmitChannel`（Leader 手动 `USER_SELF`，超截止自动 `SYSTEM`）；供应链台账对外仅展示修改单提交来源，不展示修改审批提交来源
- **M09 财务 Excel 导入**（`POST /timesheet/ledger/rd/import`）：按自然键 upsert 研发台账，`submitSource=WORK_HOUR_CORRECTION`；制造台账无导入入口

稳定结论：

- 台账是投影，不是原始凭证
- 投影中的 `effectiveHours` 与来源明细 `workHours` 保持一致，可为空

## 研发台账

来源：`RdLedgerServiceImpl`

查询范围按当前登录人的业务关系并集过滤：

- 本人
- 自己作为 Leader 的成员
- 自己作为项目经理管理的项目

详情接口只接受 `domain = RD` 的投影。

## 制造台账

来源：`MfgLedgerServiceImpl`

查询范围按当前登录人的业务关系并集过滤：

- 本人
- 自己作为直属上级或补填处理人可见的成员
- 自己作为 Leader 的成员
- 自己作为项目经理管理的项目

稳定结论：

- 制造台账可查询阶段白名单包含 `REJECTED`
- 可查询范围与报表纳入规则不是一回事

## 报表纳入规则

来源：`TimesheetReportLedgerRules`

研发报表：

- 仅纳入 `domain = RD`
- 仅纳入 `formType = RD_APPLICATION`
- 纳入条件（满足任一即纳入，各条前置约束如下）：
  1. `stage = APPROVED`（一期既有；与其他字段无关）
  2. `modify_approval_status = APPROVED`（M06 修改审批通过；金额取已回写的 `effective_hours`）
  3. `stage = PENDING_MONTHLY_APPROVAL` **且** `ledger_display_status = COMPLETED` **且** `modify_approval_status ≠ REJECTED`（M07B 月度审批已通过；申请单 stage 不迁移，见 D-1.3；REJECTED 优先级高于 COMPLETED，防止 M06 驳回行被报表纳入）

制造报表：

- 仅纳入 `domain = MFG`
- 仅纳入 `formType = MFG_APPLICATION`
- 纳入 `PENDING_APPROVAL`、`APPROVED`、`FINISHED_NO_REVIEW`
- 不纳入 `REJECTED` 与 `DECLINED`

## 月度报表

来源：`TimesheetReportServiceImpl`

- 以月份为窗口聚合人员、项目与考勤
- 仍然依赖台账投影，不直接回扫申请表
- 报表的考勤、填报率、项目占比规则以 Service 计算结果为准

## 项目报表

来源：`TimesheetReportServiceImpl`

- 支持 `WEEKLY` 与 `MONTHLY` 两种粒度
- 以项目和日期区间为主过滤条件
- 一期 `second_fill_rate` 仍为空占位
