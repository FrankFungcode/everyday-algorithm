# client — 内部微服务调用

封装对 Nexa 平台内部微服务（当前为 Org 组织服务）的 OpenFeign 调用，提供 DTO 定义与带缓存的解析器。

## 文件

- [`design.md`](design.md) — 包结构、调用流程、缓存策略、Feign 头透传设计理由
- [`interfaces.md`](interfaces.md) — 对外契约（OrgServiceClient API、UserDto / DepartmentDto、Resolver、UserMappingHelper）

## 代码级上下文

- [`client/AGENTS.md`](../../../src/main/java/shokz/nexa/apps/client/AGENTS.md)
