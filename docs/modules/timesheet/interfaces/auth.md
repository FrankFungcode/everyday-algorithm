# timesheet — 鉴权上下文与 admin 守卫

## 鉴权上下文

- `GET /timesheet/auth/context`
  - 返回：`TimesheetAuthContextVo`
  - 字段：
    - `roles`
    - `businessFacts`

`businessFacts` 当前包含：

- `hasProjectMemberAsLeader`
- `hasProjectAsManager`
- `hasProjectAsFinanceAccountant`
- `hasMfgApplicationAsSupervisor`
- `hasMfgApplicationAsSupplementHandler`
- `hasMfgApplicationAsManager`
- `canUseMfgAssetCode` — 主部门落在 `timesheet.mfg.asset-code-scope` 展开子树内（`MfgAssetCodeScopeSupport.isInScope`）

## `/timesheet/admin/**` 守卫汇总

## 运维手工触发（`*-trigger`）

全部 `*TriggerController` 类级守卫：`@PreAuthorize("@timesheetAuthService.hasAnyRole('SYSTEM_ADMIN')")`，并受 `nexa.timesheet.manual-triggers-enabled` 开关控制。前端入口：`/timesheet/admin/ops/triggers`（仅 `SYSTEM_ADMIN` 菜单可见）。

路径前缀示例：

- `/timesheet/mfg/generation/trigger/*`、`/timesheet/mfg/supplement-trigger/*`、`/timesheet/mfg/reminder-trigger/*`
- `/timesheet/rd/generation/trigger/*`、`/timesheet/rd/lock-trigger/*`
- `/timesheet/rd/approval-trigger/*`
- `/timesheet/rd/modify-trigger/*`、`/timesheet/rd/modify-approval-trigger/*`

弹窗选择数据源（仅 `SYSTEM_ADMIN`，供 `/timesheet/admin/ops/triggers`）：

- `GET /timesheet/admin/ops/trigger-options/rd-batches`
- `GET /timesheet/admin/ops/trigger-options/rd-modifies`
- `GET /timesheet/admin/ops/trigger-options/rd-modify-approvals`

## 非 admin 写接口守卫

- `/timesheet/projects` 的 `POST`：`MFG_ADMIN` / `RD_ADMIN` / `SYSTEM_ADMIN` / `PROJECT_FINANCE`
- `/timesheet/projects` 的 `PUT`：无角色 PreAuthorize；Service 校验管理员或该项目 `financeAccountantId`

### 基础数据主数据

- `/timesheet/base/member-roles*`、`/timesheet/base/factories*`、`/timesheet/base/product-factories*`
  - `MFG_ADMIN` / `RD_ADMIN` / `BUSINESS_ADMIN` / `SYSTEM_ADMIN`（含列表、导入、导出、批量删除）

### 申请单

- `admin/mfg/applications*`：`MFG_ADMIN` / `RD_ADMIN` / `BUSINESS_ADMIN` / `SYSTEM_ADMIN`
- `admin/rd/applications*`：`PROJECT_FINANCE` / `RD_ADMIN` / `BUSINESS_ADMIN` / `SYSTEM_ADMIN`

### 补填与催办

- `admin/mfg/supplements*`：`MFG_ADMIN` / `RD_ADMIN` / `BUSINESS_ADMIN` / `SYSTEM_ADMIN`
- `admin/mfg/reminders*`：`MFG_ADMIN` / `RD_ADMIN` / `BUSINESS_ADMIN` / `SYSTEM_ADMIN`

### 审批

- `admin/rd/approvals*`：`PROJECT_FINANCE` / `RD_ADMIN` / `BUSINESS_ADMIN` / `SYSTEM_ADMIN`

### 台账与报表

- `admin/ledger/rd*`、`admin/ledger/mfg*`、`admin/reports/*`
  - `PROJECT_FINANCE` / `MFG_ADMIN` / `RD_ADMIN` / `BUSINESS_ADMIN` / `SYSTEM_ADMIN`

## 错误语义

- 角色守卫失败：`PERMISSION_DENIED`
- 业务字段校验失败：同样以 `PERMISSION_DENIED` 语义收敛
