# timesheet — 核心业务规则

本文档只沉淀已在代码中稳定落地的一期规则。

## 截止时间与日历

`DeadlineCalculationServiceImpl` 统一使用 `Asia/Shanghai` 时区，并通过 `CalendarClient` 判断工作日。

- 研发申报截止：`createdAt + 3` 个工作日，`08:00`
- 审批截止：锁定后 `+1` 个工作日，`08:00`
- 研发修改单截止：生成后 `+2` 个工作日，`07:00`
- 制造工作日申报截止：申报日（填报日期）起 `+2` 个工作日，`06:00`
- 制造休息日申报截止：各休息日申报日起 `+2` 个工作日，`06:00`（按申报日分别计算）
- 制造补填截止：申报截止后 `+1` 个工作日，`17:00`

## 制造批次生成

来源：`MfgBatchGenerationServiceImpl`

- 生成范围由 `MfgEmployeeScopeConfig` 控制：先按 `departmentIds` / `excludedDepartmentIds` 与 `recursive` 计算 `effectiveDeptIds`
- 从 `effectiveDeptIds` 拉取成员并去重，再剔除其中“不在项目内”的部门 `manager`
- **BR-MA-022**：`timesheet.mfg.asset-code-scope` 目标子树内各部门负责人（`MfgAssetCodeScopeSupport.collectDeptManagerIdsInScope()`）**永不**因「不在项目内」被剔除，仍参与制造申请单生成并收到待办
- 最后按 `excludeUserIds` 做个人排除
- **与研发推单互斥**：运行时剔除 `RdBatchGenerationService.resolveWeeklyTargetUserIds` 返回的研发周推送对象（与研发批次生成单一真相来源）；制造项目参与成员与制造线项目 Leader 仍应收到日批次（BR-MA-016）
- 有项目成员：按项目生成明细
- 无项目成员：仍生成 1 条空白非项目行（`is_system_generated=false`，与手工「新增一行」同语义，可删除）
- 休息日补生成会为以下成员创建申请单：当日有加班记录，或员工类型 `BASE_POSITION` 且当日存在有效出差单
- **BR-MA-002 重试**：休息日补推时若 MK/EHR 日考勤查询失败，不入队则跳过；入队后每 15 分钟重试，最多 3 次，仍失败则标记 `FAILED` 且不再生成申请单（`ts_mfg_generation_retry_tasks` + `MfgGenerationRetryScheduler`）
- **BR-MA-003 推单拆分**：工作日 **6:00** 预生成（MK 日考勤 + 四类单据并行查询，含 14h 可用时长规则落库；+1/+2 领导快照写入明细行；`GENERATE_ONLY`）；**8:00** 补缺落单后扫描 `fillTodoNotifiedAt IS NULL` 的待填报人员推送钉钉待办；8–9 点每 5 分钟补扫推送失败记录。重试队列成功路径仍 **立即** 推送待办（`GENERATE_AND_NOTIFY`）
- **制造 D0 未提交提醒**：工作日 **17:00** 对申报日为上一工作日、仍为 `PENDING_FILL` / `FILLING` 且未提交的申请人发送工作通知（不新建待办；`MfgFillReminderScheduler` + Redis 日幂等）

稳定结论：

- 制造生成已经不是“无项目则跳过”，而是“无项目也生成空白行”
- 有项目参与成员的系统预填行仍为 `is_system_generated=true`（不可删）
- 工厂与工作内容不再在生成时预填

## 制造保存、提交与补填

来源：`MfgApplicationServiceImpl`

- 保存请求中的 `items` 采用全量快照语义
- 保存与提交均要求 `items` / 明细行至少一条，否则拒绝（「至少保留一条工时明细」）
- 正工时行必须填写 `factoryId` 与 `productId`（含资产行；BR-MA-020 变更后资产行同样须选工厂）
- BR-MA-020：目标部门保存时可写入 `assetCode` / `assetName` 快照；选择资产编码后 Service 自动绑定产品主数据「设备投入」（`productAbbreviation = 设备投入`），清空 `projectId` 及项目快照，**不清空**工厂（用户须按产品简称联动选择工厂）；提交期 `assertAssetRowsOnSubmit` 兜底：资产行禁止 `projectId`、须为「设备投入」、工厂与产品须合法关联
- BR-MA-021：同一申请/补填单内 `assetCode` 不可重复（前后端均校验，提示「资产编码重复」）；非目标部门传入 asset 字段时**静默忽略**入参；同时为防御历史脏数据，`applyAllEditableFields` 在非目标部门路径下也会主动清空 row 的 `assetCode` / `assetName`
- 目标部门由 `timesheet.mfg.asset-code-scope` 配置的部门编号及其递归子部门界定（`MfgAssetCodeScopeSupport`）
- BR-MA-024（员工日报 `validateForSubmit` 与补填 `validateForSupplementSubmit` 共用 `assertAssetCodesEnabledOnSubmit`）：对已填 `assetCode` 的行调用 MK 资产接口校验启用状态，查不到则按行号 1-based 拒绝并提示「第 N 行资产编码已停用，请重新选择后再提交」
- **BR-MA-023**：制造补填 submit 与员工 submit 对称——资产行须 factory/product（设备投入）、禁止 project、重复 assetCode 校验、BR-MA-024 启用校验；保存经 `saveAsSupplementHandler` → `applyAllEditableFields` 复用 M02 资产行规则
- 同一申请单内，不允许出现“同一工厂 + 同一项目/非项目”重复明细；当前由前端在保存/提交前拦截并提示
- 后端不强制校验 `workContent`，该字段只由前端做引导性校验
- 全天请假时不可填写工时
- 制造考勤快照中的 `过审请假时长` 口径为 `带薪请假时长 + 无薪请假时长`
- 当日存在有效请假单时，`考勤可用时长 = 8 - 过审请假时长 + 加班时长`；若结果小于 0，则按 0 处理
- 提交与补填提交都会校验：申报当日 `listMemberProjects` 中的每个参与项目，在明细中至少有一条相同 `project_id` 的行（不要求该行必须为系统预填）
- 临时策略：提交路径已移除「工时汇总 <= 考勤可用时长」**后端**拦截；前端制造申请/补填提交校验已恢复，待“引入新单据后的准确判断”能力完成后同步恢复后端
- 「已提交 / 已处置」判定口径：同一 `(batchId, applicantId)` 下只要存在任一活跃的非编辑态行（`MfgApplicationStage.isEditable()` 为 `false`，即 `PENDING_APPROVAL / FINISHED_NO_REVIEW / APPROVED / REJECTED / DECLINED`），就视为已提交，`save` 与 `submit` 一律抛业务异常（避免在终态行旁边再生孤儿编辑态行）
- 员工 `save` / `submit` 在应用层对 `(batchId, applicantId)` 加分布式锁串行执行，避免「提交前 save」与 `submit` 并发导致快照删旧行后插入未提交的 `FILLING` 孤儿行；抢锁失败提示「申请单正在保存或提交中，请稍后重试」
- 制造 `POST submit` 与研发对齐：请求体同 `save`，Service 在**同一事务**内先 `persistDraft` 再迁态，前端单次 POST 即可，不再依赖「先 PUT 再 POST」
- 列表/详情展示阶段：同人同批次多行时，若存在任一非编辑态行则优先展示已提交/终态 stage（`MfgApplicationStageSupport.resolveDisplayStage`），避免 `rows.getFirst()` 在混合阶段时仍显示「填报中」
- 前端提交成功后须校验响应/详情 `stage` 已离开可编辑态再提示成功；保存/提交/decline 成功后须 `fetchQuery` 详情并写回本地行 `id`，避免下次 save 因无 `id` 触发快照软删与重复插入

### 一键复用上一工作日（BR-MA-015 ~ BR-MA-017）

来源：`MfgApplicationServiceImpl.reusePrevious`

- **BR-MA-015**：仅当前批次 `MfgApplicationStage.isEditable()` 为 true 时可调用复用接口；不可编辑时 `COMMON_OPERATION_NOT_ALLOWED`
- **BR-MA-016**：上一工作日由 `CalendarClient.previousWorkingDay` 计算；上一日须存在制造日批次且申请人有明细，且 `stage` 属于白名单 `PENDING_APPROVAL / FINISHED_NO_REVIEW / APPROVED / DECLINED`（**不得**用 `!isEditable()` 反推——`REJECTED` 不可复用）
- **BR-MA-017**：`items` 返回上一日**手工**项目行中与本日系统预填 `projectId` 匹配的聚合快照；`appendItems` 返回上一日其余手工行（非项目行，或无本日系统预填行的项目手工行）；响应无实体 `id`、不带 `workHours`；前端：`items` 匹配本日系统预填项目行写入工厂/工作内容；`appendItems` 及未匹配的 `items` 在表尾追加；已追加行再次点击不重复；接口只读，保存仍走 `PUT` 全量快照

自动补提交流程：

- 到补填截止时，系统可自动提交仍在 `SUPPLEMENTING` 的行
- 自动提交不会执行手工提交的完整性校验；**但会剥离「有正工时、无工厂」明细上的工时后再写台账**（`MfgFactoryLedgerGuard`），避免供应链台账出现有工时无工厂
- 自动提交后仍会为该成员该批次的全部明细写台账

补填推进的防御（D2）：

- `MfgSupplementGenerationScheduler` 调度的 `generateSupplements` 在按 stage 选出待推进行后，会再按上面「已提交 / 已处置」口径过滤：同人同批次若已存在活跃的非编辑态行，则其上 `PENDING_FILL / FILLING` 残留视为孤儿行，**仅从本次推进队列中跳过，不动数据**，避免「用户自己已经提交，却又被推进补填」的现象
- **不软删孤儿行**：孤儿行很可能承载用户真实填报的工时数据（`workHours / workContent / factoryId / projectId`），误删会丢失业务数据；调度只负责"别再让它进补填"，数据本身保留原样
- 每条被跳过的孤儿行会输出一条 WARN（含 rowId、batchId、applicantId、stage、isSystemGenerated、workHours、workContent、factoryId、projectId），便于运维人工评估处理路径（修阶段 / 合并 / 清理）
- 该防御是兜底；正常情况下不应出现孤儿行，若 WARN 持续出现需排查是否仍有并发竞态或绕过 `save / submit` 闸门的写入路径
- 注意：被跳过的孤儿行下一次调度仍会被扫到、再次产生 WARN——这是有意为之，让问题持续可见直到被人工清理

## 直属上级与补填处理人

来源：`TimesheetOrgRules`、`MfgReminderOrgSupport`、`MfgBatchPerEmployeeTransactionalService`、`MfgSupplementServiceImpl`

- `directSupervisorId` 通过“申请人 -> 末级部门 -> 部门 manager”链路解析
- **6:00 系统生成**时即写入 `directSupervisorId`（+1）与 `plusTwoManagerId`（+2，`MfgReminderOrgSupport.resolvePlusTwoManagerId`）
- 进入补填阶段时会再次批量解析并刷新 `directSupervisorId` 与 `plusTwoManagerId`
- `supplementHandlerId` 在进入补填时默认与本次解析结果一致
- 转办只修改 `supplementHandlerId`
- 催办列表/详情、`auth/context` 优先读库内 `plusTwoManagerId` 快照；历史无快照行回落 Org 解析

## 制造申请与考勤刷新

来源：`MfgApplicationServiceImpl`、`MkMfgAttendanceClient`

- 制造保存与提交使用 `MfgApplicationSaveParam`（员工路径）或补填专用参数（处理人路径）
- **详情接口**（`GET /mfg/applications/{batchId}`）只读取库内考勤快照（`attendance_hours`、`ehr_attendance_hours`、`mk_night_shift`）及表头 `ts_mfg_application_states.attendance_info` 单据快照，不实时拉 MK；`comparison.attendanceChanged` 在详情响应中恒为 `false`
- **考勤刷新接口**（`GET /mfg/applications/{batchId}/attendance`）负责从 MK 拉取日考勤与四类单据；填报窗口内（`PENDING_FILL` / `FILLING` 且未过截止）成功时写回库内标量字段，并覆盖写入 `attendance_info` 快照
- **补填批次刷新**（`GET .../batches/{batchId}/attendance`）：`SUPPLEMENTING` 且未过补填截止时，标量字段与 `attendance_info` 均落库（单据快照写入不依赖工时是否变化）
- **补填轻量详情**：不拉 MK；各日 `attendanceInfo` 优先读表头 `attendance_info` 快照，无快照时为空壳
- **前端自动刷新**：工作日且库内「考勤可用时长」&lt; 8（考勤情况异常）时进入详情页才自动调用 refresh；正常时不自动拉 MK。用户可点击「更新考勤」手动刷新
- **提交校验**：员工提交不再等待 MK 刷新完成；工作日且库内考勤可用时长 &lt; 8 时前后端均拒绝提交（与「考勤情况」展示一致）
- 只读阶段（已提交等）仍可调 refresh 拉 MK **仅展示**单据明细，不落库
- MK/EHR 不可用时不抛 500：返回库内快照 + `mkRefreshFailed=true`，前端提示降级
- MK 五类接口（日考勤、请假、补卡、出差、调班）在 `loadSnapshot` 内并行请求；**6:00 系统生成**走 `loadSnapshotForMfgSystemGeneration`，与 `loadSnapshot` 口径一致（含 14h 规则）
- 考勤快照落库（`attendance_hours`、`ehr_attendance_hours`）统一 **HALF_UP 四舍五入至 0.1h**（`WorkHoursScaleSupport`）；MK 聚合（正班/加班/EHR 求和、可用时长规则）保留原始精度，仅在写库边界 round

## 研发申请与考勤刷新

来源：`RdApplicationServiceImpl`、`RdWeekAttendanceSupport`

- 研发保存与提交都使用 `RdApplicationSaveParam`
- `PUT /rd/applications/{batchId}` 只保存，不消除填报待办
- `POST /rd/applications/{batchId}/submit` 成功后才消除填报待办
- 详情接口只读取库内考勤快照，不实时拉 MK
- 考勤刷新接口优先读 `ts_employee_daily_attendances` 本地缓存（`EmployeeDailyAttendanceService` + `RdWeekAttendanceSupport.resolveWeekTotalPreferCacheOrNull`）；未命中日期回落 MK 日考勤并写穿；任一日失败时返回 `attendanceHours=null` + `attendanceFetchFailed=true`，不写库
- 考勤快照落库（`attendance_hours`、修改单 `attendance_hours_snapshot`、月度补填明细 `attendance_hours`）统一 **HALF_UP 四舍五入至 0.1h**（`WorkHoursScaleSupport`）：周汇总逐日累加保留原始精度，仅在写库边界 round
- 详情 `isLocked`：填报窗口已关闭 **或** 阶段已进入 `PENDING_APPROVAL` / `PENDING_MONTHLY_APPROVAL`（截止锁定后只读）；保存/提交在锁定态一律拒绝
- **手动新增项目行**（`is_system_generated=false`）：除申报周内本人参与的在研项目外，可按项目简称检索**项目简称含 MP** 的在研项目；选中后 `is_direct_managed=false`（非直管），不要求项目成员关系

## 研发批次生成

来源：`RdBatchGenerationServiceImpl`、`RdTimesheetPushWhitelistSupport`

- 研发申报范围由 `RdEmployeeScopeConfig` 控制
- 部门领导在“无有效项目成员关系”时不会生成申请单
- 对整周放假的自然周，系统会按规则补推周批次
- **推送白名单**（项目成员 `is_whitelisted` 与部门范围推单共用 `RdTimesheetPushWhitelistSupport`）：
  - 基础研究部（部门编号 `1001-RD-YJ`）且员工类型为临时工：**不推送**
  - 其余人员默认纳入白名单

## 审批归集

来源：`RdLockServiceImpl`、`RdApprovalServiceImpl`

- 研发周批次全员锁定后，`ts_batches.lock_time` 与 `ts_batches.approval_deadline` 与审批主表同步写入（锁定时刻 + 审批截止 +1 工作日 08:00）；仅首次落库，供 M06 修改单生成调度按批次截止日扫表
- 研发审批单只归集“直管且有项目”的研发明细
- 截止锁定与每日统计补全前，按**当前**项目成员 Leader / 直管关系刷新明细行 `leader_id` 快照，再按「批次 + 项目 + Leader」归集，避免建单后调整成员 Leader 导致审批单遗漏下属
- 制造进入审批单的也是直管制造明细
- 非直管制造在提交后走 `FINISHED_NO_REVIEW`
- 非直管研发与非项目研发锁定后进入 `PENDING_MONTHLY_APPROVAL`

## 审批超时规则

来源：`RdApprovalServiceImpl`

- 逾期仍未完成的审批头会被系统自动完结
- `workHours == null` 的待审明细自动驳回
- 显式 `0` 工时与正工时一样，自动通过

## 研发修改单生成

来源：`RdModifyServiceImpl`、`RdModifyGenerationScheduler`

- 每日 `08:45` 扫描审批截止落在当天的 `RD_WEEKLY` 批次，按批次生成修改单
- 生成来源仅包含“审批不通过 + 直管 + 已关联项目”的研发/供应链明细
- 聚合粒度为“同一成员 + 同一研发周批次 = 一张修改单”
- 研发明细保留源申请行粒度；供应链明细保留按日粒度，`workDate` 来自对应制造日批次 `reportingDate`
- 明细 `prevApprovalRemark`（修改单「审批备注」列）解析顺序：来源申请 `approvalRemark` → 台账 `approvalRemark`（含 M07B 月度审批回写）→ 台账 `modifyApprovalRemark`（M06 修改审批驳回）→ 未填报工时自动驳回默认文案「工时为空，默认不通过」；详情查询对历史空值做同等回退展示
- M05 审批超时自动驳回时同步写入上述默认审批备注至申请单与台账
- 重复触发时先查活跃修改单与已落地明细，再由数据库唯一键兜底，保证不会重复造单
- 成员侧列表接口只返回当前登录人的修改单，不混入管理员视角

## 研发修改单提交

来源：`RdModifyServiceImpl`、`RdModifySubmitParam`、`RdModifyLockServiceImpl`

- `GET .../rd/modifies/{id}/attendance` 与研发申请单一致：优先读 `ts_employee_daily_attendances` 本地缓存，未命中回落 MK 日考勤；**任一日失败则整周失败**，不写库、返回 `attendanceHours=null` + `attendanceFetchFailed=true`；由成员打开详情页时主动调用
- 修改单截止锁定时（`RdModifyLockServiceImpl`）**不再**刷新考勤快照，直接写入库内已有 `attendance_hours_snapshot`（与研发申请单锁单口径一致）
- 成员提交时，每条明细的 `modifiedHours` 与 `modifiedRemark` 均必填（空白备注拒绝提交）
- 修正工时非负、最多 1 位小数；修改备注最多 500 字
- 工时汇总（修改工时 + 过审工时）不得超过考勤快照；考勤快照为 null 时不允许提交，须先刷新考勤落库后再提交

## 修改单锁定写台账（考勤口径）

来源：`RdModifyLedgerWriterImpl`

- 研发台账行：锁定写入修改单主表 `attendance_hours_snapshot`（整周正班+加班汇总）
- 供应链台账行：锁定写入**申报日当日**可用考勤，经 `EmployeeDailyAttendanceService.loadSnapshotPreferCache`（优先 `ts_employee_daily_attendances`）；失败则回落源制造申请 `attendance_hours`；仍失败则**保留台账既有值**，禁止写入周汇总快照

## 修改审批生成与结案

来源：`RdModifyApprovalServiceImpl`、`RdModifyApprovalGenerationScheduler`、`RdModifyApprovalTimeoutScheduler`

- 修改单锁定后，按「项目 + Leader + 批次」生成修改审批单；取数含 **RD 台账（batchId = 研发周批次）** 与 **MFG 台账（reportingWeekStart 与同研发周对齐）** 的 PENDING 行
- **原申请工时快照**：来源申请 `work_hours == null`（未填报）时存 **NULL**；显式 `0` 存 **0**；与修改单 `ts_rd_modify_details.original_hours` 及 M05「未填 / 填 0」口径一致
- 明细占比快照（`week_ratio` / `month_ratio` / `budget_ratio` / `overrun`）口径与 M05 审批一致：**本月占比 = 成员当月同项目工时 ÷ 当月考勤合计**；**超支 = 本月占比 − 预算占比**（预算自 `ts_rd_budget_allocations` 读取）；待审行以 `modified_hours` 参与分子
- **一次填报率**与 M05 相同：直管成员（研发周明细 + 同审批组制造日明细按 applicant 去重）中，研发看台账「工时申请」为自主提交（`USER_SELF`），制造角色成员看制造明细是否均为员工本人在申报截止前提交（`SubmitSource.EMPLOYEE`）；M05/M06 **待审**单列表与详情按申请单实时重算，已结案单读生成时固化快照
- Leader 可对待审研发行逐行通过/驳回，对制造周聚合行通过或按日驳回（`rejectedDates`）
- **修改后工时未填报（`modified_hours == null`）**的研发行/制造日**不可选择通过**（显式 `0` 视为已填）；前后端提交均校验
- **已填写修改工时的成员/日期**被 Leader 驳回时，**审批备注（`modify_approval_remark`）必填**；未填修改工时的空值行驳回时备注可选
- 超截止：`PENDING` 且 `deadline <= now` 由调度或手工 trigger 按默认规则自动结案（研发未填按驳回、制造按既有填报等，详见 Service 实现）
- 结案后通过 `RdModifyLedgerWriter` 回写台账 `modify_approval_*` 与 `effective_hours`
- 已知限制见 [`known-limitations.md`](known-limitations.md)

## 研发月度审批（M07B）

来源：`RdMonthlyApprovalValidationRules`、`RdMonthlyApprovalServiceImpl`、`RdMonthlyApprovalLedgerWriter`

- Leader 须对审批单内**全部成员**逐行选择通过/不通过后提交
- **不通过时**：`rejectedWeeks` 至少勾选一周；**审批备注（`remark`）必填**；台账回写：勾选周次 → `REJECTED`（写入 `approvalRemark`），未勾选周次 → `COMPLETED`
- **通过时**：审批备注可选；成员当月待月审台账中参与周次勾选的非直管行存在未填报工时（`effective_hours == null`）时**不可选择通过**；台账回写：当月全部待月审行 → `COMPLETED`
- 提交校验失败时返回 `COMMON_INVALID_ARGUMENT("选择不通过时必须填写审批备注")` 等明确提示
- **超截止自动处理（BR-RN-011）**：逐条台账 `effective_hours` 为 `null`（未填报）→ 不通过；已填报（含显式 `0`）→ 通过

## 研发月度补填生成（M07A）

来源：`MonthlySupplementServiceImpl`、`TsLedgerProjectionRepo.findEligibleForMonthlySupplementGeneration`

- 财务/管理员按目标月份手动触发；取数条件为 **`belonging_month = 目标月`** 且 **`ledger_display_status = REJECTED`**
- **统一汇总**台账上仍为「不通过」的行，不区分驳回来源：
  - **M05** 研发工时审批 Leader 驳回（含审批单内制造明细被勾选驳回的日明细，台账已回写为不通过）
  - **M06** 修改审批 Leader 终态驳回（`modify_approval_status = REJECTED` 且展示态仍为 `REJECTED`）
  - **M07B** 月度审批 Leader 按周勾选驳回后回写的台账行
- **不按** `modify_approval_status IS NULL` 排除 M06 路径；M06 修改审批待审期间行通常为 `PENDING_APPROVAL`，不会进入取数
- 聚合维度为 **`(member_id, domain)`**；同一成员同一月份已存在活跃补填单（`DRAFT` / `SUBMITTED` / `LOCKED`）时跳过不重复生成
- **生成时考勤取值固化台账快照**：明细 `attendance_hours` 直接取生成时刻工时台账行的 `attendance_hours`，**生成环节不再实时调用 MK 考勤**；获取最新考勤仍由「每次打开补填单详情」（`MonthlySupplementAttendanceRefresher`）负责刷新并写回
- **打开详情时考勤刷新（S-08）**：`MonthlySupplementAttendanceRefresher` 优先读 `ts_employee_daily_attendances`（MFG 未命中回落完整 `loadSnapshot`，RD 周汇总未命中回落 `loadDailyOnlyPreferCache`）；刷新失败仍标记 `attendanceFetchFailed`，不阻塞页面
- **提交/锁单不再刷新考勤**：以成员打开详情页时已落库的快照为准
- 明细 `original_hours`：台账 `effective_hours == null` 时存 **NULL**（未填报）；显式 `0` 存 **0**
- 明细 `prevApprovalRemark`：与 M06 修改单相同解析顺序（台账 `approvalRemark` / `modifyApprovalRemark` + 未填报默认文案）

## 制造 +2 经理催办

来源：`MfgReminderOrgSupport`、`MfgReminderServiceImpl`

- 催办对象不是直属上级，而是按组织链路解析出的 `+2` 经理；进入 `SUPPLEMENTING` 时写入 `plus_two_manager_id`
- 催办列表、详情与一键催填以快照字段过滤，避免详情页对申报日范围内全员逐行 Org 解析
- 一键催填同时支持对成员与处理人发送工作通知

## 项目成员离职自动退出

来源：`ProjectMemberOffboardingScheduler`、`ProjectServiceImpl.offboardResignedParticipatingMembers`

- 每日 4:00（上海）扫描 `participationStatus = PARTICIPATING` 成员，Org `status = RESIGNED` 时置为 `LEFT`，`leaveDate` 为执行日，并写入项目变更记录
- **钉钉工作通知（研发/制造角色）**：成员角色为研发（`RD`）或制造/供应链（`MFG`）时，向该项目 `financeAccountantId` 与 `managerId` 发送工作通知；`roleId` 未命中主数据时回退存量 `role` 文本（研发/制造）
- 通知在事务提交后发送；失败仅记日志，不影响退出落库
