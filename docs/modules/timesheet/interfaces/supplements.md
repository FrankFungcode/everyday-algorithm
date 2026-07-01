# timesheet — 补填与催办接口

## 月度补填 `/timesheet/monthly-supplements`（M07A）

- `GET /timesheet/monthly-supplements`
  - Query: `belongingMonth`（yyyy-MM）, `stage`, `pageable`（默认 `size=20`，`sort=createdAt,desc`；最大 `size=100`）
  - 返回当前用户分页列表 `PagedDataDTO<MonthlySupplementListItemVo>`
- `GET /timesheet/monthly-supplements/{id}`
  - 返回 `MonthlySupplementDetailVo`（表头 + 明细）
  - `DRAFT` 态打开时逐行刷新 `attendance_hours`；`SUBMITTED` / `LOCKED` 返回库内快照
  - 非本人 → `PERMISSION_DENIED`
- `POST /timesheet/monthly-supplements/{id}/submit`
  - Body: `MonthlySupplementSubmitParam{ items: [{ detailId, supplementHours, remark }] }`
  - 返回提交后的只读 `MonthlySupplementDetailVo`；台账回写为 `COMPLETED`；研发台账另写 `submit_source = MONTHLY_SUPPLEMENT`，制造台账保留原 `submit_source`
  - **提交不再刷新考勤**，以打开详情页时已落库的快照为准
  - 校验顺序：权限 → 状态（仅 DRAFT）→ 明细 1:1 → 补填工时精度/必填 → 研发域（`LedgerDomain.RD`）补填备注必填 → BR-RN-013 红绿灯（过审工时为 NULL 时在比较中视为 `0`；无 `batchId`/`workDate` 无法聚合时跳过）
  - 重复提交 → `COMMON_OPERATION_NOT_ALLOWED`

### `MonthlySupplementDetailVo` 关键字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `applicant` | `UserDto` | 申请人 org 信息（含 `parentDepartments` / `position`），表头展示用 |
| `readOnly` | `boolean` | 终态（`SUBMITTED` / `LOCKED`）= true，前端禁用编辑 |
| `attendanceChanged` | `Boolean` | DRAFT 态：本次打开与上次保存相比是否有任一行考勤变化（仅 DRAFT 有意义） |
| `attendanceFetchFailed` | `Boolean` | DRAFT 态：任一行考勤拉取失败（MK 异常 / 空快照 / RD 批次缺失）；保留上次值且**不阻塞**详情加载（Q4 默认口径） |
| `items[].batchId` | `String` | 关联批次 ID；前端按 BR-RN-013 红绿灯口径按 `batchId`（研发）/`workDate`（制造）聚合校验 |
| `items[].reportingWeekStart` | `LocalDate` | 申报周周一（从 `TsBatch` 补齐）；明细表「申报时间」研发展示为 `start ~ end` |
| `items[].reportingWeekEnd` | `LocalDate` | 申报周周日（从 `TsBatch` 补齐） |
| `items[].projectSimpleName` | `String` | 项目简称（从 `TsProject.projectSimpleName` 实时补齐；前端缺省时回退 `projectName`） |
| `items[]` 排序 | — | 研发域：`reportingWeekStart` **降序**（最新周置顶）→ 同周 `projectName` 升序 → `id`；制造域：`workDate` **降序** → `projectName` 升序 → `id` |

红绿灯（`pass` / `fail` / `none`）由前端按 BR-RN-013 计算，后端不下发灯态字段。后端在 Story 1.4 的 submit 接口仍会做权威校验。

手工触发（生成 / 锁定）见下方「月度补填手工触发」。

## 制造补填 `/timesheet/mfg/supplements`

- `GET /timesheet/mfg/supplements`
  - Query: `startDate`, `endDate`, `pageable`
- `GET /timesheet/mfg/supplements/detail`
  - Query: `supervisorId`, `batchDateStart`, `batchDateEnd`
  - 明细项 `SupplementItemVo` 含 `assetCode` / `assetName`（可为 null；Story 1.1 起只读返回）
- `PUT /timesheet/mfg/supplements/members/{memberId}/batches/{batchId}`
  - Body: `SupplementSaveParam`（明细 `SupplementItemSaveItem` 含 `assetCode` / `assetName`；目标部门被补填人 scope 内时与 M02 资产行保存规则一致）
- `GET /timesheet/mfg/supplements/members/{memberId}/batches/{batchId}/attendance`
- `POST /timesheet/mfg/supplements/members/{memberId}/submit`
  - Query: `batchDateStart`, `batchDateEnd`
  - 业务校验之一（与自助提交对齐）：当日每一参与项目须至少在一条明细上出现（与是否系统预填无关）
  - 资产行：须 factory + 产品「设备投入」、禁止 project；同一单内 assetCode 不可重复；提交前校验 MK 启用状态（BR-MA-024）（BR-MA-020 / BR-MA-023）
- `POST /timesheet/mfg/supplements/delegate`
  - Body: `SupplementDelegateParam`

## 经理催办 `/timesheet/mfg/reminders`

- `GET /timesheet/mfg/reminders`
  - Query: `managerId`, `pageable`
- `GET /timesheet/mfg/reminders/detail`
  - Query: `managerId`, `batchDateStart`, `batchDateEnd`
- `POST /timesheet/mfg/reminders/urge`
  - Body: `UrgeParam`
  - 返回：`UrgeResultVo`

说明：

- 自助催办接口中的 `managerId` 主要做兼容保留，实际以当前登录人作为经理身份锚点

## 手工触发

受 `nexa.timesheet.manual-triggers-enabled` 控制。

- `POST /timesheet/mfg/supplement-trigger/promote`
- `POST /timesheet/mfg/supplement-trigger/promote-daily`
  - Query: `reportingDate` — 仅推进指定申报日下「申报截止已过仍未提交」的制造明细（与定时任务同逻辑，限定单日）
- `POST /timesheet/mfg/supplement-trigger/auto-submit`
- `POST /timesheet/mfg/supplement-trigger/lock-daily`
  - Query: `reportingDate` — 对指定申报日下全部 `SUPPLEMENTING` 申请执行自动提交（**不校验**补填截止；联调强制锁定）
- `POST /timesheet/mfg/supplement-trigger/auto-submit-daily`
  - Query: `reportingDate` — 仅处理该申报日且批次 `supplement_deadline` 已过的补填中申请
- `POST /timesheet/mfg/reminder-trigger/generate`

## 月度补填手工触发 `/timesheet/monthly-supplement-trigger`

受 `nexa.timesheet.manual-triggers-enabled` 控制。

- `POST /timesheet/monthly-supplement-trigger/generate`
  - Query: `yearMonth`（yyyy-MM）
  - 取数：`belonging_month = yearMonth` 且 `ledger_display_status = REJECTED`（M05 工时审批、M06 修改审批、M07B 月度审批等驳回来源统一汇总；不按 `modify_approval_status` 排除 M06 路径）
- `POST /timesheet/monthly-supplement-trigger/lock`
  - Query: `yearMonth`（yyyy-MM）
  - 守卫：仅 `RD_ADMIN`（类级允许 `PROJECT_FINANCE` / `RD_ADMIN`，锁定接口方法级收窄）
  - 返回：`NexaResponse<Integer>` 本次锁定数量（可为 0；为 0 时 `message=「当月无可锁定补填单」`）
  - 错误：非 `RD_ADMIN` → `PERMISSION_DENIED`；`nexa.timesheet.manual-triggers-enabled=false` → `BUSINESS_ERROR`
  - 幂等：仅 `DRAFT` 单被处理，`SUBMITTED` / `LOCKED` 自然跳过；同月份重复调用返回新增锁定数量（首次后通常为 0）
  - 并发：Redisson 互斥锁 `nexa:timesheet:monthly-supplement-lock:{yearMonth}`，并发实例第二个调用快速返回 0；每张单独立事务，单条失败记日志不阻断批次

## 管理员月度补填 `/timesheet/admin/monthly-supplements`（M07A Story 2.3）

守卫角色：`PROJECT_FINANCE` · `RD_ADMIN` · `BUSINESS_ADMIN` · `SYSTEM_ADMIN`（无权限 → `PERMISSION_DENIED`）

- `GET /timesheet/admin/monthly-supplements`
  - Query: `yearMonth`（yyyy-MM）, `memberId`, `stage`, `domain`, `pageable`（默认 `size=20`，`sort=createdAt,desc`；Application 层自动追加 `id desc` 平局键以保证跨页稳定）
  - 返回 `PagedDataDTO<AdminMonthlySupplementListItemVo>`（含 `memberName`、`lockedBy` 等管理员扩展字段）
- `GET /timesheet/admin/monthly-supplements/{id}`
  - 返回 `AdminMonthlySupplementDetailVo`（主表 + 全部明细；**不刷新考勤**；无成员本人限制）
  - 终态（`SUBMITTED`/`LOCKED`）明细若 `supplement_hours` 为空，从关联台账 `effective_hours`（`submit_source=MONTHLY_SUPPLEMENT`）回填展示；`V5.8.3` 迁移同步修复历史库内快照
- `POST /timesheet/admin/monthly-supplements/batch-delete`
  - 守卫：仅 `SYSTEM_ADMIN`
  - Body: `BatchUuidIdsParam` — 软删主表及全部明细；`DRAFT` 态同步撤回钉钉待办
  - 返回：`MasterBatchDeleteResultVo`（`deleted` = 实际软删主表数量）

## 管理员视图

- `GET /timesheet/admin/mfg/supplements`
- `GET /timesheet/admin/mfg/supplements/detail`
- `GET /timesheet/admin/mfg/reminders`
  - Query 中 `managerId` 为必填
- `GET /timesheet/admin/mfg/reminders/detail`
  - Query 中 `managerId` 为必填

守卫角色：

- `MFG_ADMIN`
- `RD_ADMIN`
- `BUSINESS_ADMIN`
- `SYSTEM_ADMIN`

## 说明

- 补填列表、详情、保存与提交的可见范围由业务字段决定，详细规则见 `design/business-rules.md`
- 手工触发接口与调度逻辑同源，只是暴露了联调入口
