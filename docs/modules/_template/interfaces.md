# {模块名} — 对外契约

<!--
本文件描述本模块对外暴露的所有契约：
- REST API（如有 Controller）
- 数据传输对象（VO / Param / Command）
- 暴露的内部 Bean（被其他模块注入使用的 Service / 工具）
- 外部系统接口（如对接的第三方 API、Feign Client）
- 错误码（本模块新增的 ErrorType）
-->

## REST API

### 资源 A

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/{module}/{id}` | 根据 ID 查询 |
| POST | `/{module}` | 创建 |
| PUT | `/{module}/{id}` | 更新 |
| DELETE | `/{module}/{id}` | 删除 |

请求体 / 响应体示例：

```json
{
  "field1": "value",
  "field2": 123
}
```

## 数据传输对象

| 类 | 用途 | 关键字段 |
|----|------|---------|
| `XxxParam` | Controller 入参 | ... |
| `XxxVo` | Controller 返回 | ... |
| `XxxCommand` | Service 入参（字段较多时） | ... |

## 暴露的内部 API（供其他模块注入）

| Bean | 方法 | 说明 |
|------|------|------|
| `XxxService` | `doSomething(...)` | ... |

## 外部系统接口

如本模块对接外部系统，列出 Feign Client / HTTP Client 的关键方法。

## 错误码

本模块新增的 `ErrorType`：

| 枚举值 | code | 含义 |
|--------|------|------|
| `XXX_NOT_FOUND` | 4xxxxx | ... |
