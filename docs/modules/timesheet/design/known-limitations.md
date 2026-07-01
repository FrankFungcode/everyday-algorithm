# timesheet — 已知限制与设计取舍

本文记录各模块交付时**有意接受**的技术债与边界，以当前代码为准。新需求或规模变化时应先复核本节再改实现。

## M07A — 研发月度补填

### 并发与一致性

- **GET 详情触发持久化**：`DRAFT` 态 `GET /monthly-supplements/{id}` 会刷新并写回 `attendance_hours`，违反纯读 HTTP 语义；产品与架构已接受「打开即刷新」。提交/锁单不再刷新考勤。
- **无实体级乐观锁**：并发 `getDetail` 可能 last-writer-wins 覆盖考勤刷新结果；同用户极少并行打开同一单。

### 性能与规模

- **考勤刷新 N+1**：RD 行按周展开为多次 MK 单日调用；MFG 行逐行拉快照。当前月度补填明细规模可接受。
- **LedgerWriter 逐条 save**：`writeOnSubmit` 按明细 `findById` + 单条 `save`；≤50 行可接受。
- **催办 Scheduler 全量 DRAFT 无分页**：`MonthlySupplementReminderScheduler` 一次载入全部 DRAFT；无产品侧停催截止，按量监控后再分页。

### API 与运维

- **Trigger 路径使用动词**：`/generate`、`/lock` 与模块内其他 Trigger Controller 一致，未改为纯资源路径。
- **手工触发同步执行**：大批量生成/锁定可能在 HTTP 线程长时间运行，依赖幂等与运维重试。

### 前端

- **红绿灯由前端计算**：后端 submit 仍做权威校验；灯态字符串未抽枚举。
- **列表/详情错误态**：部分页面网络失败时仅展示空表，与模块其他列表一致。

## M07B — 研发月度审批

### 并发与一致性

- **无实体级乐观锁**：与 M06 相同，依赖 Redisson 锁 + 状态机校验。
- **`PENDING_MONTHLY_APPROVAL` 业务不变量**：`domain=RD + PENDING_MONTHLY_APPROVAL` 等价 `batch.type=RD_WEEKLY`；Writer 未额外 JOIN `ts_batches.type` 过滤。

### 性能与规模

- **超截止扫描无分页**：`autoCompleteOverdue` 与 M06 同类实现，一次性载入到期单；积压 >1000 时需分页改造。
- **OrganizationClient 单 ID 接口**：月度生成对多部门 for-each Feign，存在 N+1；批量端口待统一优化 ticket。
- **日历缓存 300s TTL**：`CachingSystemCalendarClient` 在运营改 `dayType` 后短暂最终一致。

### 集成与观测

- **钉钉 dismiss 失败吞异常**：`IntegrationTimesheetTodoPushClient` 与全模块 TodoPush 家族一致，审批已完成但待办可能残留。
- **Scheduler `LocalDate.now(SHANGHAI)` 硬编码**：跨 Scheduler 统一 `Clock` 注入前，跨年边界单测覆盖有限。

### 前端

- **Leader 列表无 `access` 收敛**：非 Leader 可见菜单但列表为空；待后端补 `fact:hasDeptLeader` 后收敛导航。
- **FE enum 手写镜像**：`rd-monthly-approval/types.ts` 与后端无 codegen/wire 契约测试，与 M06 同模式。

## M02 — 制造工时申请（0520 变更）

### 业务裁决待定

- **BR-MA-022 `excludeRdLineUsers`**：in-scope manager 是否在 projectLeader/weekParticipant 剔除路径同样豁免 — 待 PO/架构裁决
- **资产行 UI**：工厂/产品/项目列用「—」占位 vs disabled Select 灰态 — 待 UX 裁决

### 性能与集成

- **MK 资产校验 N 次 RPC**：`assertAssetCodesEnabledOnSubmit` 逐行同步调用；`collectDeptManagerIdsInScope` 逐部门 Feign
- **一键复用 stage 代表行**：`reusePrevious` 取 `getFirst()` 未 `ORDER BY`；同人同批 stage 应一致

## M09 — 研发台账 Excel 导入

### 安全与规模

- **上传无大小上限**；错误 xlsx 未做 CSV/公式注入消毒
- **`RdLedgerImportServiceImpl` 单类过重** — 解析/校验/去重/写入编排未拆分

### 前端

- **Base64 下载** `revokeObjectURL` 时机过早 — 与模块内其他 download helper 同 pre-existing 模式

## M06 — 研发修改与修改审批

## 并发与一致性

- **无实体级乐观锁**：`BaseEntity` 未启用 `@Version`。修改单 `submit`、成员 `refreshAttendance` 与 `RdModifyLockScheduler` 锁定之间存在极低概率竞态；修改审批 `submit` 在 Application 层有事务，前端 `isPending` 已兜底双击。接受 last-writer-wins 或无害覆盖。
- **修改审批并发提交**：同上；非 Leader 无法提交。

## 性能与规模

- **`lockDue()` 全量加载**：到期修改单一次性 `findByStageInAndDeadlineLessThanEqual` 载入内存；当前批次规模可接受，大批量时需分页游标。
- **锁定台账写入 N+1**：`RdModifyLedgerWriterImpl.writeLockSnapshot` 按明细逐条 `save`；单行数少时可接受。
- **Redisson 租约 120s**：`RdModifyLockServiceImpl` 固定 `leaseTime=120s`；极端慢事务下租约可能提前释放，依赖 per-revision 锁 + ShedLock 降低双写概率。

## 数据模型

- **研发修改审批明细唯一键**：`uniq_rd_modify_approval_detail` 含 `work_date`，研发行 `work_date IS NULL` 导致 MySQL 唯一约束对 RD 行不生效；幂等靠审批单级 `active_unique_token` + 生成前查找 + ShedLock。

## 运维与 API

- **手工触发同步执行**：`POST .../lock-due` 等在 HTTP 线程同步扫表；内部幂等，大批量可能触发网关超时，属既有运维触发模式。
- **空明细锁定**：数据异常时修改单可无明细仍进入 `LOCKED`；正常生成路径保证有明细。

## 测试与后续优化

- **DB 集成测试**：已具备 `AbstractMysqlIntegrationTest`（Testcontainers `mysql:8.0` + `@ActiveProfiles("integration-test")`）；M06 覆盖含 `RdModifyServiceGenerateIdempotencyIT`（`generateForBatch` 幂等）、`TsRdModifyApprovalUniqueTokenTest`（审批明细唯一键语义）。锁路径全链路 IT 仍可按需补充。
- **`MfgTodoPushClient` 命名**：已承载全模块待办推送，重命名待集中重构窗口。
- **M05 审批催办查询**：`RdApprovalServiceImpl` 仍 `findByStatus(PENDING)` 全表过滤，M06 催填已用范围查询，M05 优化不在本模块交付范围。
