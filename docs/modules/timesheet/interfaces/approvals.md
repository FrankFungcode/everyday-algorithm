# timesheet — 审批接口

## 自助审批 `/timesheet/rd/approvals`

- `GET /timesheet/rd/approvals`
  - Query: `projectName`, `weekStart`, `status`, `pageable`
  - 默认排序：`createdAt DESC`
- `GET /timesheet/rd/approvals/{approvalId}`
- `POST /timesheet/rd/approvals/{approvalId}/submit`
  - Body: `ApprovalSubmitParam`

关键约束：

- `ApprovalSubmitParam.rdItems` 为必填
- 一期 `newProjectItems` 不支持，传值会被拒绝
- 非 Leader 提交会返回 `PERMISSION_DENIED` 语义错误

## 管理员视图 `/timesheet/admin/rd/approvals`

- `GET /timesheet/admin/rd/approvals`
  - Query: `projectName`, `weekStart`, `status`, `leaderId`, `belongingMonth`, `applicantId`, `pageable`
  - `applicantId`：按研发申请明细申请人筛选；须同时匹配该明细在当批次的 `leaderId` 与审批单 Leader，避免同项目跨 Leader 误命中
- `GET /timesheet/admin/rd/approvals/{approvalId}`

守卫角色：

- `PROJECT_FINANCE`
- `RD_ADMIN`
- `BUSINESS_ADMIN`
- `SYSTEM_ADMIN`

## 手工触发 — 常规审批（M05）

运维向接口：受 `nexa.timesheet.manual-triggers-enabled` 控制；守卫角色仅 `SYSTEM_ADMIN`。前端入口 `/timesheet/admin/ops/triggers` →「3. 常规审批超时（联调）」。

- `POST /timesheet/rd/approval-trigger/expire-deadline-one`
  - Query: `approvalId` — 仅将截止时刻置为过去；详情 `isLocked=true`，仍为 `PENDING`，不自动结案
- `POST /timesheet/rd/approval-trigger/expire-deadline-batch`
  - Query: `batchId` — 该研发周批次下全部 `PENDING` 审批单批量提前截止（不自动结案）
- `POST /timesheet/rd/approval-trigger/timeout`
  - 扫描 `status=PENDING` 且 `approvalDeadline <= now` 的审批单，按当前填报值自动结案（与 `RdApprovalTimeoutScheduler` 同源）
- `POST /timesheet/rd/approval-trigger/timeout-one`
  - Query: `approvalId` — 强制单张系统结案；**不校验**截止时间，状态非 `PENDING` 时静默跳过
- `POST /timesheet/rd/approval-trigger/timeout-batch`
  - Query: `batchId` — 对该研发周批次下全部 `PENDING` 审批单按工时空/非空规则强制系统结案；**不校验** `approvalDeadline`；非 `RD_WEEKLY` 批次直接 no-op
- `POST /timesheet/rd/approval-trigger/supplement-todos`
  - 对仍未到审批截止的 `PENDING` 研发审批单查漏补缺推送 Leader 钉钉待办（与 `RdApprovalSupplementScheduler` 待办同步同源；`businessTaskId` 幂等）

定时任务：`RdApprovalTimeoutScheduler`（`0 * * * * ?`）；`RdApprovalSupplementScheduler`（每日 9:00 补充统计 + 待办同步）。

## 修改审批（M06）`/timesheet/rd/modify-approvals`

Story 2.3 起提供 Leader 只读查询；Story 2.4 提交；Story 2.5 超截止系统自动处理（调度 + 手工 trigger）。

- `GET /timesheet/rd/modify-approvals`
  - Query: `projectName`（模糊）、`weekStart`（申报周周一，`YYYY-MM-DD`）、`stage`（`RdModifyApprovalStage`）、`pageable`
  - 数据范围：当前登录人作为 `leaderId` 的审批单
  - 默认排序：`PENDING` 优先，同组内按 `deadline ASC`（与 M05 研发工时审批列表一致）
  - 列表行 `RdModifyApprovalListItemVo`：`projectName` / `reportingWeekStart` / `reportingWeekEnd` / `weekBatch` / `belongingMonth` / `firstFillRate` / `secondFillRate` / `deadline` / `stage` / `submittedAt`（继承 `BaseDto`）
- `GET /timesheet/rd/modify-approvals/{id}`
  - 响应 `RdModifyApprovalDetailVo`：
    - 表头：`projectName` / `projectManager:UserDto` / `leader:UserDto` / `reportingWeekStart` / `reportingWeekEnd` / `weekBatch` / `belongingMonth` / `firstFillRate` / `secondFillRate` / `deadline` / `stage` / `decisionSource` / `createdAt`（继承 `BaseDto`）
    - 标志位：`readOnly`（终态或超截止）、`submittable`（当前用户 = leader 且未只读）
    - 明细：平铺 `items: List<RdModifyApprovalDetailItemVo>`，按 `sourceDomain ASC, workDate ASC` 排序
    - 明细字段：`member:UserDto`（成员结构化对象，BE 解析失败时为 null）、`sourceDomain`、`workDate`（仅 MFG 非空）、`originalHours`、`modifiedHours`（成员未提交时为 null）、`modifiedRemark`、`attendanceHoursSnapshot`、`weekRatio` / `monthRatio` / `budgetRatio` / `overrun`、`modifyApprovalStatus`、`modifyApprovalRemark`
  - 非 Leader 可查看详情，但 `submittable=false`
- `POST /timesheet/rd/modify-approvals/{id}/submit`
  - Body: `RdModifyApprovalSubmitParam`（`rdItems` + `mfgItems`；MFG 不通过时 `rejectedDates`）
  - 响应：提交后 `RdModifyApprovalDetailVo`（`readOnly=true`）
  - 仅 Leader、且 `PENDING` 且未过 `deadline`；终态或超截止返回 `COMMON_OPERATION_NOT_ALLOWED`

## 手工触发 — 修改审批（M06）

运维向接口：受 `nexa.timesheet.manual-triggers-enabled` 控制；守卫角色仅 `SYSTEM_ADMIN`（配置于 `NexaProperties.admin.users`）。

- `POST /timesheet/rd/modify-approval-trigger/generate`
  - Query: `batchId` — 按批次生成修改审批单
- `POST /timesheet/rd/modify-approval-trigger/timeout`
  - 扫描 `stage=PENDING` 且 `deadline <= now` 的审批单，按 §2.8 默认规则自动处理
- `POST /timesheet/rd/modify-approval-trigger/timeout-one`
  - Query: `approvalId` — 单张审批单自动处理（冒烟）
- `POST /timesheet/rd/modify-approval-trigger/timeout-batch`
  - Query: `batchId` — 对该研发周批次下全部 `PENDING` 修改审批单按 §2.8 默认规则强制自动处理；**不校验** `deadline`

定时任务：`RdModifyApprovalTimeoutScheduler`（`0 */5 * * * ?`，`ts-rd-modify-approval-timeout` ShedLock）。

## Leader — 研发月度审批（M07B Story 2.1）

路径前缀 `/timesheet/rd-monthly-approvals`；仅返回 `leader_id == 当前登录用户` 的审批单。

- `GET /timesheet/rd-monthly-approvals`
  - Query: `belongingMonth`（`YearMonth`）、`stage`（`MonthlyApprovalStage`）、分页（默认 `createdAt DESC`）
  - 响应 `PagedDataDTO<RdMonthlyApprovalListItemVo>`
- `GET /timesheet/rd-monthly-approvals/{id}`
  - 响应 `RdMonthlyApprovalDetailVo`：含 `readOnly` / `submittable`、按 `memberId` 升序的汇总明细；成员姓名经 `UserResolver` 批量解析；**不**重算考勤快照
  - **`leader` 字段（admin 视图回显「创建人」用）**：与成员 ID 一并由 `UserResolver.resolveBatch` 解析，`leaderId` 为空时返回 `null`。Leader 视图按需消费即可，向后兼容
- `GET /timesheet/rd-monthly-approvals/{id}/members/{memberId}/ledger-details`
  - 响应 `List<MonthlyApprovalLedgerDetailVo>`：拉取该成员当月月审范围内研发台账行；**待审批**（`stage=PENDING`）时仅 `ledger_display_status=PENDING_MONTHLY_APPROVAL`；**已提交/已自动处理**（终态）时扩展为 `PENDING_MONTHLY_APPROVAL` / `COMPLETED` / `REJECTED`，以便审批完成后仍可回看明细；范围均为非直管或非项目（与 BR-RN-005 一致）；排序为周区间升序 → 同周申报日升序（BR-RN-012）
  - 鉴权：非本单 Leader → `PERMISSION_DENIED`；`memberId` 不在本单明细 → `COMMON_INVALID_ARGUMENT`；id 不存在 → `ENTITY_NOT_FOUND`
- `POST /timesheet/rd-monthly-approvals/{id}/submit`
  - Body: `RdMonthlyApprovalSubmitParam`（`items[]`：每行 `detailId`、`decision`（`APPROVED`/`REJECTED`）、`rejectedWeeks`（不通过时必填）、`remark`（不通过时必填、通过时可选，≤500 字））
  - **`rejectedWeeks[].totalHours` 精度约束（Story 2.2 P5）**：1 位小数（落库前由服务端 `normalizeRejectedWeeks` 按 PENDING_MONTHLY_APPROVAL 行 `effectiveHours` 重算 + `setScale(1, HALF_UP)`）；客户端传入的 `totalHours` / `weekLabel` 一律以服务端推导为准，DTO 层 `@PositiveOrZero` + `@Digits(integer=10, fraction=1)` 仅作 API 第一道防御
  - **`rejectedWeeks[].weekLabel` 展示**：服务端落库为周区间 `yyyy-MM-dd ~ yyyy-MM-dd`（与台账 `weekInterval` 一致）；前端展示对历史 ISO 周码（如 `2026W23`）按 `weekStart` 回退推导区间
  - **并发控制（Story 2.2 D1）**：Redisson 锁 `nexa:timesheet:rd-monthly-approval-submit:{approvalId}`，`tryLock(0, 30s)` fast-fail；并发提交立即返回 `COMMON_OPERATION_NOT_ALLOWED("审批正在处理中，请稍后重试")`
  - 响应：提交后 `RdMonthlyApprovalDetailVo`（`readOnly=true`）
  - 前置：`stage=PENDING` 且 `now <= deadline`；否则 `COMMON_OPERATION_NOT_ALLOWED`；非 Leader → `PERMISSION_DENIED`
  - **stage 状态机后置防御（Story 2.2 D8）**：极端竞态下 `validateSubmit` 通过但 `stage.submit()` 抛 `IllegalStateException` 时翻译为 `COMMON_OPERATION_NOT_ALLOWED("审批单状态已变更，请刷新后重试")`，不暴露 5xx
  - 台账：`RdMonthlyApprovalLedgerWriter.applyManualDecisions` — 通过则成员当月全部待月审行 → `COMPLETED`；不通过则勾选周次 → `REJECTED`（写入 `approvalRemark`），未勾选周次 → `COMPLETED`（与超截止 `applyAutoComplete` 按周分流语义一致）
  - 提交成功后 after-commit 撤回钉钉待办（`dismissRdMonthlyApprovalTodo`）

## 管理员 — 研发月度审批（M07B Story 3.1）

路径前缀 `/timesheet/admin/rd-monthly-approvals`；**不**按当前登录用户过滤 `leader_id`（与 Leader 列表区分）。

守卫角色：`PROJECT_FINANCE` / `RD_ADMIN` / `BUSINESS_ADMIN` / `SYSTEM_ADMIN`（与修改审批管理员列表一致）。

- `GET /timesheet/admin/rd-monthly-approvals`
  - Query: `belongingMonth`（`yyyy-MM`）、`stage`（`MonthlyApprovalStage`）、`leaderId`（可选）、分页（默认 `createdAt DESC`）
  - 响应 `PagedDataDTO<AdminRdMonthlyApprovalListItemVo>`（列表行在 `RdMonthlyApprovalListItemVo` 基础上增加 `leader`，经 `UserResolver` 批量解析）
- `GET /timesheet/admin/rd-monthly-approvals/{id}`
  - 响应 `RdMonthlyApprovalDetailVo`（字段与 Leader 详情一致；`leader` 字段供 admin 视图展示「创建人」）
  - **`submittable` 恒为 `false`**（禁止管理员代提交）；不要求当前用户为 `leader_id`
  - id 不存在或已软删 → `ENTITY_NOT_FOUND`
- `GET /timesheet/admin/rd-monthly-approvals/{id}/members/{memberId}/ledger-details`
  - 响应 `List<MonthlyApprovalLedgerDetailVo>`，字段、排序与 Leader 端 `/timesheet/rd-monthly-approvals/{id}/members/{memberId}/ledger-details` 一致
  - 复用 `RdMonthlyApprovalService.listMemberLedgerDetails(approvalId, memberId, currentUserId=null)`，admin 路径跳过 Leader 校验
  - 权限由 `@PreAuthorize` 限制为上述四个 admin 角色；`memberId` 不在本单明细 → `COMMON_INVALID_ARGUMENT`；id 不存在 → `ENTITY_NOT_FOUND`
- `POST /timesheet/admin/rd-monthly-approvals/batch-delete`
  - 守卫：仅 `SYSTEM_ADMIN`
  - Body: `BatchUuidIdsParam` — 软删 `TsMonthlyApproval` 主表及全部明细；`PENDING` 态同步撤回钉钉待办
  - 返回：`MasterBatchDeleteResultVo`（`deleted` = 实际软删主表数量）

## 手工触发 — 月度审批（M07B）

运维向接口：受 `nexa.timesheet.manual-triggers-enabled` 控制；守卫角色 `PROJECT_FINANCE` / `RD_ADMIN`。

- `POST /timesheet/rd-monthly-approval-trigger/generate`
  - Query: `yearMonth`（`yyyy-MM`）— 按月份生成研发月度审批单，按推送部门配置遍历直管子部门 Leader，聚合本月待月审与直管已完成的研发台账行落库并推送钉钉待办
  - 响应 `RdMonthlyApprovalGenerateResultVo`：`createdCount`（成功生成）、`skippedCount`（合计跳过：锁忙 / 已存在活跃审批单 / uniq race），跳过分桶通过日志区分
  - 行为：
    - 每个 Leader 维度独立尝试，单 Leader 失败不影响整月 — 通过 `RedissonLockSupport` 加锁，已有活跃单或拿不到锁则跳过
    - 钉钉待办通过 `MfgTodoPushClient.notifyRdMonthlyApprovalPending` 在事务提交后异步发送
    - 部门成员/直接子部门/Leader/部门名称解析失败仅记录 warn 并跳过该子部门，不会终止整月生成
    - 配置 `rd-monthly-approval-push-departments` 异常加载会被转为 `NexaException(CONFIG_VALUE_INVALID)`
    - **考勤数据源**（Sprint Change 2026-05-25）：从台账 `TsLedgerProjection.attendanceHours` 聚合，按 `(memberId, batchId)` 取 `MAX` 作为该周代表值，再按 memberId SUM 得月度考勤；不再实时调用 MK。某周 attendanceHours 为 NULL（RD 申请未拉过考勤）则该周跳过累加，全月皆无数据时 `detail.attendanceHours = NULL` 与 `nonProjectRatio = NULL`
    - **非项目工时占比**（`nonProjectRatio`）：`monthNonProjectHours ÷ attendanceHours`；考勤为空/0 时为 NULL；前端取整展示百分比
- `POST /timesheet/rd-monthly-approval-trigger/auto-complete-overdue`（Story 2.3）
  - 可选查询参数 `yearMonth=yyyy-MM`：
    - 不传 / 空白：扫描所有 `stage=PENDING AND deadline <= now`，与 `RdMonthlyApprovalTimeoutScheduler` 同源
    - 传具体月份：在前述条件上叠加 `belongingMonth = :yearMonth`，用于运营按月定向补跑（触发面板 UI 入口）
  - 逐单 Redisson 锁 `nexa:timesheet:rd-monthly-approval-auto:{approvalId}` 自动结案
  - 响应 `RdMonthlyApprovalAutoCompleteResultVo`：`processedCount` / `skippedCount` / `failedCount`
  - 台账：`RdMonthlyApprovalLedgerWriter.applyAutoComplete` — 逐条 `effective_hours` 已填报（含显式 `0`）→ `COMPLETED`（remark=`超截止自动通过`），`null`（未填报）→ `REJECTED`（remark=`超截止自动不通过（工时为空）`）；主表 `AUTO_COMPLETED` + `decisionSource=AUTO`；after-commit `dismissRdMonthlyApprovalTodo`

## 管理员视图 — 批量软删

守卫角色：**仅** `SYSTEM_ADMIN`（与列表 GET 角色集不同）。

- `POST /timesheet/admin/rd/approvals/batch-delete`
  - Body: `BatchUuidIdsParam`（`ids[]` = 审批主表 ID）— 软删 `TsApprovalHeader`
- `POST /timesheet/admin/ledger/rd/batch-delete`
  - Body: `BatchUuidIdsParam` — 软删研发域 `TsLedgerProjection`（校验 `domain=RD`）
- `POST /timesheet/admin/ledger/mfg/batch-delete`
  - Body: `BatchUuidIdsParam` — 软删制造域 `TsLedgerProjection`（校验 `domain=MFG`）
- `POST /timesheet/admin/rd/modifies/batch-delete`
  - Body: `BatchUuidIdsParam`（`ids[]` = 修改单主表 ID）— 软删 `TsRdModify` 及明细
- `POST /timesheet/admin/rd/modify-approvals/batch-delete`
  - Body: `BatchUuidIdsParam`（`ids[]` = 修改审批主表 ID）— 软删 `TsRdModifyApproval` 及明细
- `POST /timesheet/admin/rd-monthly-approvals/batch-delete`
  - Body: `BatchUuidIdsParam`（`ids[]` = 月度审批主表 ID）— 软删 `TsMonthlyApproval` 及明细

## 说明

- 审批详情既包含研发明细，也可能包含纳入本期审批的制造聚合信息
- 具体审批归集边界见 `design/business-rules.md`
