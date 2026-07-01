# core — 对外契约

core 不暴露业务 REST 接口；本文件列出**所有业务模块都会复用的 Java API 与约定**。

## 统一响应：`NexaResponse<T>`

```java
public class NexaResponse<T> {
    Integer code;        // 0=成功，非 0=失败
    String  message;     // "success" 或错误描述
    T       data;        // 业务数据，可为 null
    Instant timestamp;   // 自动填充
    String  traceId;     // 自动从 MDC 取
    String  service;     // 自动填充服务名

    static <T> NexaResponse<T> success();
    static <T> NexaResponse<T> success(T data);
    static NexaResponse<Void> error(NexaException e);

    Optional<T> optionalData();              // 取数据为 Optional（不检查 code）
    T mandatoryData() throws ErrorResponseException; // 必须成功且有数据
    boolean isSuccess();                     // code == 0
}
```

**约定**：所有 Controller 必须返回 `NexaResponse<T>`；Feign Client 也必须把 `NexaResponse<T>` 作为返回类型。

## 分页：`PagedDataDTO<T>` + `PageParam`

```java
public class PagedDataDTO<T> {
    List<T> data;
    long    total;
    boolean hasMore;
}

public class PageParam {
    int page;       // 从 0 开始
    int size;       // 默认 20
    String sort;    // 字段名,方向（如 "createdAt,desc"）

    Pageable toPageRequest();
    Pageable toStableOrderPageRequest();   // 强制追加 id 兜底排序
}
```

`BaseMapper` 提供 `toPagedDto(Page<E>, Function<E, V>)` 通用转换。

## 实体基类：`BaseEntity`

| 字段 | 类型 | 来源 |
|------|------|------|
| `id` | `UUID` | Hibernate `@UuidGenerator(style=VERSION_7)` |
| `createdAt` | `Instant` | `@CreatedDate` |
| `updatedAt` | `Instant` | `@LastModifiedDate` |
| `createdBy` | `String` | `AuditorAwareImpl`（`ContextUtil`） |
| `updatedBy` | `String` | 同上 |
| `deleted` | `boolean` | `@SoftDelete`（查询自动过滤） |

**约定**：所有业务实体**必须**继承。

## 仓储基类：`BaseRepo<E, ID>`

```java
public interface BaseRepo<E, ID> extends JpaRepository<E, ID>, JpaSpecificationExecutor<E> {
    E findByIdOrThrow(ID id);     // 找不到抛 NexaException(NOT_FOUND)
    Optional<E> findByIdOrNull(ID id);
}
```

业务 Repository 必须 `extends BaseRepo<MyEntity, UUID>`。

## 异常：`NexaException` + `ErrorType`

```java
public class NexaException extends RuntimeException {
    NexaException(ErrorType type);
    NexaException(ErrorType type, String detail);
    NexaException(ErrorType type, Throwable cause);

    int getErrorCode();
    String getDisplayMessageForResponse();
}

public enum ErrorType {
    COMMON_NOT_FOUND, COMMON_INVALID_ARGUMENT, COMMON_FORBIDDEN,
    COMMON_INTERNAL_SERVER_ERROR, COMMON_UNAUTHORIZED,
    CONFIG_VALUE_NOT_SET, CONFIG_VALUE_CORRUPTED,
    // ... 更多
}
```

**约定**：业务异常必须用 `NexaException` + `ErrorType`，不直接抛 `RuntimeException`。

## 请求上下文：`ContextUtil`

```java
public final class ContextUtil {
    static String getCurrentOperatorId();         // 来自 X-Requester-Id 请求头
    static String getCurrentOperatorType();       // 来自 X-Requester-Type
    static @Nullable String getCurrentOperatorIdOrNull();
}
```

由 `MdcLoggingFilter` 在请求入口写入 MDC，整个请求生命周期内可任意位置读取。

## 动态查询：`GenericSpecification`

```java
GenericSpecification<MyEntity> spec = GenericSpecification.<MyEntity>builder()
    .eq(MyEntity::getStatus, status)
    .like(MyEntity::getName, keyword)
    .ge(MyEntity::getCreatedAt, from)
    .in(MyEntity::getId, ids)
    .build();
List<MyEntity> rows = repo.findAll(spec);
```

基于 `SFunction`（可序列化方法引用）解析字段名，编译期类型安全。

## 工具类

| 类 | 主要方法 |
|----|---------|
| `DistributedLockUtil` | `lock(name, ttl, action)` / `tryLock(...)` / `withLock(...)`；分布式任务调度 |
| `RedissonUtil` | `get(key)` / `set(key, value, ttl)` / 线程安全版本 |
| `JsonUtil` | `toJson(obj)` / `fromJson(json, type)`，复用 Spring `ObjectMapper` |
| `Constant` | 全局常量定义 |

## 业务配置：`@BusinessConfig`

```java
@Data
@BusinessConfig(name = "push.dept.whitelist", module = "push", description = "推送白名单")
public class PushDeptWhitelist {
    private List<String> deptIds;
}
```

注入即可使用，getter 实时从数据库读取（30s Caffeine 缓存）。详见 [businessconfig CONTEXT](../../../src/main/java/shokz/nexa/apps/core/businessconfig/AGENTS.md)。

写权限通过 `@BusinessConfig(authorizer = MyAuthorizer.class)` 声明，`MyAuthorizer implements BusinessConfigAuthorizer`。

## 必须遵守的约定

- Controller 返回 `NexaResponse<T>`
- 业务异常用 `NexaException(ErrorType.XXX)`
- 实体继承 `BaseEntity`，Repository 继承 `BaseRepo`
- 不在业务代码中清空 MDC
- 所有 schema 变更走 Flyway
