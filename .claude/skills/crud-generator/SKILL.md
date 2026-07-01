---
name: crud-generator
description: >-
  Generate a full CRUD skeleton (Entity, Repo, Param, Vo, Service+Impl,
  Application+Impl, Controller) for shokz.nexa.apps modules by running the
  deterministic Python/Jinja2 generator in tools/codegen/, then filling in
  business logic on top. Use when the user asks to scaffold a new entity/table,
  generate CRUD code, create a new master-data module, or wants "增删改查"/"CRUD
  骨架"/"从建表到接口一次性生成".
---

# CRUD 骨架代码生成器

四层架构（Controller → Application → Service → Entity/Repo）里"规则能唯一确定答案"的部分（命名后缀、`NexaResponse` 包装、`BaseEntity`/`BaseRepo` 复用、事务注解位置）交给 `tools/codegen/generate.py` 确定性生成；你只负责"需要理解业务含义"的 20%：复杂查询、跨表校验、权限细节。**不要在生成骨架之后又整体重写它——在骨架上做增量修改。**

## 工作流程

1. **写 spec**：参考 [`tools/codegen/example-spec.yaml`](../../../tools/codegen/example-spec.yaml)，把用户描述的实体翻译成 YAML spec（字段、类型、校验、模块名）。不确定的字段（表名、`module`、`voExtendsBaseDto`）直接问用户或参照同模块已有主数据的约定（如 `docs/modules/{module}/interfaces.md`）。
2. **跑生成器**：
   ```bash
   pip install -r tools/codegen/requirements.txt   # 首次执行
   python tools/codegen/generate.py --spec <你写的spec.yaml>
   ```
   默认输出到 `src/main/java` 对应包路径；文件已存在会报错退出（避免误覆盖），确认要覆盖时加 `--force`。
3. **跑 checklist.md**：逐项自查生成结果，参见 [checklist.md](checklist.md)。
4. **编译验证**：`./mvnw compile -q`。
5. **同步文档**：按 `doc-sync-on-change.mdc` 规则更新对应模块 `AGENTS.md`/`interfaces.md`。

## spec 字段速查

| 字段 | 必填 | 说明 |
|---|---|---|
| `module` | 是 | 目标模块，如 `timesheet`，决定包路径 `shokz.nexa.apps.{module}` |
| `name` | 是 | 业务前缀（PascalCase），决定 `{name}Service`/`{name}Controller`/`{name}Vo` 等类名 |
| `entity` | 是 | JPA Entity 类名（如 `TsFactory`） |
| `table` | 是 | 表名 |
| `basePath` | 否 | Controller 路径，默认 `/{module}/{name小写}s` |
| `roles` + `authBean` | 否 | 两者都填才生成 `@PreAuthorize`；否则不生成任何权限守卫 |
| `voExtendsBaseDto` | 否 | true 则 Vo 继承 `BaseDto`（回显 id/createdAt/updatedAt） |
| `operations` | 否 | 默认 `[create, update, getById, page, delete]`，可裁剪 |
| `fields[].required`+`message` | required=true 时必填 | `message` 必须是业务语义化中文（禁止用字段名拼接） |
| `fields[].unique` | 否 | 生成 Repo `findByXxx` + Service 唯一性校验 + Entity `unique=true` |
| `fields[].filterable` | 否 | 生成 page 的精确匹配查询参数 |
| `fields[].keywordSearch` | 否 | 生成 page 的关键词模糊匹配（LIKE） |
| `fields[].label` | 否 | 用于 `@Size` 消息里的中文名；不填则从 `message` 反推，否则退化为英文字段名（生成后建议补上） |

## 生成器的边界（务必遵守）

- 生成器只产出骨架：唯一性校验只做"值是否被占用"，**不含**关联删除保护、跨表业务规则——这些要在 `ServiceImpl` 里手写补充（参考同模块已有的 `*ServiceImpl` 处理关联删除的写法）。
- `delete` 操作固定走 `POST {basePath}/batch-delete`（项目现有约定，非标准 `DELETE`）。
- Entity 里不加 `@NotBlank`/`@Size` 等校验注解（参照项目里 `TsFactory` 等真实 Entity 的写法——校验只在 Param 层）。
- 不要因为生成器"看起来能生成一切"就跳过 checklist.md 里的人工复核步骤。

## 何时不要用这个 Skill

- 表结构涉及关联查询（多表 JOIN 展示）、非标准分页/导入导出 —— 生成器只覆盖单表标准 CRUD，其余部分照常手写或参考同模块类似接口。
- 修改已有实体的字段 —— 生成器只做"新建"，不做"迁移"；改字段直接手动编辑已生成的文件。
