# integration-mk — MK 平台集成

封装与 MK（蓝凌）平台的所有交互：OAuth / Basic Auth 认证、Feign Client 配置、统一响应模型。仅做协议适配，不含业务逻辑。

## 文件

- [`design.md`](design.md) — 包结构、Token 获取流程、双 Feign 配置、认证选型理由
- [`interfaces.md`](interfaces.md) — MK 开放 API 接口契约（functionCode、请求/响应格式、字段说明）
