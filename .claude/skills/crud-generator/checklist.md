# 生成后自检清单

跑完 `tools/codegen/generate.py` 之后，在写业务逻辑前先过一遍：

## 命名与分层（对照 `naming-and-mapping.mdc` / `project.mdc`）

- [ ] 返回值类是 `*Vo`，跨层 DTO 是 `*Dto`，入参是 `*Param`（不是 `*Result`/`*Response`）
- [ ] `*Vo` 是否需要继承 `BaseDto` 判断正确（要不要 id/审计字段语义）
- [ ] `@Transactional` 只出现在 Application 实现类，Service 层没有多余的事务注解
- [ ] Controller 路径是资源导向、不含动词（`/timesheet/xxx` 而不是 `/timesheet/getXxx`）

## 业务规则（生成器不会做的部分）

- [ ] `unique` 字段目前只做"值是否被占用"，是否需要补充关联删除保护（参考同模块 `*ServiceImpl.deleteByIds` 的写法，如 `FactoryMasterServiceImpl` 里先查引用再删）
- [ ] `page()` 是否需要更多筛选维度（当前只有 `keywordSearch` + `filterable` 两类，复杂条件要手写补充到 `buildSpec`）
- [ ] 是否需要写权限的 `authorizer`、行级权限校验（生成器只生成方法级 `@PreAuthorize`）

## 校验消息与文案

- [ ] 所有 `required=true` 字段的 `message` 是否业务语义化（不是"不能为空"框架默认文案）
- [ ] `label` 缺失导致的 `@Size` 消息里出现英文字段名——补上 `label` 重新生成，或手动改一下消息文案

## 编译与文档

- [ ] `./mvnw compile -q` 通过
- [ ] 按 `doc-sync-on-change.mdc`：新 Controller → 更新 `docs/modules/{module}/interfaces.md`；新业务规则 → 更新 `design.md`；新增类 → 更新对应包 `AGENTS.md` 类清单
