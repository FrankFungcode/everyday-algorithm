# MK 接口对接文档

## 概述

本文档描述与 MK 系统（人事/考勤平台）对接的开放 API 接口规范。所有接口均通过统一的集成网关调用，以 `functionCode` 区分不同业务功能。

## 通用说明

### 基础信息

| 项目 | 说明 |
|---|---|
| 测试环境 | `https://mktest.shokz.com.cn:8088` |
| 生产环境 | 见 Nacos 配置 `mk.domain` |
| 统一入口路径 | `/openapi/tic-definition/integrationInterface/call` |
| 请求方式 | `POST` |
| Content-Type | `application/json` |

### 认证方式

所有接口在 URL Query 中携带 `access_token`：

```
POST {baseUrl}/openapi/tic-definition/integrationInterface/call?functionCode={functionCode}&access_token={token}
```

`access_token` 通过 OAuth2 接口获取，由 `MkAccessTokenService` 自动管理缓存与刷新，调用方无需手动处理。

### 通用响应格式

```json
{
  "success": true,
  "code": "return.optSuccess",
  "msg": "您的操作已成功！",
  "data": { },
  "traceId": "xxx"
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| success | boolean | 是否成功 |
| code | string | 响应码，成功为 `return.optSuccess` |
| msg | string | 响应消息 |
| data | object/array | 业务数据，结构因接口而异 |
| traceId | string | 链路追踪 ID |

---

## 接口列表

### 1. 查询成本中心

**functionCode**：`function_c11e4f8ec4a5bb2b`

**功能**：查询企业成本中心信息，支持按名称或编码过滤。

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| name | string | 否 | 成本中心名称，模糊匹配，不填则不过滤 |
| code | string | 否 | 成本中心编码，不填则不过滤 |

```json
{
  "name": "",
  "code": ""
}
```

#### 响应数据（`data` 为数组）

| 字段 | 类型 | 说明 |
|---|---|---|
| name | string | 成本中心名称 |
| code | string | 成本中心编码 |
| feeType | string | 费用类型，如 "20" |
| status | string | 状态，"1" 为启用 |

```json
{
  "success": true,
  "code": "return.optSuccess",
  "msg": "您的操作已成功！",
  "data": [
    {
      "name": "变更后名称1",
      "code": "test001",
      "feeType": "20",
      "status": "1"
    }
  ],
  "traceId": "xxx"
}
```

---

### 2. 查询项目

**functionCode**：`TODO - 待 MK 方提供`

**功能**：查询项目信息，支持按名称、编码、主数据 ID 或类型过滤。

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| name | string | 否 | 项目名称，不填则不过滤 |
| code | string | 否 | 项目编码，不填则不过滤 |
| mdmid | string | 否 | 主数据 ID，不填则不过滤 |
| type | string | 否 | 项目类型，如 "研发项目"、"奖金项目" |

```json
{
  "name": "",
  "code": "",
  "mdmid": "",
  "type": "研发项目"
}
```

#### 响应数据（`data` 为数组）

| 字段 | 类型 | 说明 |
|---|---|---|
| name | string | 项目名称 |
| code | string | 项目编码 |
| mdmid | string | 主数据 ID |
| type | string | 项目类型 |
| status | string | 状态，"1" 为启用 |
| start_date | long | 开始日期，Unix 时间戳（毫秒） |
| end_date | long | 结束日期，Unix 时间戳（毫秒） |
| subtype | string | 项目子类型 |

```json
{
  "success": true,
  "code": "return.optSuccess",
  "msg": "您的操作已成功！",
  "data": [
    {
      "name": "修改创建者测试1",
      "code": "J20240925006",
      "mdmid": "XM202409250004",
      "type": "奖金项目",
      "status": "1",
      "start_date": 1726675200000,
      "end_date": 1726675200000,
      "subtype": "奖金项目"
    }
  ],
  "traceId": "xxx"
}
```

---

### 3. 查询员工日考勤汇总

**functionCode**：`tic_process_69b23bd25efb1597`

**功能**：查询某员工某日的考勤工时汇总，包括工作时长、加班时长、带薪假、无薪假等。

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| date | string | 是 | 查询日期，格式 `YYYY-MM-DD` |
| jobNumber | string | 是 | 员工工号 |

```json
{
  "date": "2026-02-06",
  "jobNumber": "013487"
}
```

#### 响应数据（`data` 为对象）

| 字段 | 类型 | 说明 |
|---|---|---|
| worktime_total_hour | double | 当日工作总时长（小时） |
| overtime_total_hour | double | 当日加班总时长（小时） |
| holiday_salaried_hour | double | 带薪假时长（小时） |
| holiday_no_salary_hour | double | 无薪假时长（小时） |

```json
{
  "success": true,
  "code": "return.optSuccess",
  "msg": "您的操作已成功！",
  "data": {
    "worktime_total_hour": 0.0,
    "overtime_total_hour": 0.0,
    "holiday_salaried_hour": 0.0,
    "holiday_no_salary_hour": 8.0
  },
  "traceId": "xxx"
}
```

---

### 4. 查询员工某日请假单

**functionCode**：`tic_process_2ed76ec784326570`

**功能**：查询某员工在指定日期覆盖的所有请假单记录。

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| date | string | 是 | 查询日期，格式 `YYYY-MM-DD` |
| jobNumber | string | 是 | 员工工号 |

```json
{
  "date": "2026-03-02",
  "jobNumber": "012863"
}
```

#### 响应数据（`data` 为数组）

无有效请假单时，MK 仍可能返回仅含 `emp_no`、`attendance_date` 的占位对象（无 `leave_order_code` 或为空）。对接侧以 **`leave_order_code` 非空** 作为「存在请假单」的判定。

| 字段 | 类型 | 说明 |
|---|---|---|
| leave_order_code | string | 请假单号；为空则本条不计为请假单 |
| emp_no | string | 员工工号 |
| attendance_date | string | 考勤日期，格式 `YYYY-MM-DD HH:mm:ss` |
| leave_order_begin_date | string | 请假开始日期 |
| leave_order_end_date | string | 请假结束日期 |
| leave_orde_begin_time | string | 请假开始时间，格式 `HH:mm`（注：字段名为 MK 原始拼写，`order` 缺少 `r`） |
| leave_order_end_time | string | 请假结束时间，格式 `HH:mm` |
| leave_order_hour | double | 本次请假时长（小时） |
| leave_order_reason | string | 请假原因 |

```json
{
  "success": true,
  "code": "return.optSuccess",
  "msg": "您的操作已成功！",
  "data": [
    {
      "leave_order_begin_date": "2026-03-02 00:00:00",
      "leave_order_end_date": "2026-03-02 00:00:00",
      "leave_order_hour": 0.5,
      "emp_no": "012863",
      "leave_order_end_time": "08:30",
      "leave_order_reason": "事假",
      "attendance_date": "2026-03-02 00:00:00",
      "leave_order_code": "LO20260304000002",
      "leave_orde_begin_time": "08:00"
    }
  ],
  "traceId": "xxx"
}
```

---

### 5. 查询员工某日补卡单

**functionCode**：`tic_process_7fb3e3f869cdb919`

**功能**：查询某员工在指定日期的补卡申请记录。

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| date | string | 是 | 查询日期，格式 `YYYY-MM-DD` |
| jobNumber | string | 是 | 员工工号 |

```json
{
  "date": "2026-03-02",
  "jobNumber": "012863"
}
```

#### 响应数据（`data` 为数组）

无有效补卡单时，MK 仍可能返回仅含 `emp_no`、`attendance_date` 的占位对象（无 `sign_card_order_code` 或为空）。对接侧以 **`sign_card_order_code` 非空** 作为「存在补卡单」的判定（与请假单、出差单对 `*_order_code` 的判定一致）。

| 字段 | 类型 | 说明 |
|---|---|---|
| sign_card_order_code | string | 补卡单号；为空则本条不计为补卡单 |
| emp_no | string | 员工工号 |
| attendance_date | string | 考勤日期，格式 `YYYY-MM-DD HH:mm:ss` |
| sign_card_order_date | string | 补卡申请日期 |
| sign_card_order_time | string | 补卡时间点，格式 `HH:mm` |
| sign_card_order_reason | string | 补卡原因 |

```json
{
  "success": true,
  "code": "return.optSuccess",
  "msg": "您的操作已成功！",
  "data": [
    {
      "sign_card_order_time": "08:00",
      "emp_no": "012863",
      "sign_card_order_code": "1006847",
      "attendance_date": "2026-03-02 00:00:00",
      "sign_card_order_reason": "忘打卡",
      "sign_card_order_date": "2026-03-02 00:00:00"
    }
  ],
  "traceId": "xxx"
}
```

---

### 6. 查询员工某日出差单

**functionCode**：`tic_process_ce7841b00db88fb0`

**功能**：查询某员工在指定日期覆盖的出差申请记录。

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| date | string | 是 | 查询日期，格式 `YYYY-MM-DD` |
| jobNumber | string | 是 | 员工工号 |

```json
{
  "date": "2026-03-02",
  "jobNumber": "012863"
}
```

#### 响应数据（`data` 为数组）

无有效出差单时，MK 仍可能返回仅含 `emp_no`、`attendance_date` 的占位对象（无 `trip_order_code` 或为空）。对接侧以 **`trip_order_code` 非空** 作为「存在出差单」的判定。

| 字段 | 类型 | 说明 |
|---|---|---|
| trip_order_code | string | 出差单号；为空则本条不计为出差单 |
| emp_no | string | 员工工号 |
| attendance_date | string | 考勤日期，格式 `YYYY-MM-DD HH:mm:ss` |
| trip_order_begin_date | string | 出差开始日期 |
| trip_order_end_date | string | 出差结束日期 |
| trip_order_begin_time | string | 出差开始时间，格式 `HH:mm` |
| trip_order_end_time | string | 出差结束时间，格式 `HH:mm` |
| trip_order_reason | string | 出差原因 |

```json
{
  "success": true,
  "code": "return.optSuccess",
  "msg": "您的操作已成功！",
  "data": [
    {
      "trip_order_begin_time": "13:00",
      "trip_order_reason": "客户拜访",
      "emp_no": "012863",
      "trip_order_end_time": "20:20",
      "trip_order_code": "BT20260304000007",
      "trip_order_begin_date": "2026-03-02 00:00:00",
      "attendance_date": "2026-03-02 00:00:00",
      "trip_order_end_date": "2026-03-02 00:00:00"
    }
  ],
  "traceId": "xxx"
}
```

---

### 7. 查询资产台账

**functionCode**：`function_b926ac4894a540f8`

**功能**：查询 MK 资产台账。MK 侧已内置制造工时可选范围过滤（启用 + 自制/更新改造申请单 + 分类名不含「模具」）。入参传入则筛选，不传则返回全部符合内置规则的数据。

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| fd_assetNo | string | 否 | 资产编码；传入则按编码筛选 |
| fd_assetName | string | 否 | 资产名称；传入则按名称筛选 |

**组合语义**：两字段**同时传入时为 AND**（须同时满足编码与名称筛选条件）。

```json
{
  "fd_assetNo": "123",
  "fd_assetName": "主机"
}
```

#### 响应数据（`data` 为数组）

| 字段 | 类型 | 说明 |
|---|---|---|
| fd_assetNo | string | 资产编码 |
| fd_assetName | string | 资产名称 |

> 对接侧将 `fd_assetNo` / `fd_assetName` 映射为工时系统 `assetCode` / `assetName`。提交启用校验（BR-MA-024）：仅传 `fd_assetNo` 精确查询，能查到即视为启用。下拉 keyword 搜索（编码 OR 名称）：分别单字段查询后合并去重，勿将同一 keyword 双字段同传（AND 会过窄）。

---

## 待确认事项

| 编号 | 问题 | 状态 |
|---|---|---|
| 1 | 接口 2（查询项目）的 `functionCode` 未在原始文档中提供，需向 MK 方确认 | ⚠️ 待确认 |
| 2 | 查询资产：同时传 `fd_assetNo` 与 `fd_assetName` 时的组合语义 | ✅ 已确认：AND |

---

## 代码对接位置

| 内容 | 路径 |
|---|---|
| Feign 客户端 | `integration/mk/MkInterfaceClient.java` |
| 请求 DTO | `integration/mk/request/Mk*Query.java` |
| 响应 DTO | `integration/mk/response/Mk*Dto.java` |
| Token 管理 | `integration/mk/auth/MkAccessTokenService.java` |
| OAuth Feign 配置 | `integration/mk/config/MkFeignOAuthConfig.java` |
