# 快速开始

## 前置条件

- Java 25
- Maven 3.9+（或使用项目自带的 `mvnw`）
- Docker & Docker Compose
- 可访问的 Nacos 实例

## 环境配置

1. 复制环境变量模板：

```bash
cp .env.example .env
```

2. 编辑 `.env`，填写以下配置：

| 变量 | 说明 |
|------|------|
| `NACOS_SERVER_ADDR` | Nacos 服务地址 |
| `NACOS_USERNAME` | Nacos 用户名 |
| `NACOS_PASSWORD` | Nacos 密码 |

3. 在 Nacos 中创建配置：
   - DataId: **`nexa-apps.yaml`**
   - 格式: YAML
   - 内容需包含 `app.hello-message` 等应用配置

## 启动方式

### Docker Compose（推荐）

```bash
docker-compose up -d
```

### Maven 本地运行

```bash
./mvnw spring-boot:run
```

Windows：

```powershell
.\mvnw.cmd spring-boot:run
```

## 验证

启动成功后访问：

- 健康检查：http://localhost:8025/hello
- API 文档：http://localhost:8025/swagger-ui.html

## 项目结构

```
apps/
├── docs/                          # 项目文档（你正在阅读的内容）
├── src/main/java/shokz/nexa/apps/
│   ├── core/                      # 基础设施模块
│   ├── client/                    # 内部服务调用模块
│   └── integration/mk/           # MK 平台集成模块
├── src/main/resources/
│   ├── application.yml            # 主配置
│   ├── application-dev.yml        # 开发环境配置
│   ├── application-test.yaml      # 部署测试环境配置
│   ├── application-prod.yaml      # 生产环境配置
│   └── logback-spring.xml         # 日志配置
├── pom.xml                        # Maven 依赖管理
├── Dockerfile                     # 容器镜像构建
└── docker-compose.yml             # 本地环境编排
```

## 新增业务模块

1. 在 `shokz.nexa.apps` 下创建新包，遵循[架构设计](architecture/architecture.md)中的四层结构
2. 复制 `docs/modules/_template/` 到 `docs/modules/{module-name}/`，填充 `AGENTS.md` / `design.md` / `interfaces.md`
3. 在源码包内创建 `AGENTS.md` 描述代码级上下文
4. 在 [`docs/modules/AGENTS.md`](modules/AGENTS.md) 的模块清单章节追加新模块链接
