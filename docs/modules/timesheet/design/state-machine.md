# timesheet — 状态机

工时模块的一期状态机以枚举方法为准。非法跃迁统一在枚举内部抛 `IllegalStateException`。

## 研发申请 `RdApplicationStage`

状态：

- `PENDING_FILL`
- `FILLING`
- `PENDING_APPROVAL`
- `PENDING_MONTHLY_APPROVAL`
- `APPROVED`
- `REJECTED`

合法跃迁：

- `save()`：`PENDING_FILL/FILLING -> FILLING`
- `lock()`：`PENDING_FILL/FILLING -> PENDING_APPROVAL`
- `lockForMonthly()`：`PENDING_FILL/FILLING -> PENDING_MONTHLY_APPROVAL`
- `approve()`：`PENDING_APPROVAL -> APPROVED`
- `reject()`：`PENDING_APPROVAL -> REJECTED`

稳定结论：

- 只有“直管且有项目”的研发工时在锁定后进入 `PENDING_APPROVAL`
- 非直管项目工时与非项目工时在锁定后进入 `PENDING_MONTHLY_APPROVAL`
- `PENDING_MONTHLY_APPROVAL` 只用于月度审批占位，不进入本期 Leader 审批主表

## 制造申请 `MfgApplicationStage`

状态：

- `PENDING_FILL`
- `FILLING`
- `SUPPLEMENTING`
- `PENDING_APPROVAL`
- `APPROVED`
- `REJECTED`
- `FINISHED_NO_REVIEW`
- `DECLINED`

合法跃迁：

- `save()`：`PENDING_FILL/FILLING -> FILLING`
- `moveToSupplement()`：`PENDING_FILL/FILLING -> SUPPLEMENTING`
- `submit(isDirectManaged)`：`FILLING -> PENDING_APPROVAL/FINISHED_NO_REVIEW`
- `supplement(isDirectManaged)`：`SUPPLEMENTING -> PENDING_APPROVAL/FINISHED_NO_REVIEW`
- `autoSubmit(isDirectManaged)`：`SUPPLEMENTING -> PENDING_APPROVAL/FINISHED_NO_REVIEW`
- `decline()`：`PENDING_FILL/FILLING -> DECLINED`
- `approve()`：`PENDING_APPROVAL -> APPROVED`
- `reject()`：`PENDING_APPROVAL -> REJECTED`

稳定结论：

- 制造是否进审批只由 `isDirectManaged` 决定
- 非直管制造行在提交或补填完成后进入 `FINISHED_NO_REVIEW`
- 休息日明确“不工作”进入 `DECLINED`

## 审批主表 `ApprovalHeaderStatus`

状态：

- `PENDING`
- `COMPLETED`

合法跃迁：

- `complete()`：`PENDING -> COMPLETED`

审批主表只表达“这一组审批是否完结”，明细通过各自申请表表达最终通过/驳回。

## 研发工时修改单 `RdModifyStage`

状态：

- `DRAFT`
- `SUBMITTED`
- `LOCKED`

合法跃迁：

- `submit()`：`DRAFT/SUBMITTED -> SUBMITTED`
- `lock()`：`DRAFT/SUBMITTED -> LOCKED`

稳定结论：

- `SUBMITTED` 可重复提交，业务层以最后一次提交内容为准。
- 未提交的 `DRAFT` 到期也可直接锁定；锁定后修订任务只读。
- `LOCKED` 为终态，不能再次提交或锁定。

## 修改审批单 `RdModifyApprovalStage`

状态：

- `PENDING`
- `COMPLETED`（Leader 手动提交，终态）
- `AUTO_COMPLETED`（超截止系统自动处理，终态）

合法跃迁：

- `submit()`：`PENDING -> COMPLETED`
- `autoComplete()`：`PENDING -> AUTO_COMPLETED`

稳定结论：

- 详情 `readOnly` 在终态或超过 `deadline` 时为 true；`submittable`  additionally 要求当前用户为 `leaderId`。
- 超截止规则见 [`business-rules.md`](business-rules.md) 修改审批章节；调度入口为 `RdModifyApprovalTimeoutScheduler`。

## 台账状态

`ts_ledger_projections.stage` 直接保存来源申请行的阶段名：

- 研发台账继承 `RdApplicationStage`
- 制造台账继承 `MfgApplicationStage`

此外通过 `LedgerProjectionDisplayStatus` 生成展示态，用于列表展示，不替代真实业务状态。

## 与调度流程的衔接

- 研发：`RdApplicationLockScheduler` 触发锁定，调用研发状态机进入周度审批或月度审批
- 研发修改单：`RdModifyLockScheduler` 扫描到期修改单并锁定；`RdModifyGenerationScheduler` / `RdModifyApprovalGenerationScheduler` 按批次生成修改单与修改审批单
- 修改审批：`RdModifyApprovalTimeoutScheduler` 对 `PENDING` 且已过 `deadline` 的审批单自动完结
- 制造：`MfgSupplementGenerationScheduler` 将逾期未提交的制造单推进到 `SUPPLEMENTING`
- 制造：`MfgSupplementDeadlineScheduler` 在补填截止后自动提交
- 审批：`RdApprovalTimeoutScheduler` 对逾期审批头自动完结，并驱动明细进入 `APPROVED/REJECTED`
