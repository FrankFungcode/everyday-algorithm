# timesheet — 下载、导入与外部刷新契约

本页只记录 Controller 层可见的“二进制下载 / multipart 导入 / 考勤刷新”契约。

## 二进制下载

返回类型为 Excel 或 `application/octet-stream` 的接口包括：

- `GET /timesheet/projects/export`
- `GET /timesheet/projects/import-template`
- `GET /timesheet/projects/members/batch-import-template`
- `GET /timesheet/projects/{id}/members/import-template`
- `GET /timesheet/base/factories/export`
- `GET /timesheet/base/factories/import-template`
- `GET /timesheet/base/product-factories/export`
- `GET /timesheet/base/product-factories/import-template`
- `GET /timesheet/rd/budget-allocations/export`
- `GET /timesheet/rd/budget-allocations/import-template`
- `GET /timesheet/ledger/rd/export`
- `GET /timesheet/ledger/mfg/export`
- `GET /timesheet/reports/monthly/export`
- `GET /timesheet/reports/project/export`
- `GET /timesheet/admin/ledger/rd/export`
- `GET /timesheet/admin/ledger/mfg/export`
- `GET /timesheet/admin/reports/monthly/export`
- `GET /timesheet/admin/reports/project/export`

## multipart 导入

统一使用字段名 `file`：

- `POST /timesheet/projects/import`
- `POST /timesheet/projects/members/batch-import`
- `POST /timesheet/projects/{id}/members/import`
- `POST /timesheet/base/factories/import`
- `POST /timesheet/base/product-factories/import`
- `POST /timesheet/rd/budget-allocations/import`

## 考勤刷新

这些接口会触发考勤刷新（优先读本地缓存，必要时回落 MK）：

- `GET /timesheet/mfg/applications/{batchId}/attendance`
- `GET /timesheet/mfg/supplements/members/{memberId}/batches/{batchId}/attendance`
- `GET /timesheet/rd/applications/{batchId}/attendance`
- `GET /timesheet/rd/modifies/{id}/attendance`

说明：

- 研发申请/修改单刷新走 S-08 缓存优先（`EmployeeDailyAttendanceService`）；制造补填同理
- 这些接口对外暴露的是“刷新入口”
- MK、Org、日历、钉钉等内部客户端与 after-commit 出站实现属于设计层，见 `../design/`
