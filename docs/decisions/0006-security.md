# 0006 — 安全策略

> **状态**：Accepted

## 背景

作为微服务体系中的业务应用服务，需要确定认证与授权策略。认证由 nexa-gateway 统一完成。

## 决策

### 当前阶段

- Spring Security 配置为 `permitAll`，CSRF 禁用，Session 无状态
- 操作人身份通过请求头 `X-Requester-Id` / `X-Requester-Type` 由网关或上游服务传入
- `ContextUtil` 提取请求头信息供业务层使用

### 演进方向

- 权限控制在业务 Application/Service 层通过 `@PreAuthorize` 实现方法级鉴权
- 网关负责 Token 校验，应用服务信任网关传递的身份信息

## 理由

- 微服务架构中，认证统一在网关层完成，应用服务做细粒度授权
- `permitAll` 仅为应用层默认策略；真实鉴权在网关，业务敏感操作再用 `@PreAuthorize` 补强
- 基于请求头的身份传递是微服务间通信的标准做法

## 影响

- 直接暴露本服务端口时会绕过鉴权；生产环境必须只开放给网关访问
- 所有写操作应把审计人来自 `ContextUtil` 当作强假设；无请求上下文的定时任务必须显式设置
- 新增敏感管理接口时，应补充 `@PreAuthorize` 并在对应模块 `AGENTS.md` / `interfaces.md` 注明所需权限
