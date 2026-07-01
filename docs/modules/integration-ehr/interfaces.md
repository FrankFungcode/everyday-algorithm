# EHR 考勤接口契约

## 概述

EHR 集成只暴露给后端 Integration 层使用，不新增 REST Controller，不提供前端直连接口。工时业务通过 `MfgAttendanceClient` 固定走 EHR 直连。

## 配置键

### EHR 连接配置

| 配置键 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `ehr.domain` | string | 无 | EHR 域名，必填 |
| `ehr.client-id` | string | 无 | EHR 分配的 clientId，必填 |
| `ehr.secret` | string | 无 | EHR 分配的 secret，必填 |
| `ehr.token-second` | integer | `100` | `/third/getToken` 的 `second` 参数 |
| `ehr.connect-timeout-ms` | integer | `3000` | HTTP connect timeout |
| `ehr.read-timeout-ms` | integer | `10000` | HTTP read timeout |

示例：

```yaml
ehr:
  domain: http://ehr.shokz.com.cn:7085
  client-id: ${EHR_CLIENT_ID}
  secret: ${EHR_SECRET}
  token-second: 100
  connect-timeout-ms: 3000
  read-timeout-ms: 10000
```

## Token 接口

| 项 | 值 |
|----|---|
| Method | `POST` |
| Path | `/third/getToken` |
| Content-Type | `application/x-www-form-urlencoded` |
| 调用方 | `EhrAccessTokenService` |

请求字段：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `clientId` | string | 是 | EHR client id |
| `secret` | string | 是 | EHR secret |
| `second` | integer | 是 | Token 有效秒数 |

成功响应：

```json
{
  "code": 200,
  "success": true,
  "data": {
    "clientId": "client-id",
    "secret": "secret",
    "token": "token"
  },
  "message": "操作成功"
}
```

成功判定：`code == 200 && success == true && data.token` 非空。Token 写入 Redis 键 `nexa:share:ehr_accessToken`，TTL = `ehr.token-second - 60s`，最小 1 秒；刷新锁键为 `nexa:share:ehr_accessToken:refresh_lock`。

## 业务接口 Envelope

五类业务接口统一使用 JSON body：

```json
{
  "paramStr": {
    "paramStr": {},
    "interfaceCode": "getXxxMK"
  },
  "tokenStr": {
    "clientId": "client-id",
    "token": "token"
  }
}
```

公共字段：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `paramStr` | object | 是 | EHR 业务参数 envelope |
| `paramStr.paramStr` | array/object | 是 | 日考勤为规则数组；四类单据为对象 |
| `paramStr.interfaceCode` | string | 是 | EHR interfaceCode |
| `paramStr.pageNum` | string | 日考勤必填 | 日考勤固定 `"1"`；单据接口不发送 |
| `paramStr.pageSize` | string | 日考勤必填 | 日考勤固定 `"10"`；单据接口不发送 |
| `tokenStr.clientId` | string | 是 | EHR client id |
| `tokenStr.token` | string | 是 | `EhrAccessTokenService` 返回的 token |

业务响应公共成功判定：`code == 200 && success == true`。不满足时抛 `EhrApiResponseException`，由 `EhrMfgAttendanceClient` 转换为 `NexaException(COMMON_INTERNAL_SERVER_ERROR, "获取考勤数据失败...")`。

## 五类接口

### 日考勤汇总

| 项 | 值 |
|----|---|
| Path | `/thirdPlatformForeign/call/v2/getAttendanceDataMK` |
| interfaceCode | `getAttendanceDataMK` |
| 返回映射 | `MkDailyAttendanceDto` |

`paramStr.paramStr` 为规则数组：

```json
[
  { "rule": "1", "key": "attendance_date", "value": "2026-06-03" },
  { "rule": "1", "key": "emp_no", "value": "013745" }
]
```

响应字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `worktime_total_hour` | number | 正班/打卡汇总时长 → `MkDailyAttendanceDto.worktimeTotalHour` |
| `overtime_card_hour` | number | 打卡加班时长；**业务加班取本字段** → `MkDailyAttendanceDto.overtimeTotalHour`（对齐历史 MK 低代码） |
| `holiday_salaried_hour` | number | 带薪假时长 |
| `holiday_no_salary_hour` | number | 无薪假时长 |
| `c_is_night` | string | 是否夜班 |
| `overtime_total_hour` | number | EHR 可能返回但**不使用**；加班以 `overtime_card_hour` 为准 |

### 请假单

| 项 | 值 |
|----|---|
| Path | `/thirdPlatformForeign/call/v2/getLeaveOrderMK` |
| interfaceCode | `getLeaveOrderMK` |
| 返回映射 | `MkLeaveOrderDto` |

`paramStr.paramStr` 为对象：

```json
{ "emp_no": "013745", "attendance_date": "2026-06-03" }
```

响应字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `leave_order_code` | string | 请假单号；非空才计为有效请假单 |
| `emp_no` | string | 员工工号 |
| `attendance_date` | string | 考勤日期 |
| `leave_order_begin_date` | string | 请假开始日期 |
| `leave_order_end_date` | string | 请假结束日期 |
| `leave_orde_begin_time` | string | 请假开始时间；兼容 EHR/MK 历史拼写 |
| `leave_order_end_time` | string | 请假结束时间 |
| `leave_order_hour` | number | 请假时长 |
| `leave_order_reason` | string | 请假原因 |

### 补卡单

| 项 | 值 |
|----|---|
| Path | `/thirdPlatformForeign/call/v2/getSignOrderMK` |
| interfaceCode | `getSignOrderMK` |
| 返回映射 | `MkSignCardOrderDto` |

响应字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `sign_card_order_code` | string | 补卡单号；非空才计为有效补卡单 |
| `emp_no` | string | 员工工号 |
| `attendance_date` | string | 考勤日期 |
| `sign_card_order_date` | string | 补卡申请日期 |
| `sign_card_order_time` | string | 补卡时间点 |
| `sign_card_order_reason` | string | 补卡原因 |

正式环境若该接口返回 `code=100009` 或路径未注册，应协调 EHR 侧确认 `getSignOrderMK` 已注册。

### 出差单

| 项 | 值 |
|----|---|
| Path | `/thirdPlatformForeign/call/v2/getTripOrderMK` |
| interfaceCode | `getTripOrderMK` |
| 返回映射 | `MkTripOrderDto` |

响应字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `trip_order_code` | string | 出差单号；非空才计为有效出差单 |
| `emp_no` | string | 员工工号 |
| `attendance_date` | string | 考勤日期 |
| `trip_order_begin_date` | string | 出差开始日期 |
| `trip_order_end_date` | string | 出差结束日期 |
| `trip_order_begin_time` | string | 出差开始时间 |
| `trip_order_end_time` | string | 出差结束时间 |
| `trip_order_reason` | string | 出差原因 |

### 调班单

| 项 | 值 |
|----|---|
| Path | `/thirdPlatformForeign/call/v2/getChangeOrderMK` |
| interfaceCode | `getChangeOrderMK` |
| 返回映射 | `MkChangeOrderDto` |

响应字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `change_order_code` | string | 调班单号 |
| `emp_no` | string | 员工工号 |
| `attendance_date` | string | 考勤日期 |
| `change_order_reason` | string | 调班原因 |

## 上层契约

`EhrMfgAttendanceClient` 实现 `MfgAttendanceClient`，对上层保持以下方法不变：

| 方法 | EHR 行为 |
|------|----------|
| `loadSnapshot(employeeId, reportingDate)` | 并行五路 EHR 查询后聚合为 `AttendanceSnapshot` |
| `loadSnapshotForMfgSystemGeneration(employeeId, reportingDate)` | 委托 `loadSnapshot` |
| `rdDayWorktimePlusOvertimeHours(employeeId, reportingDate)` | 单路日考勤，返回正班 + 加班 |
| `loadDailyAttendance(employeeId, workDate)` | 单路日考勤，供 S-08 本地缓存同步 |

工号无法从 org 用户 id 解析时，`loadSnapshot` 返回 8h 占位快照；`rdDayWorktimePlusOvertimeHours` 返回 0；`loadDailyAttendance` 返回 `null`。远端 HTTP 或业务 code 失败不降级，统一抛业务异常。
