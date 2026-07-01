# timesheet — 报表接口

## 自助报表 `/timesheet/reports`

### 月度报表

- `GET /timesheet/reports/monthly`
  - Query: `month`, `departmentId`
- `GET /timesheet/reports/monthly/export`
  - Query 与列表一致

### 项目报表

- `GET /timesheet/reports/project`
  - Query: `projectId`, `startDate`, `endDate`, `granularity`
- `GET /timesheet/reports/project/export`
  - Query 与列表一致

## 管理员视图 `/timesheet/admin/reports`

- `GET /timesheet/admin/reports/monthly`
- `GET /timesheet/admin/reports/monthly/export`
- `GET /timesheet/admin/reports/project`
- `GET /timesheet/admin/reports/project/export`

守卫角色：

- `PROJECT_FINANCE`
- `MFG_ADMIN`
- `RD_ADMIN`
- `BUSINESS_ADMIN`
- `SYSTEM_ADMIN`

## 说明

- 报表返回的是聚合结果，不等同于台账明细列表
- 项目报表支持 `WEEKLY`、`MONTHLY` 两种粒度
- 报表纳入哪些台账阶段，见 `design/ledger-and-reports.md`
