# timesheet — 数据模型

本文档以当前代码与 Flyway 迁移为准，描述工时模块的一期稳定数据模型。

## 建模原则

- 全部实体继承 `BaseEntity`，统一使用 UUID 主键、审计字段与软删除。
- 业务表之间不使用 JPA 关联；跨表引用统一保存 `UUID` 或用户 id 字段，由 Service/Repo 显式查询。
- 申请、审批、台账均依赖生成列或自然键维持“同作用域唯一”。
- `work_hours` 与 `effective_hours` 允许为 `null`，表示“未填报”；与显式 `0` 区分。

## 批次 `ts_batches`

对应实体：`TsBatch`

- 批次类型：`RD_WEEKLY`、`MFG_DAILY`
- 共同字段：`reportingWeekStart`、`reportingWeekEnd`、`belongingMonth`
- 制造批次额外使用 `reportingDate`
- 截止类字段：`submissionDeadline`、`approvalDeadline`、`supplementDeadline`
- 休息日补生成批次通过 `isRestDay` 标记

唯一性：

- 研发周批次：通过生成列 `rd_week_uniq` + 唯一索引保证“一周一条”
- 制造日批次：按 `(type, reporting_date)` 唯一，不再复用 `reporting_week_start`

## 项目与主数据

### `ts_projects`

对应实体：`TsProject`

- 工时项目主表，保存项目编号、名称、经理、财务、状态等快照字段
- `project_code` 供编号验重与外部导入使用
- 经理、财务、财务负责人等字段均保存用户 id，不做实体关联

### `ts_project_members`

对应实体：`TsProjectMember`

- 保存成员、Leader、是否直管、参与状态与有效期
- `role_id` 可选，引用 `ts_member_roles`；`role` 列保留历史自由文本（存量不迁移）
- 是研发申请生成、审批归集、项目列表过滤的核心来源

### `ts_member_roles`

对应实体：`TsMemberRole`

- 项目成员角色主数据（代码、名称、启用状态）
- 预置：研发 / 制造 / 财务 / 维护（迁移 `V4.11`）
- 业务唯一：`role_code_active` / `role_name_active` 生成列（`deleted=0` 时才有值），软删后可重建同名角色（`V4.12`）

### `ts_project_change_logs`

对应实体：`TsProjectChangeLog`

- 保存项目主数据变更轨迹
- 用于项目修改历史与审计

### `ts_factories`

对应实体：`TsFactory`

- 工厂主数据，供制造工时填写与主数据维护使用

### `ts_products`

对应实体：`TsProduct`

- 产品主数据；制造正工时行要求填写 `productId`

### `ts_factory_products`

对应实体：`TsFactoryProduct`

- 工厂与产品的关联关系
- 制造保存/提交前用来校验“工厂与当前产品简称是否关联”

说明：

- 迁移中存在 `ts_project_factories` 表，但当前代码中没有 `TsProjectFactory` JPA 实体；以实际代码能力为准，不在当前稳定模型中单列实体。

## 研发申请 `ts_rd_applications`

对应实体：`TsRdApplication`

- 一行代表“成员在某周、某项目/非项目”的首轮研发工时申请明细
- 状态字段使用 `RdApplicationStage`
- 关键维度：`batchId`、`applicantId`、`projectId`、`leaderId`、`isDirectManaged`
- 考勤快照落在行上，由详情刷新接口或生成/锁定流程写回

生成列：

- `project_scope_key`
- `active_unique_token`

## 制造申请 `ts_mfg_applications`

对应实体：`TsMfgApplication`

- 一行代表“成员在某申报日、某项目/非项目、某工厂范围”的制造工时明细
- 状态字段使用 `MfgApplicationStage`
- 关键维度：`batchId`、`applicantId`、`projectId`、`factoryId`、`productId`
- 组织快照字段：`directSupervisorId`、`supplementHandlerId`、`plusTwoManagerId`（进入补填时写入，供催办过滤）
- 资产快照字段（M02）：`assetCode` VARCHAR(64) NULL、`assetName` VARCHAR(200) NULL；目标部门填报时写入，历史展示不随 MK 主数据变更

生成列：

- `project_scope_key`
- `active_unique_token`
- `factory_scope_key`

其中 `factory_scope_key` 保留为生成列：无工厂时统一映射到 `NO_FACTORY`。`V4.5` 起不再承载数据库唯一约束，“同工厂 + 同项目/非项目不可重复”的规则改由前端校验。

## 制造申请状态快照 `ts_mfg_application_states`

对应实体：`TsMfgApplicationState`

- 按成员 + 批次保存休息日是否工作、是否全天请假等辅助状态
- `attendance_info`（JSON）：MK/EHR 四类单据快照（签卡/请假/出差/调班 + 异常标记），与 `AttendanceInfoVo` 契约对齐
- `attendance_info_refreshed_at`：单据快照最后成功写入时间
- `fillTodoNotifiedAt`：填报钉钉待办已成功推送时间；`NULL` 表示待 8:00 推送（6:00 预生成落单后默认 null）
- 作为制造休息日填报、补填与自动提交的支撑表

## 审批主表 `ts_approval_headers`

对应实体：`TsApprovalHeader`

- 一行代表“某批次 + 某项目 + 某 Leader”的审批归集头
- 状态字段使用 `ApprovalHeaderStatus`
- 审批来源区分 `DecisionSource`
- 统计字段如 `totalHours`、`memberCount`、`firstFillRate` 由审批服务补齐

## 研发工时修改单

### `ts_rd_modifies`

对应实体：`TsRdModify`

- 一行代表“某成员在某 RD 周批次内”的工时修改单
- 状态字段使用 `RdModifyStage`：`DRAFT`、`SUBMITTED`、`LOCKED`
- 截止字段：`deadline`、`submittedAt`、`lockedAt`
- 活跃唯一性：通过 `active_unique_token` 生成列 + `(batch_id, member_id, active_unique_token)` 唯一键保证同一成员同一批次只有一条活跃修改单

### `ts_rd_modify_details`

对应实体：`TsRdModifyDetail`

- 一行代表修改单内的一条研发或供应链不通过来源明细
- 来源维度：`sourceDomain`（`RD` / `MFG`）与 `sourceApplicationId`
- 供应链明细额外保存 `workDate`
- 保存原申请工时/备注、上轮审批备注，以及成员填写的 `modifiedHours` / `modifiedRemark`
- 活跃唯一性：通过 `active_unique_token` 生成列 + `(modify_id, source_domain, source_application_id, active_unique_token)` 唯一键保证同一来源明细在修改单内只有一条活跃记录

### `ts_rd_modify_approvals`

对应实体：`TsRdModifyApproval`

- 一行代表「某 Leader + 某项目 + 某研发周批次」的修改审批任务
- 状态字段使用 `RdModifyApprovalStage`：`PENDING`、`COMPLETED`、`AUTO_COMPLETED`
- 终态来源：`DecisionSource`（`NONE` / `MANUAL` / `AUTO`）
- 统计字段：`firstFillRate`、`secondFillRate`、`totalHours`、`memberCount` 等由生成/刷新服务补齐
- 活跃唯一性：`(project_id, leader_id, batch_id, active_unique_token)` 唯一键

### `ts_rd_modify_approval_details`

对应实体：`TsRdModifyApprovalDetail`

- 一行代表修改审批单内某成员在某来源域下的一条审批明细（研发按申请行、制造按日聚合锚点）
- 关联修改单明细：`modifyDetailId`；台账回写锚点：`sourceLedgerId`
- 研发行 `work_date` 为 `NULL`；制造行保存 `work_date`
- 唯一键 `uniq_rd_modify_approval_detail` 含 `work_date` 列——MySQL 中 `NULL` 不参与唯一比较，故**对研发行该约束实际不生效**；幂等依赖审批单级查找 + ShedLock + 应用层校验（见 [`known-limitations.md`](known-limitations.md)）

## 月度补填单（M07A）

### `ts_monthly_supplements`

对应实体：`TsMonthlySupplement`

- 一行代表「某成员在某目标月份、某域（RD/MFG）」的月度补填任务
- 状态字段使用 `MonthlySupplementStage`：`DRAFT`、`SUBMITTED`、`LOCKED`
- 活跃唯一性：`(member_id, belonging_month, domain, active_unique_token)`（同成员同月同域仅一张活跃单）
- 乐观锁：`version` 字段（`@Version`），防止 submit 并发场景下台账双写与 stage 重复推进，冲突在 Application 层翻成 `COMMON_OPERATION_NOT_ALLOWED`
- 索引：`(stage, member_id)` 覆盖按成员查活跃单；`(stage, created_at)` 保障调度按提交时间顺序扫描 DRAFT 时走索引顺序，避免 filesort

### `ts_monthly_supplement_details`

对应实体：`TsMonthlySupplementDetail`

- 一行对应一条不通过台账（`ledger_id` → `ts_ledger_projections.id`），不直接挂申请单
- 保存原工时/备注快照、过审工时参考（`weekly_approved_hours` / `daily_approved_hours`）、成员补填 `supplement_hours` / `remark`
- 活跃唯一性：`(supplement_id, ledger_id, active_unique_token)`

### `ts_monthly_approvals`（M07B）

对应实体：`TsMonthlyApproval`

- 一行代表「某部门领导 + 某目标月份」的研发月度审批任务
- 状态字段使用 `MonthlyApprovalStage`：`PENDING`、`COMPLETED`、`AUTO_COMPLETED`
- 终态来源：`DecisionSource`（`NONE` / `MANUAL` / `AUTO`）
- 活跃唯一性：`(leader_id, belonging_month, active_unique_token)` 唯一键（BR-RN-009）
- 索引：`(stage, deadline)`、`(leader_id, stage)`、`(belonging_month, stage)`

### `ts_monthly_approval_details`（M07B）

对应实体：`TsMonthlyApprovalDetail`

- 一行代表月度审批单内一名成员的汇总快照（生成时固定，不回写台账重算）
- 汇总字段：`month_non_project_hours`、`month_direct_hours`、`month_non_direct_hours`、`attendance_hours`、`non_project_ratio`
- `attendance_hours` 取数（Sprint Change 2026-05-25）：生成时从台账 `ts_ledger_projections.attendance_hours` 按 `(member_id, batch_id)` GROUP BY 取 `MAX` 作为周代表值，再按 `member_id` SUM；同 (batch, member) 多行 attendance 由 RD 申请阶段统一写入应当一致；NULL 周跳过累加；全月无数据时 `attendance_hours = NULL`，`non_project_ratio` 同步 `NULL`。不再实时调用 MK
- 审批字段：`decision`（`MonthlyApprovalDecision`）、`rejected_weeks`（MySQL `JSON`，`[{weekStart, weekLabel, totalHours}]`）、`approval_remark`
- 活跃唯一性：`(monthly_approval_id, member_id, active_unique_token)` 唯一键

## 台账投影 `ts_ledger_projections`

对应实体：`TsLedgerProjection`

- 统一承载 RD/MFG 两域的可查询明细投影
- 维度字段：`domain`、`formType`、`detailId`、`batchId`、`memberId`、`projectId`
- `stage` 按申请阶段名称落字符串，保持与来源明细一致
- `displayStatus` 用于前端展示，不替代真实阶段
- `effectiveHours` 允许为 `null`，与来源申请行保持一致
- **M06 扩列**（`V5.1`）：`modified_hours`、`modified_remark`、`modify_approval_status`、`modify_approval_remark`；均为 `NULL` 表示未进入修改流程；`modify_approval_status` 使用 `ModifyApprovalDecision` 枚举（PENDING/APPROVED/REJECTED）
- **研发各阶段提交来源**（`V4.7` + `V5.9.1`）：`rd_application_submit_channel`、`rd_approval_submit_channel`、`rd_modification_submit_channel`、`rd_monthly_supplement_submit_channel`、`rd_modification_approval_submit_channel`；值为 `LedgerSubmitChannel`（`USER_SELF` / `SYSTEM`）；M06 修改单锁定写入的 `rd_modification_submit_channel` 研发/供应链行共用；`rd_modification_approval_submit_channel` 仅研发台账对外展示
- **M02 资产快照**（`V5.2.1`）：`asset_code` VARCHAR(64) NULL、`asset_name` VARCHAR(200) NULL；制造台账 upsert 时从申请明细写入，列表/导出/筛选可读
- 活跃唯一性：`(form_type, detail_id, active_unique_token)` 唯一键；`active_unique_token` 为生成列（`deleted=0` → `'ACTIVE'`，已删 → 行 `id`），软删后同明细可再次 upsert 台账

## 员工日考勤本地缓存 `ts_employee_daily_attendances`（S-08）

对应实体：`TsEmployeeDailyAttendance`

- 一行 = 一名员工（`member_id`）一个自然日（`work_date`）的 **EHR 日考勤汇总**本地缓存，供月度补填等场景优先读取，避免每次打开详情批量实时打 EHR
- **仅存 EHR 日考勤标量字段**：`regular_hours`（= EHR `worktime_total_hour`，DTO 字段暂沿用 MK 命名）、`overtime_hours`、`holiday_salaried_hours`、`holiday_no_salary_hours`，以及派生列 `approved_leave_hours`（= 带薪+无薪假）、`ehr_attendance_hours`（= regular+overtime）、`mk_night_shift`、`mk_daily_present`
- **不存**任何请假/补卡/出差/调班单据或其 JSON；也**不存** `attendance_available_hours` / `has_anomaly`——制造可用工时在 `findSnapshot` 读取时按「无单据」口径即时派生（`MfgAttendanceAvailPersistRules`），研发周汇总用 `regular+overtime`（D-02）
- 审计字段：`synced_at`（同步时刻）、`sync_source`（`SCHEDULER` 定时同步 / `FALLBACK_MK` 历史 MK 回落写穿 / `FALLBACK_EHR` 当前 EHR 回落写穿，见 `AttendanceSyncSource`）；`FALLBACK_EHR` 复用既有 `VARCHAR(20)` 列，不需要数据库迁移
- 活跃唯一性：`(member_id, work_date, active_unique_token)` 唯一键（软删 pattern 与项目一致）；查询索引 `(member_id, work_date)`
- 写入语义：`upsertFromDailyAttendance` 按 `(member_id, work_date)` 全字段覆盖更新或 insert；缓存未命中时由 `loadSnapshotPreferCache` 回落 EHR 并**仅提取日考勤字段**写穿（D-03）

## 研发预算占比 `ts_rd_budget_allocations`

对应实体：`TsRdBudgetAllocation`

- 自然键：`(project_id, member_id, belonging_month)`
- `budget_ratio` 为 `DECIMAL(5,4)` 小数占比
- 由财务/管理员通过 Excel 导入维护

## 迁移演进摘要

- `V1.0__init_timesheet_tables.sql`：初始批次、申请、审批、项目、台账、预算表
- `V1.1__add_supplement_handler_id_to_ts_mfg_applications.sql`：制造补填处理人字段
- `V2.0__ts_project_change_logs.sql`：项目变更日志
- `V3.0__epic3_mfg_columns_and_state.sql`：制造列扩充与 `ts_mfg_application_states`
- `V3.1__uniq_ts_project_members.sql`：项目成员唯一性调整
- `V3.2__project_optional_fields_nullable.sql`：项目可选字段放宽
- `V3.3__fix_ts_batches_unique_rd_weekly.sql`：研发周批次唯一键修正
- `V4.0__mfg_generation_scope.sql`：制造生成范围调整、工厂可空及唯一键修正
- `V4.1__nullable_application_and_ledger_work_hours.sql`：申请与台账工时允许为空
- `V4.2__product_master_and_factory_product.sql`：产品与工厂-产品主数据
- `V4.3__mfg_ledger_projection_factory_name.sql`：制造台账补充工厂展示字段
- `V4.4__ledger_projection_display_status.sql`：台账展示状态字段
- `V4.5__drop_mfg_application_unique_constraint.sql`：移除制造明细唯一约束，改由前端拦截重复项目/工厂组合
- `V4.10__mfg_application_plus_two_manager_id.sql`：制造催办 +2 经理快照与索引
- `V4.11_ts_member_roles.sql`：项目成员角色主数据表、`ts_project_members.role_id`
- `V5.0.1__ts_mfg_generation_retry_tasks.sql`：BR-MA-002 休息日补推 MK 考勤失败重试队列
- `V5.0.2__ts_mfg_application_state_fill_todo_notified.sql`：`ts_mfg_application_states.fill_todo_notified_at`（6:00/8:00 推单拆分）
- `V5.1__ts_ledger_projections_modify_columns.sql`：台账增加 M06 修改流程字段
- `V5.2.0__mfg_application_asset_columns.sql`：M02 制造申请明细增加 `asset_code` / `asset_name` 快照列
- `V5.2.1__ts_ledger_projections_asset_columns.sql`：台账投影增加制造资产编码快照列及 `asset_code` 索引
- `V5.2.2__ts_mfg_application_state_attendance_info.sql`：制造申请表头 `attendance_info` JSON + `attendance_info_refreshed_at`
- `V5.6.1__ts_rd_work_hour_revisions.sql`：新增研发工时修改单主表与明细表（初建表名）
- `V5.6.5__rename_rd_work_hour_revisions_to_rd_modifies.sql`：表/列/约束重命名为 `ts_rd_modifies` / `ts_rd_modify_details`
- `V5.7.0__ts_monthly_supplements.sql`：M07A 月度补填单主表与明细表
- `V5.7.1__ts_monthly_supplements_version.sql`：月度补填单新增 `version` 乐观锁字段（防止 submit 并发双写台账与 stage 重复推进）
- `V5.7.2__ts_monthly_supplements_stage_created_at_index.sql`：补填单新增 `(stage, created_at)` 复合索引，保障调度按提交时间顺序扫描时走索引顺序，避免 filesort
- `V5.7.3__ts_monthly_approvals.sql`：M07B 研发月度审批主表与明细表
- `V5.7.5__ts_ledger_projections_active_unique_token.sql`：台账 `(form_type, detail_id)` 唯一键改为含 `active_unique_token`，修复软删后重提审批主键冲突
- `V5.8.1__ts_employee_daily_attendances.sql`：S-08 员工日考勤本地缓存表（仅 MK 日考勤汇总，不含单据），`(member_id, work_date, active_unique_token)` 唯一、`(member_id, work_date)` 索引（须在已应用的 `V5.8.0` 之后）
- `V5.8.2__repair_mfg_ledger_modify_lock_attendance_hours.sql`：M06 历史修复——供应链台账进修改单锁定后误写整周考勤（>24h）→ 按 MK 日缓存回写，并同步修改审批明细 `attendance_hours_snapshot`
- `V5.8.3__repair_monthly_supplement_detail_hours.sql`：M07A 历史修复——已提交/已锁定补填单明细 `supplement_hours` 为空但台账已月度补填回写 → 从台账 `effective_hours`/`apply_remark` 回填明细
- `V5.9.1__rd_modification_approval_submit_channel.sql`：台账新增 `rd_modification_approval_submit_channel`（M06 修改审批提交来源）
