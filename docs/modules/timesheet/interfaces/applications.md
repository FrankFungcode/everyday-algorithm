# timesheet — 申请单接口

## 工时精度（BR-RM-012 / M06 S-01）

当前数据库列仍保持既有精度（工时相关列为 `DECIMAL(10,2)`）；应用层保存/提交入参与前端输入统一收口为 **最多 1 位小数**。制造与研发考勤快照从 MK 聚合时保留原始精度，写库前 **四舍五入至 0.1h（HALF_UP）**（`WorkHoursScaleSupport`），避免界面 `toFixed(1)` 与库内 8.06/8.10 不一致。对应 Body：

- `RdApplicationSaveParam.items[].workHours`：`@Digits(integer=8, fraction=1)`（可与 `@PositiveOrZero` 并存；整数位与 `DECIMAL(10,2)` 容量对齐）
- `MfgApplicationSaveParam.items[].workHours`、`SupplementSaveParam.items[].workHours`：同上  

不合精度返回校验错误（与全局 `MethodArgumentNotValidException` 处理一致）。
制造员工提交、主管补填提交与补填自动提交会在写入台账前复核已落库明细，拒绝多于 1 位小数的 `workHours`。

## 制造申请 `/timesheet/mfg/applications`

- `GET /timesheet/mfg/applications`
  - Query: `reportingDate`, `stage`, `pageable`
- `GET /timesheet/mfg/applications/{batchId}`
- `PUT /timesheet/mfg/applications/{batchId}`
  - Body: `MfgApplicationSaveParam`
  - 明细项 `MfgApplicationItemSaveItem` 含 `assetCode` / `assetName`（目标部门可写；选资产后 Service 绑定「设备投入」并清空项目，工厂由前端按产品联动选择）
- `POST /timesheet/mfg/applications/{batchId}/submit`
  - Body: `MfgApplicationSaveParam`（与 `PUT save` 相同；**同一事务**内先持久化草稿再校验迁态，与研发 submit 对齐，避免 save/submit 双请求竞态）
  - 响应：`MfgApplicationDetailVo`（提交后详情，含迁态后的 `stage`）
  - 业务校验之一：当日每一参与项目须至少在一条明细上出现（与是否系统预填无关）；**只统计 `projectId != null` 的行**，资产行不能替代项目行
  - 业务校验之二：已填 `assetCode` 的行须 factory + 产品「设备投入」、禁止 project；同一单内 assetCode 不可重复（「资产编码重复」）；对每个非空编码调用 MK 校验启用（BR-MA-024），停用则拒绝并提示「第 {n} 行资产编码已停用，请重新选择后再提交」
  - 不满足项目覆盖时返回业务错误「每个参与项目至少需要一条对应明细，请补充后提交或刷新页面后重试」
- `POST /timesheet/mfg/applications/{batchId}/decline`
- `GET /timesheet/mfg/applications/{batchId}/attendance`
- `GET /timesheet/mfg/applications/{batchId}/reuse-previous`
  - 仅当前批次可编辑（`PENDING_FILL` / `FILLING` / `SUPPLEMENTING`）时可用；只读，不落库
  - 上一工作日 = `CalendarClient.previousWorkingDay(当前批次 reportingDate)`；上一日申请须 `stage ∈ {PENDING_APPROVAL, FINISHED_NO_REVIEW, APPROVED, DECLINED}`（**不含** `REJECTED`）
  - 未提交或上一日无批次：业务错误 `COMMON_OPERATION_NOT_ALLOWED`，文案「上一工作日（{date}）尚未提交，请先处理前一个工作日的数据」
  - 已提交但上一日无可复用数据：`items` 与 `appendItems` 均为空时 HTTP 200 + `previousReportingDate`；前端轻提示「上一工作日无可复用的手工明细」
  - 响应 `MfgReusePreviousVo`：`previousReportingDate`；`items[]` 为上一日**手工**项目行中与本日系统预填 `projectId` 匹配的 `MfgReusePreviousItemVo`（无 `id` / `workHours`）；前端写入本日 `isSystemGenerated && projectId` 行的工厂/工作内容；`appendItems[]` 为上一日其余手工行（非项目，或无本日系统预填行的项目手工行），前端在表尾追加；已追加行再次点击不重复

返回：

- 列表：`PagedDataDTO<MfgApplicationListItemVo>`
- 详情：`MfgApplicationDetailVo`（明细项 `MfgApplicationItemVo` 含 `assetCode` / `assetName`，可为 null；考勤快照标量来自库内；`attendanceInfo` 来自 `ts_mfg_application_states.attendance_info` 快照，不阻塞 MK）
- 刷新：`MfgAttendanceRefreshVo`（含 `attendanceAvailableHours`、`regularHours`、`overtimeHours`、`approvedLeaveHours`、`ehrAttendanceHours`、`attendanceInfo`、`attendanceChanged`、`mkRefreshFailed` 等；填报窗内 MK 成功时落库标量并覆盖 `attendance_info`）
- 前端：工作日且库内考勤可用时长 &lt; 8 时进入详情才自动调用 refresh；正常时不自动拉 MK；用户可手动调用 refresh
- 复用上一工作日：`MfgReusePreviousVo` + `MfgReusePreviousItemVo[]`

## 研发申请 `/timesheet/rd/applications`

- `GET /timesheet/rd/applications`
  - Query: `weekStart`, `belongingMonth`, `stage`, `pageable`
- `GET /timesheet/rd/applications/{batchId}`
- `PUT /timesheet/rd/applications/{batchId}`
  - Body: `RdApplicationSaveParam`
- `POST /timesheet/rd/applications/{batchId}/submit`
  - Body: `RdApplicationSaveParam`
- `GET /timesheet/rd/applications/{batchId}/attendance`
- `GET /timesheet/rd/modifies/{id}/attendance`

返回：

- 列表：`PagedDataDTO<RdApplicationListItemVo>`
- 详情：`RdApplicationDetailVo`（含 `applicant: UserDto`、`submittedAt` 提交时间、`isLocked` 截止锁定或填报窗口关闭时为 true）
- 刷新：`AttendanceSummaryVo`（研发申请/修改单均优先读 `ts_employee_daily_attendances` 本地缓存；未命中日期回落 MK 日考勤；任一日失败时返回 `attendanceHours=null`、`attendanceFetchFailed=true`，不写库）

## 研发工时修改单 `/timesheet/rd/modifies`

- `GET /timesheet/rd/modifies`
  - Query: `weekStart`, `belongingMonth`, `stage`, `pageable`
- `GET /timesheet/rd/modifies/{id}`
- `GET /timesheet/rd/modifies/{id}/attendance`
- `POST /timesheet/rd/modifies/{id}/submit`
  - Body: `RdModifySubmitParam`（`items[].detailId`、`items[].modifiedHours`、`items[].modifiedRemark` 均必填）
  - 考勤快照（`attendance_hours_snapshot`）为 null 时拒绝提交；须先 `GET .../attendance` 刷新落库

返回：

- 列表：`PagedDataDTO<RdModifyListItemVo>`
- 详情：`RdModifyDetailVo`（含 `applicant: UserDto`、`reportingWeekStart` / `reportingWeekEnd` 申报周日期区间、`submittedAt`，表头与研发申请单一致；`comparison` 含项目/非项目工时汇总、项目投入占比、工时对比状态）

## 手工触发 — 批次生成

受 `nexa.timesheet.manual-triggers-enabled` 控制。

- `POST /timesheet/mfg/generation/trigger/scheduled`
  - Query: `asOf`
- `POST /timesheet/mfg/generation/trigger/todo-notify`
  - Query: `asOf`
- `POST /timesheet/mfg/generation/trigger/fill-reminder`
  - Query: `asOf` — 与工作日 17:00 `MfgFillReminderScheduler` 同逻辑；覆盖 `PENDING_FILL` / `FILLING` 且未提交；仅工作通知，不新建待办
- `POST /timesheet/mfg/generation/trigger/daily`
  - Query: `reportingDate`
- `POST /timesheet/rd/generation/trigger/scheduled`
  - Query: `asOf`
- `POST /timesheet/rd/generation/trigger/weekly`
  - Query: `reportingWeekStart`

## 手工触发 — 研发锁定

同样受 `nexa.timesheet.manual-triggers-enabled` 控制。

- `POST /timesheet/rd/lock-trigger/lock-due`
- `POST /timesheet/rd/lock-trigger/lock-batch`
  - Query: `batchId`

## 手工触发 — 研发修改单生成

同样受 `nexa.timesheet.manual-triggers-enabled` 控制。

- `POST /timesheet/rd/modify-trigger/generate`
  - Query: `batchId`

## 管理员视图 — 批量软删

守卫角色：**仅** `SYSTEM_ADMIN`（与列表 GET 角色集不同；普通管理员可查询但不可软删）。响应体均为 `MasterBatchDeleteResultVo`（`deleted` = 实际软删行数）。

- `POST /timesheet/admin/rd/applications/batch-delete`
  - Body: `AdminApplicantBatchDeleteParam`（`items[]`: `batchId` + `applicantId`）— 软删该批次下该申请人全部研发申请明细
- `POST /timesheet/admin/mfg/applications/batch-delete`
  - Body: 同上 — 软删制造申请明细及 `TsMfgApplicationState`（若存在）
- `POST /timesheet/admin/rd/modifies/batch-delete`
  - Body: `BatchUuidIdsParam`（`ids[]` = 修改单主表 ID）— 软删 `TsRdModify` 及关联 `TsRdModifyDetail`；`DRAFT` 时同步撤销填修改待办
- `POST /timesheet/admin/rd/modify-approvals/batch-delete`
  - Body: `BatchUuidIdsParam`（`ids[]` = 修改审批主表 ID）— 软删 `TsRdModifyApproval` 及关联 `TsRdModifyApprovalDetail`；`PENDING` 时同步撤销审批待办
- `POST /timesheet/rd/modify-trigger/lock-due`
  - 扫描修改截止已过、仍处于 `DRAFT/SUBMITTED` 的修改单批量锁定并写入台账；**锁单不刷新考勤**，使用库内 `attendance_hours_snapshot`
- `POST /timesheet/rd/modify-trigger/lock`
  - Query: `modifyId` — 单张修改单锁定（不校验截止时间；幂等，LOCKED 时跳过；不刷新考勤）
- `POST /timesheet/rd/modify-trigger/lock-batch`
  - Query: `batchId` — 对该研发周批次下全部未锁定（`DRAFT/SUBMITTED`）修改单强制锁定并写入台账；**不校验** 截止时间；不刷新考勤

## 管理员视图

### 制造

- `GET /timesheet/admin/mfg/applications`
- `GET /timesheet/admin/mfg/applications/{batchId}`

守卫角色：

- `MFG_ADMIN`
- `RD_ADMIN`
- `BUSINESS_ADMIN`
- `SYSTEM_ADMIN`

### 研发

- `GET /timesheet/admin/rd/applications`
- `GET /timesheet/admin/rd/applications/{batchId}`
- `GET /timesheet/admin/rd/modifies`
  - Query: `memberId`, `weekStart`, `belongingMonth`, `stage`, `pageable`
- `GET /timesheet/admin/rd/modifies/{id}`
- `GET /timesheet/admin/rd/modify-approvals`
  - Query: `projectName`, `weekStart`, `belongingMonth`, `stage`, `leaderId`, `pageable`
  - 默认排序：`PENDING` 优先，同组内按 `deadline ASC`
- `GET /timesheet/admin/rd/modify-approvals/{id}`
- `GET /timesheet/admin/rd-monthly-approvals`（M07B Story 3.1，契约见 [`approvals.md`](approvals.md)）
- `GET /timesheet/admin/rd-monthly-approvals/{id}`

守卫角色：

- `PROJECT_FINANCE`
- `RD_ADMIN`
- `BUSINESS_ADMIN`
- `SYSTEM_ADMIN`

返回：

- 修改单列表：`PagedDataDTO<AdminRdModifyListItemVo>`（含 `member`）
- 修改单详情：`RdModifyDetailVo`（只读，无成员归属校验）
- 修改审批列表：`PagedDataDTO<AdminRdModifyApprovalListItemVo>`（含 `leader`）
- 修改审批详情：`RdModifyApprovalDetailVo`（`submittable=false`）

## 说明

- 自助接口走业务字段过滤；管理员全量视图走 `/timesheet/admin/**`
- 研发 `submit` 与 `save` 的请求体相同；制造 `submit` 亦与 `save` 请求体相同（原子 save+submit），`PUT save` 仍仅保存草稿
- 手工触发接口关闭时统一返回业务错误，不单独暴露底层开关实现细节
- 研发修改单列表仅返回当前登录人自己的修订任务，不混入管理员视角
