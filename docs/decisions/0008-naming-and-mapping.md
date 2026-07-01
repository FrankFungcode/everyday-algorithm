# 0008 DTO/VO 命名与层间映射策略

## 决策

**采用强制后缀 + 映射按需使用。**

### 命名后缀强制规则

**业务层（Controller / Application / Service）：**

| 后缀 | 用途 | 包路径 | 是否继承 `BaseDto` |
|---|---|---|---|
| `*Vo` | Controller 返回给客户端的视图对象 | `{module}/vo/` | 仅"代表实体回显"的继承 |
| `*Dto` | 跨层 / 跨模块数据传输对象，且**不**直接作为 Controller 返回值 | `{module}/dto/` 或 `{module}/service/dto/` | 视实体投影需求而定 |
| `*Param` | Controller 入参（含 Bean Validation） | `{module}/param/` | 否 |
| `*Command` | Service 层入参（字段较多时） | `{module}/command/` | 否 |
| `*Entity` 字段不需后缀 | JPA 实体 | `{module}/entity/` | 必须继承 `BaseEntity` |

**Integration 层（非 SDK 模式自定义 Feign 接口）：**

| 后缀 | 用途 | 包路径 | 是否继承 `BaseDto` |
|---|---|---|---|
| `*Request` | 调用外部服务时 Feign 接口的请求报文定义 | `{module}/integration/request/` | 否 |
| `*Response` | 调用外部服务时 Feign 接口的响应报文定义 | `{module}/integration/response/` | 否 |

**在业务层禁止使用 `*Result` / `*View` / `*Response` / `*Model` / `*POJO` 等后缀作为返回值后缀。`*Request` / `*Response` 仅限 Integration 层 Feign 接口数据结构，不得用于业务层。**

**例外**：领域核心概念（已经具有清晰语义、跨模块复用）允许保留无后缀命名，但必须在源码 javadoc 中显式说明这是"领域核心概念例外"，并在所属模块的源码 `AGENTS.md` 显式列出例外清单。未列出的不允许"自由命名"。

### 层间映射策略

#### 默认：`.builder()` / 显式 setter

适用场景（覆盖 80%+ 实际用例）：

- 字段 ≤ 5 的 1:1 映射
- 仅在单个 Service / Application 中使用的转换
- 字段命名不一致或需要类型转换的场景
- 涉及嵌套对象、条件映射

#### 引入 MapStruct Converter

适用场景：

- 列表批量映射（避免 `stream().map().toList()` 模板代码）
- 在 ≥ 2 个 Service / Application 中复用同一映射规则
- 跨多层链路（Entity ↔ DTO ↔ VO ↔ Param）需要集中管理映射规则
- `BaseMapper.toPagedDto` 等通用映射能力（继续保留）

#### 不允许

- 静态工具类风格的转换器（如 `XxxUtil.toVo`）
- Controller / Service 内重复出现"逐字段 set"的模板代码（应抽 builder 静态工厂或 Converter）

### `BaseDto` 继承规则

| 类型 | 是否继承 `BaseDto` |
|---|---|
| 代表实体回显的 `*Vo`（含 `id` / `createdAt` / `createdBy` 等审计字段需要返回） | 继承 |
| 代表实体的 `*Dto`（跨层传递实体投影） | 继承 |
| 操作结果型 `*Vo`（"做了一件事的结果"，无实体语义） | **不继承** |
| 内部 service `*Dto`（领域操作结果） | **不继承** |

判断口径：**这个类的字段里是否需要 `id` / 审计字段语义**——需要就继承，不需要就不继承。

## 理由

### 为什么强制业务层 `*Vo` 后缀

1. **AI Coding 实证依据**：包路径 + 类名后缀是 AI 的"架构信号"——`*Vo` 让 AI 立刻识别当前层级；通用后缀（`*Result` / `*Data`）让 AI 把"随机性"当作可接受。
2. **glob / grep 精准**：`**/*Vo.java` 一行抓全 VO；混合风格下需要写多个 pattern 才能覆盖。

### 为什么映射按需使用

1. **AI Coding 实证差异**：AI 写 `.builder()` 几乎不出错；写 MapStruct `@Mapper interface` 时容易忘 `@Mapping` 注解。
2. **MapStruct 真正价值在批量列表 + 多复用**——简单 1:1 映射用 MapStruct 违反 KISS。

### 为什么 Integration 层保留 `*Request` / `*Response`

Feign 接口直接映射 HTTP 语义，`request/` / `response/` 包名配合 `*Request` / `*Response` 类名，能精确传达"这是外部 HTTP 报文定义，不是业务 DTO"。这一例外不扩散到业务层。

## 失败模式

- **rename 中遗漏引用**：使用 IDE 全局重命名而不是文本替换；rename 后跑 `mvn test` 全量回归。
- **AI 在过渡期生成混合风格**：通过本 ADR + `.cursor/rules/naming-and-mapping.mdc` 两处约束 AI 上下文。
- **领域核心概念例外滥用**：必须在源码 `AGENTS.md` 中显式列出，未列出的不允许"自由命名"。

## 上一级

- [decisions/AGENTS.md](AGENTS.md)
