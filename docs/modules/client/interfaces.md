# client — 对外契约

client 不暴露 REST 接口；本文件列出**业务模块通过注入使用**的 Feign Client、DTO 与 Resolver。

## OrgServiceClient（Feign）

`@FeignClient(name = "nexa-org", configuration = NexaFeignConfig.class)`

### 用户

| 方法 | 路径 | 说明 |
|------|------|------|
| `findUserById(String id, List<OrgBusinessStatus> statuses)` | `GET /standard/user/{id}` | 按 ID 查；`statuses` 可选，过滤在职/离职等业务状态 |
| `findUserByNo(String no, List<OrgBusinessStatus> statuses)` | `GET /standard/user/by-no/{no}` | 按工号查；`statuses` 可选 |
| `findUsersByIds(List<String> ids)` | `GET /standard/user/by-ids` | 批量按 ID 查 |
| `findUsersByNos(List<String> nos)` | `GET /standard/user/by-nos` | 批量按工号查 |
| `searchUser(keyword, page, size)` | `GET /standard/user/search` | 模糊查（工号/姓名/邮箱），分页 |

### 部门

| 方法 | 路径 | 说明 |
|------|------|------|
| `findDepartmentById(String id)` | `GET /standard/department/{id}` | 按 ID 查 |
| `findDepartmentByNo(String no)` | `GET /standard/department/by-no/{no}` | 按编号查 |
| `findDepartmentsByIds(List<String>)` | `GET /standard/department/by-ids` | 批量按 ID |
| `findDepartmentsByNos(List<String>)` | `GET /standard/department/by-nos` | 批量按编号 |
| `searchDepartment(keyword, page, size)` | `GET /standard/department/search` | 模糊查（编号/名称）分页 |
| `findDepartmentUsers(id, recursive)` | `GET /standard/department/{id}/users` | 部门下用户，可递归 |
| `findDepartmentChildren(id, recursive, includeUsers)` | `GET /standard/department/{id}/children` | 子部门树 |
| `findDeptHead(String id)` | `GET /standard/department/{id}/dept-head` | 部门长（MK dept_head2）；未设置时 `data` 为 null |
| `findEffectiveManager(String id)` | `GET /standard/department/{id}/effective-manager` | 部门有效负责人 |
| `findDepartmentManagementChain(String id)` | `GET /standard/department/{id}/management-chain` | 部门管理链 |
| `findManager(String no)` | `GET /standard/user/by-no/{no}/manager` | 按工号查直属上级 |
| `findUserManagementChain(String no)` | `GET /standard/user/by-no/{no}/management-chain` | 按工号查用户管理链 |
| `findManagedDepartments(String no)` | `GET /standard/user/by-no/{no}/managed-departments` | 按工号查分管部门列表 |

### 钉钉用户

| 方法 | 路径 | 说明 |
|------|------|------|
| `getDingUserByStandardUserId(String)` | `GET /user/by-standard-id/{id}` | 按标准用户 ID 查钉钉用户 |
| `getDingUserByStandardUserIds(List<String>)` | `GET /user/by-standard-ids` | 批量；不存在的 ID 忽略 |
| `getByJobNumbers(List<String>)` | `GET /user/by-job-numbers` | 按工号批量；不存在的工号忽略 |

返回类型统一 `NexaResponse<T>`；用 `mandatoryData()` 取数据（非成功抛 `ErrorResponseException`）或 `optionalData()` 取 `Optional<T>`。

## SystemCalendarClient（Feign）

`@FeignClient(name = "nexa-system", contextId = "systemCalendarFeignClient", qualifiers = "systemCalendarFeignClient", primary = false, configuration = NexaFeignConfig.class)`

提供日历相关查询：单日详情、区间工作日列表、工作日数统计、工作日偏移、是否工作日。返回 `NexaResponse<T>` 包装的 `CalendarDayDto` / `CalendarWorkdayRangeDto` / `WorkdayCountDto` / `WorkdayOffsetDto` / `IsWorkdayDto`。

注入类型为 `SystemCalendarClient` 时默认拿到 **`CachingSystemCalendarClient`**（`@Service` + `@Primary`）：对上述 Feign 方法结果做 **Caffeine 进程内缓存**（`expireAfterWrite` 见 `nexa.timesheet.calendar.cache-ttl-seconds`，默认 300 秒；`NexaLocalCacheTtl` 归一；`maximumSize` 1 万、`recordStats`，风格与 `ConfigSupport` / org `*Resolver` 一致）。需直连 Feign、绕过缓存时注入 `@Qualifier("systemCalendarFeignClient") SystemCalendarClient`。

## 数据传输对象

### 用户

| 类 | 关键字段 |
|----|---------|
| `UserDto` | `id`、`name`、`jobNumber`、`email`、`departmentPath`、`leader` 等 |
| `UserBasicDto` | `id`、`name`、`jobNumber` |
| `DingtalkUserDto` | `name`、`jobNumber`、`avatar`、`unionId` |

### 部门

| 类 | 说明 |
|----|------|
| `DepartmentDto` | 部门完整信息（含 `manager`、`deptHead`（部门长 / MK dept_head2）、`parentDepartments`、`children`、`users`） |
| `DepartmentBasicDto` | 基础信息（id / name / no） |
| `DepartmentTreeDto` | 含 `children` 与可选 `users` |
| `DingtalkDepartmentBasicDto` | 钉钉部门基础信息 |

### 日历（system）

`CalendarDayDto`、`CalendarWorkdayRangeDto`、`WorkdayCountDto`、`WorkdayOffsetDto`、`IsWorkdayDto`、`CalendarDto`；枚举 `DayType`（WORKDAY/HOLIDAY/ADJUSTED_WORKDAY/ADJUSTED_HOLIDAY）、`SourceType`（SYSTEM_INIT/MANUAL_ADJUST/COPY）、`CalendarStatus`（ENABLED/DISABLED）。

## Resolver（推荐业务层使用，带 Caffeine 缓存）

### UserResolver

```java
Optional<UserDto> resolveOptional(String userId);
UserDto           resolveMandatory(String userId);     // 非成功抛错；id 为空抛 IllegalArgumentException
Map<String, UserDto> resolveBatch(List<String> ids);   // 缓存命中 + 批量补查
```

### DepartmentResolver

API 与 `UserResolver` 同形态。

### DingtalkUserResolver

按标准用户 ID 或工号解析钉钉用户。

### UserMappingHelper（MapStruct 集成）

```java
@Mapping(target = "author", source = "authorId", qualifiedByName = "resolveUserById")
```

提供：
- `resolveUserById(String id)` → `UserDto`
- `resolveUsersByIds(List<String>)` → `List<UserDto>` **（与输入同序同长，未命中位置为 `null`）**

## 头透传约定（NexaFeignConfig）

调用方进程的请求头会自动透传到下游：

- `Authorization`
- `X-Requester-Id`
- `X-Requester-Type`

业务无需手动处理，但**新加 Feign Client** 时必须使用 `configuration = NexaFeignConfig.class`，否则不会透传。
