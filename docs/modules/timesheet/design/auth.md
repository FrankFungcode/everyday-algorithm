# timesheet — 权限模型

工时模块当前采用“管理员角色 + 业务字段过滤”双轨模型。

## 管理员角色

`TimesheetRole` 仅包含 5 个管理员角色：

- `SYSTEM_ADMIN`
- `BUSINESS_ADMIN`
- `PROJECT_FINANCE`
- `MFG_ADMIN`
- `RD_ADMIN`

稳定结论：

- 业务角色（如项目 Leader、制造直属上级、补填处理人、+2 经理）不进入 `TimesheetRole`
- 业务角色仍通过项目成员、申请单或组织关系事实判断

## 角色来源

- `SYSTEM_ADMIN`：来源于全局 `NexaProperties.admin.users`
- 其余 4 个角色：来源于 `TimesheetAdminRolesConfig`
- 比较对象都是当前请求人的用户 id，而不是工号

## 业务事实

`TimesheetBusinessFactsResolver` 为 `/timesheet/auth/context` 汇总以下事实：

- `hasProjectMemberAsLeader`
- `hasProjectAsManager`
- `hasProjectAsFinanceAccountant`
- `hasMfgApplicationAsSupervisor`
- `hasMfgApplicationAsSupplementHandler`
- `hasMfgApplicationAsManager`
- `canUseMfgAssetCode` — 主部门是否落在制造资产编码目标子树内（配置 `timesheet.mfg.asset-code-scope`）

其中 `hasMfgApplicationAsManager` 通过解析补填中申请人的 `+2` 经理得到。

## 工时项目普通视图（`/timesheet/projects`）

- **可见性并集**：参与中成员、成员 Leader、项目经理（`managerId`）、项目财务会计（`financeAccountantId`）
- **写权限**：MFG/RD/BUSINESS/SYSTEM 管理员，或该项目的 `financeAccountantId`（不可变更财务会计字段）
- **新建权限**：MFG/RD/SYSTEM 管理员、配置 `PROJECT_FINANCE`，或任一在研项目的 `financeAccountantId`（与编辑 scoped 财务口径一致；新建时财务会计须为本人）
- **`PROJECT_FINANCE` 配置角色**：不在普通视图放大为全库；全量能力走 `/timesheet/admin/**` 等 admin 路径

## Admin 路径

- 普通业务读接口继续按申请人、Leader、经理、财务会计、处理人等业务字段过滤
- 管理员全量视图通过 `/timesheet/admin/**` 暴露
- Admin 接口统一使用 `@timesheetAuthService.hasAnyRole(...)` 做方法级守卫
- 项目主数据写操作（`POST /timesheet/projects`）：MFG/RD/SYSTEM 管理员、配置 `PROJECT_FINANCE`，或任一项目的 `financeAccountantId`（`@timesheetAuthService.canCreateProject()`）；`PUT` 与单项目成员导入另允许该项目的 `financeAccountantId`（Service 层校验）

## 基础数据主数据（角色 / 工厂 / 产品-工厂）

- 路径：`/timesheet/base/member-roles`、`/timesheet/base/factories`、`/timesheet/base/product-factories`
- 能力：列表、导入模板下载、Excel 导入、导出、批量删除
- 守卫角色（前后端一致）：`MFG_ADMIN` / `RD_ADMIN` / `BUSINESS_ADMIN` / `SYSTEM_ADMIN`
- 轻量角色下拉 `GET /timesheet/member-roles`（项目成员维护用）无管理员角色门槛，仅返回启用角色

前端菜单与页面使用 `BASE_MASTER_DATA_ACCESS`（`apps-client` `base/base-master-data-access.ts`），与工厂/产品数据共用同一规则。

## 配置写权限

`TimesheetAdminAuthorizer` 负责工时域 `BusinessConfig` 写权限：

- `timesheet.mfg.employee-scope`：`MFG_ADMIN` / `BUSINESS_ADMIN` / `SYSTEM_ADMIN`
- `timesheet.mfg.asset-code-scope`：`MFG_ADMIN` / `BUSINESS_ADMIN` / `SYSTEM_ADMIN`
- `timesheet.rd.employee-scope`：`RD_ADMIN` / `BUSINESS_ADMIN` / `SYSTEM_ADMIN`
- `timesheet.rd.monthly-approval.push-departments`：`RD_ADMIN` / `BUSINESS_ADMIN` / `SYSTEM_ADMIN`（与研发申报范围同口径）
- 其它工时配置：`BUSINESS_ADMIN` / `SYSTEM_ADMIN`

## 错误语义

- 角色或配置权限不满足时，统一抛 `PERMISSION_DENIED`
- `@PreAuthorize` 拒绝与业务层手动拒绝最终都收敛到统一错误码语义
