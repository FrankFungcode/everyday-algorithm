# timesheet — 主数据与预算接口

## 项目 `/timesheet/projects`

- `GET /timesheet/projects`
  - Query: `keyword`, `status`, `managerId`, `financeAccountantId`, `pageable`
  - 普通视图：按当前用户可见项目并集过滤（成员 / Leader / 项目经理 / 项目财务会计）；MFG/RD/BUSINESS/SYSTEM 管理员可见全库
- `GET /timesheet/projects/{id}`
  - 可见性规则同列表
- `POST /timesheet/projects`
  - Body: `ProjectCreateParam`
- `PUT /timesheet/projects/{id}`
  - Body: `ProjectUpdateParam`
  - 写权限：MFG/RD/BUSINESS/SYSTEM 管理员，或该项目 `financeAccountantId`（不可改财务会计字段）
- `GET /timesheet/projects/master-options`
  - Query: `keyword`, `pageable`
- `GET /timesheet/projects/project-code-availability`
  - Query: `projectCode`, `excludeProjectId`
- `GET /timesheet/projects/member-projects`
  - Query: `memberId`, `batchDate`
- `GET /timesheet/projects/member-projects/rd-week`
  - Query: `memberId`, `weekStart`, `weekEnd` — 研发申报周内本人参与的在研项目
- `GET /timesheet/projects/member-projects/rd-week/mp-search`
  - Query: `memberId`, `keyword`, `weekStart`, `weekEnd` — 研发手动新增行：按项目简称检索项目简称含 MP 的在研项目（`keyword` 为空返回 `[]`）
- `GET /timesheet/projects/member-projects/mfg`
  - Query: `memberId`, `batchDate`, `productId`
- `GET /timesheet/projects/product-projects`
  - Query: `productId`
- `GET /timesheet/projects/products`

项目写接口守卫角色：

- `POST /timesheet/projects`（新建）：`canCreateProject()` — `MFG_ADMIN` / `RD_ADMIN` / `SYSTEM_ADMIN`、配置 `PROJECT_FINANCE`，或任一项目的 `financeAccountantId`
- `PUT /timesheet/projects/{id}`：上述管理员 **或** 该项目 `financeAccountantId`（Service 校验，无 `@PreAuthorize` 角色门槛）

导入导出：

- `GET /timesheet/projects/export`
- `GET /timesheet/projects/import-template`
- `POST /timesheet/projects/import`
  - multipart: `file`
  - 守卫：`canImportProjectMaster()`（`canCreateProject()` 或 `BUSINESS_ADMIN`）

项目成员批量导入：

- `GET /timesheet/projects/members/batch-import-template`
- `POST /timesheet/projects/members/batch-import`
- `GET /timesheet/projects/{id}/members/import-template`
- `POST /timesheet/projects/{id}/members/import`
  - 写权限同 `PUT /timesheet/projects/{id}`

以上 2 个单项目成员导入接口无 Controller 角色守卫，由 Service 按项目写权限校验。

以下 2 个批量成员导入接口需要 `canImportProjectMaster()`（`canCreateProject()` 或 `BUSINESS_ADMIN`）：

- 配置 `PROJECT_FINANCE` / 任一项目的 `financeAccountantId`
- `MFG_ADMIN`
- `RD_ADMIN`
- `BUSINESS_ADMIN`
- `SYSTEM_ADMIN`

## 轻量工厂下拉 `/timesheet/factories`

- `GET /timesheet/factories`
  - Query: `enabled`, `productId`

## EXT 资产搜索 `/timesheet/ext`

- `GET /timesheet/ext/assets`
  - Query: `keyword`（可选）
  - Response: `NexaResponse<List<AssetOptionVo>>`（`assetCode`, `assetName`）
  - 鉴权：登录即可；MK 侧内置 BR-MA-019 过滤

## 轻量成员角色下拉 `/timesheet/member-roles`

- `GET /timesheet/member-roles`
  - Query: `enabled`（默认 `true`，仅启用角色）

项目成员 `ProjectMemberVo` / 写入项：

- `roleId`（可选，引用 `ts_member_roles.id`；`PUT` 成员更新时显式传 `null` 表示清空主数据角色）
- `memberRole`（`id` / `roleCode` / `roleName`，只读）
- `roleLegacy`（历史自由文本；`roleId` 为空时可写入/返回；变更记录中作为角色旧值展示）

成员属性变更（含角色、Leader、组别等）写入变更记录前缀「成员属性变更：」；成员新增时若指定角色，描述为「成员姓名（角色：角色名）」。角色 diff 按「主数据 `roleId` / 历史 `roleLegacy` / 无」有效态比较；展示名相同但来源不同时（如历史文本切主数据），变更记录用「（历史）」「（主数据）」后缀区分。Excel 导入成员更新亦写入上述明细；仅当导入未产生新增/属性变更明细时，退化为「Excel 导入成员：新增 N 人，更新 M 人」摘要。

## 角色主数据 `/timesheet/base/member-roles`

- `GET /timesheet/base/member-roles`
- `GET /timesheet/base/member-roles/export`
- `GET /timesheet/base/member-roles/import-template`
- `POST /timesheet/base/member-roles/import`
  - multipart: `file`
- `POST /timesheet/base/member-roles/batch-delete`
  - Body: `BatchUuidIdsParam`

守卫角色同工厂主数据（`MFG_ADMIN` / `RD_ADMIN` / `BUSINESS_ADMIN` / `SYSTEM_ADMIN`）。

## 工厂主数据 `/timesheet/base/factories`

- `GET /timesheet/base/factories`
- `GET /timesheet/base/factories/export`
- `GET /timesheet/base/factories/import-template`
- `POST /timesheet/base/factories/import`
  - multipart: `file`
- `POST /timesheet/base/factories/batch-delete`
  - Body: `BatchUuidIdsParam`

## 产品-工厂主数据 `/timesheet/base/product-factories`

- `GET /timesheet/base/product-factories`
- `GET /timesheet/base/product-factories/export`
- `GET /timesheet/base/product-factories/import-template`
- `POST /timesheet/base/product-factories/import`
  - multipart: `file`
- `POST /timesheet/base/product-factories/batch-delete`
  - Body: `BatchUuidIdsParam`

工厂主数据与产品-工厂主数据守卫角色：

- `MFG_ADMIN`
- `RD_ADMIN`
- `BUSINESS_ADMIN`
- `SYSTEM_ADMIN`

## 研发预算占比 `/timesheet/rd/budget-allocations`

- `GET /timesheet/rd/budget-allocations`
  - Query: `projectId`, `belongingMonth`, `memberId`, `memberKeyword`, `pageable`
- `GET /timesheet/rd/budget-allocations/export`
- `GET /timesheet/rd/budget-allocations/import-template`
- `POST /timesheet/rd/budget-allocations/import`
  - multipart: `file`

守卫角色：

- `PROJECT_FINANCE`
- `RD_ADMIN`
- `BUSINESS_ADMIN`
- `SYSTEM_ADMIN`
