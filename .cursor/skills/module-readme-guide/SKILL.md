---
name: module-readme-guide
description: >-
  Guides how to write and maintain module-level README or docs so they serve as
  reliable context for AI agents during iteration. Use when adding or updating
  module documentation, writing 模块文档 or module README, or when the user asks
  how to document a module for agent context.
---

# 模块文档编写与维护指南（Agent 上下文向）

为代码仓库中的**单个模块**编写/更新说明文档，使 Agent 在后续迭代中能快速理解业务边界、入口与数据流，减少误改和重复询问。

---

## 何时使用本 Skill

- 新建模块后需要补充「模块说明」或 README。
- 已有模块逻辑变更，需要同步更新文档。
- 用户明确要求「写模块 README」「介绍业务逻辑」「方便 Agent 迭代」。
- 与「项目根 README」「AGENTS.md」区分：本 Skill 针对**模块级**文档（如 `docs/modules/xxx-README.md` 或模块目录下的 README）。

---

## 模块文档建议结构

按以下顺序组织，便于人和 Agent 扫读与检索：

| 区块 | 必选 | 内容要点 |
|------|------|----------|
| **标题 + 一句话概述** | ✅ | 模块名称 + 用一句话说明「做什么」（如：支付宝企业码接入：查询/签约/删除的本地缓存与统一流程）。 |
| **业务目标** | ✅ | 3～5 条 bullet：该模块要达成的业务结果（如：查询可短路、签约统一入口、删除双写一致）。 |
| **核心概念** | ✅ | 表或列表：业务/技术术语定义（如 userId、activated、deeplink、signUrl、本地缓存行）。避免与代码同名不同义造成歧义。 |
| **架构与分层** | ✅ | Controller / Application / Service / Integration / Entity 等在本模块中的职责与对应类名；可简短一句说明调用关系。 |
| **主要流程** | ✅ | 按「入口 → 步骤 → 出口」写 1～3 个主流程（如：查询、签约、删除）；可伪代码或编号步骤，突出分支条件（如「若已激活则短路」）。 |
| **配置与依赖** | 建议 | 配置前缀、关键配置项、外部系统/内部依赖（如支付宝、UserResolver）。 |
| **相关文档** | 建议 | 指向实现计划、Code Review、接口文档等链接，便于 Agent 做一致性检查或补充修改。 |

**长度**：单模块文档建议控制在 **150～300 行**（Markdown）。过长时拆「详细设计」到单独 reference，本模块 README 只保留摘要与链接。

---

## 编写原则（面向 Agent 上下文）

1. **可操作**：写「谁在什么条件下做什么」，而不是泛泛的「本模块重要」。Agent 需要据此判断改动是否越界、应落在哪一层。
2. **与代码一致**：类名、方法名、路径、表名与仓库当前实现一致；文档更新与代码 MR 同步，避免过期。
3. **术语统一**：全文同一概念用同一词（如只用一个「签约」或「sign」，不混用「授权」「激活链接」等未定义说法）。
4. **无歧义**：对「已激活」「present」「本地缓存」等易混概念在「核心概念」里写清判定条件（如 activated 仅指支付宝返回 ACTIVATED）。

---

## 维护约定

- **何时更新**：模块新增/删除对外接口、主流程分支变更、核心实体或表结构变更时，必须同步更新模块文档。
- **放在哪**：与项目约定一致；常见为 `docs/modules/<module>-README.md` 或模块源码同级的 `README.md`。若项目有 AGENTS.md，可在其中注明「各模块说明见 docs/modules/」。
- **谁负责**：与代码 owner 一致；Code Review 时可将「文档是否同步」纳入检查项。

---

## 避免的写法

- 大段复制接口签名或表结构（可只写「见 OpenAPI / Flyway 迁移」并附链接）。
- 在模块 README 中写全局构建/部署步骤（应放在项目根 README 或 AGENTS.md）。
- 使用「可能」「一般」等模糊表述代替明确条件（如「若 A 则 B，否则 C」）。

---

## 参考

- 根级 Agent 说明：AGENTS.md 建议 &lt;150 行、聚焦构建/测试/规范/坑点；模块文档则聚焦**单模块业务与结构**，可与 AGENTS.md 互补。
- 示例：本仓库 `docs/modules/enterprisecode-README.md` 可作为「业务目标 + 概念 + 分层 + 主流程 + 配置 + 相关文档」的参考结构。
