# 0005 — 统一异常体系

## 背景

业务系统需要统一的错误处理机制：将不同类型的异常转换为一致的 API 响应格式，同时保留足够的错误信息供排查。要求：

- 业务异常、框架异常、安全异常分别有合适的日志级别与响应策略
- 错误码集中管理，便于前后端约定
- 调用方只需处理一种返回结构

## 考虑过的方案

| 维度 | 候选 | 取舍 |
|------|------|------|
| 异常类型 | 受检异常 / **运行时异常** | 运行时异常：避免业务方法到处声明 `throws` |
| 错误码 | 字符串常量 / **枚举（ErrorType）** | 枚举：编译期校验、IDE 跳转、便于查找所有错误码 |
| 处理器 | 单一 `@RestControllerAdvice` / **三层分类处理** | 分类：业务 / 框架 / 安全异常的日志级别和响应策略本就不同 |
| 响应包装 | 自定义结构 / **统一 `NexaResponse`** | 统一：前端只处理一种结构，减少分支 |

## 决定

采用 `ErrorType` 枚举 + `NexaException` + 三层 `@ExceptionHandler` 的组合方案。

### 异常分类

| 处理器 | 负责异常 | 场景 |
|--------|---------|------|
| `NexaExceptionHandler` | `NexaException` | 业务异常（预期内的错误） |
| `CommonExceptionHandler` | 参数校验、数据完整性、运行时异常 | 框架级异常 |
| `SecurityExceptionHandler` | `AccessDeniedException` | 权限不足 |

### 使用方式

```java
throw new NexaException(ErrorType.COMMON_NOT_FOUND);
throw new NexaException(ErrorType.COMMON_INVALID_ARGUMENT, "参数错误描述");
throw new NexaException(ErrorType.COMMON_INTERNAL_SERVER_ERROR, cause);
```

所有异常最终都被转换为 `NexaResponse.error(...)`，包含错误码、消息和 traceId。

## 理由

- **`ErrorType` 枚举集中管理**：避免错误码分散为魔法值；新增错误码需走代码评审
- **三层处理器各司其职**：
  - 业务异常 → INFO 级日志 + 4xx
  - 框架异常 → WARN 级日志 + 4xx（参数校验）/ 5xx
  - 安全异常 → WARN 级日志 + 401/403
- **统一 `NexaResponse`**：前端无需处理多种错误格式；traceId 直接来自 MDC，便于关联日志

## 影响

- **正面**：调用方异常处理路径单一；错误码可被 IDE 全文跳转
- **必须遵守**：
  - 业务异常**必须**抛 `NexaException`（不直接抛 `RuntimeException`）
  - 新增错误码**必须**在 `ErrorType` 枚举中声明
  - Controller 不要 `try/catch` 业务异常，直接交全局处理器
- **风险**：`ErrorType` 枚举可能膨胀，需定期审视并合并近似错误
