# timesheet — 台账接口

## 研发台账 `/timesheet/ledger/rd`

- `GET /timesheet/ledger/rd`
  - Query: `memberId`, `projectId`, `belongingMonth`, `reportingWeekStart`, `stage`, `formType`, `modifyApprovalStatus`（可选，`PENDING` / `APPROVED` / `REJECTED`）, `pageable`
  - `formType` 支持 `RD_APPLICATION`、`RD_MODIFICATION`
- `GET /timesheet/ledger/rd/{id}`
  - Detail: M06 修改流程字段 `modifiedHours`、`modifiedRemark`、`modifyApprovalStatus`、`modifyApprovalRemark` 可为 `null`
- `GET /timesheet/ledger/rd/export`
  - Query 与列表一致；Excel 列含「是否直管」（来自投影 `is_direct_managed` 快照，`true`→是，否则→否）

### `RdLedgerItemVo` 补充字段

| 字段 | 来源 |
| ------ | ------ |
| `isDirectManaged` | `ts_ledger_projections.is_direct_managed`（列表/导出；null 按非直管展示） |

- `GET /timesheet/ledger/rd/import-template`
  - 返回 PRD §3.2 列结构的 xlsx 模板（二进制）
  - 权限：`PROJECT_FINANCE`、`MFG_ADMIN`、`RD_ADMIN`、`BUSINESS_ADMIN`、`SYSTEM_ADMIN`
- `POST /timesheet/ledger/rd/import`
  - `multipart/form-data`，字段 `file`（`.xlsx`）
  - 响应 `RdLedgerImportResultVo`：`successCount`、`failureCount`、`errors[]`（`excelRowNum` + `reason`，按行号升序）；`failureCount > 0` 时含 `errorFileName`、`errorFileBase64`（错误明细 xlsx）

### `RdLedgerImportResultVo` / `RdLedgerImportErrorVo`

| 字段 | 类型 | 说明 |
| ------ | ------ | ------ |
| `successCount` | int | 写入成功行数 |
| `failureCount` | int | 失败行数 |
| `errors` | `RdLedgerImportErrorVo[]` | 行级错误列表 |
| `errors[].excelRowNum` | int | Excel 行号（含表头偏移） |
| `errors[].reason` | string | 合并后的失败原因（`;` 分隔多因） |
| `errorFileName` | string? | 仅失败时：如 `研发台账导入错误_yyyyMMddHHmmss.xlsx` |
| `errorFileBase64` | string? | 仅失败时：错误明细 workbook Base64 |

写入规则：自然键 upsert；新增/更新均强制 `submitSource=WORK_HOUR_CORRECTION`；不修改 `modified_hours`、`modify_approval_status` 等 M06 字段。

## 制造台账 `/timesheet/ledger/mfg`

- `GET /timesheet/ledger/mfg`
  - Query: `memberId`, `projectId`, `reportingDate`, `reportingDateFrom`, `reportingDateTo`, `belongingMonth`, `stage`, `factoryId`, `productId`, `productStatusKeyword`, `assetCode`（精确匹配）, `modifyApprovalStatus`（可选）, `pageable`
- `GET /timesheet/ledger/mfg/{id}`
- `GET /timesheet/ledger/mfg/export`
  - Query 与列表一致

制造台账列表/导出 `MfgLedgerItemVo` 在投影字段之外，另从申请明细与表头 state 拼装：

| 字段 | 来源 |
| ------ | ------ |
| `memberDepartment` | Org `UserDto.parentDepartments` 末级部门名 |
| `memberDepartmentNo` | Org `UserDto.parentDepartments` 末级部门编号（导出列「部门编码」） |
| `workContent` | `ts_mfg_applications.work_content`（`detail_id`） |
| `isWorking` | `ts_mfg_application_states.is_working`（`batch_id` + `member_id`） |
| `isFullDayLeave` | `ts_mfg_application_states.is_full_day_leave` |
| `assetCode` | `ts_ledger_projections.asset_code`（M02 资产快照；可为 null） |
| `assetName` | `ts_ledger_projections.asset_name` |

研发台账导出 `RdLedgerItemVo.isDirectManaged`：按 `project_id` + `member_id` 读 `ts_project_members.is_direct_managed`；无成员行时回退台账投影快照；非项目工时为 `false`。Excel 列「是否直管」位于「项目名称」之后。

## 管理员视图

### 研发

- `GET /timesheet/admin/ledger/rd`
  - Query: `memberId`, `projectId`, `belongingMonth`, `reportingWeekStart`, `stage`, `formType`, `modifyApprovalStatus`（可选，`PENDING` / `APPROVED` / `REJECTED`）, `pageable`
- `GET /timesheet/admin/ledger/rd/{id}`
  - Detail 字段与研发台账详情一致
- `GET /timesheet/admin/ledger/rd/export`
  - Query 与列表一致
- `GET /timesheet/admin/ledger/rd/import-template`
  - 与 `GET /timesheet/ledger/rd/import-template` 相同模板与权限
- `POST /timesheet/admin/ledger/rd/import`
  - 与 `POST /timesheet/ledger/rd/import` 相同语义与权限

### 制造

- `GET /timesheet/admin/ledger/mfg`
  - Query: `memberId`, `projectId`, `reportingDate`, `reportingDateFrom`, `reportingDateTo`, `belongingMonth`, `stage`, `factoryId`, `productId`, `productStatusKeyword`, `assetCode`（精确匹配）, `modifyApprovalStatus`（可选，`PENDING` / `APPROVED` / `REJECTED`）, `pageable`
- `GET /timesheet/admin/ledger/mfg/{id}`
- `GET /timesheet/admin/ledger/mfg/export`
  - Query 与列表一致

守卫角色：

- `PROJECT_FINANCE`
- `MFG_ADMIN`
- `RD_ADMIN`
- `BUSINESS_ADMIN`
- `SYSTEM_ADMIN`

## 说明

- 详情接口会校验投影所属域；不匹配时按“未找到”处理
- 导出接口返回二进制 Excel，详见 `external-integrations.md`
- 台账可见范围与报表纳入规则不同，详见 `design/ledger-and-reports.md`
