# 0007 — 定时任务分布式锁

> **状态**：Accepted

## 背景

`nexa-bpm` 多实例部署时，`@Scheduled` 任务（首个落地预计为 `OverrideExpirationScheduler`，把过期的 `bpm_template_route_override` 改成 `EXPIRED`）必须分布式互斥，否则会出现多实例并发清理同一批记录、日志混乱与潜在的写竞争。

## 决策

复用 `nexa-system` ADR 0007（同名）的选型，**ShedLock 7.x + Redis Spring Provider**：

- 依赖：`net.javacrumbs.shedlock:shedlock-spring`、`shedlock-provider-redis-spring`（版本 `7.7.0`）。
- 配置类：`shokz.nexa.bpm.core.config.SchedulerLockConfig`，`@EnableSchedulerLock(defaultLockAtMostFor = "PT10M")`，注入 `RedisLockProvider`。
- **命名空间**：`nexa-bpm`（与 `nexa-system` 的 `nexa-system` 区分，避免锁名冲突）。
- 业务 Scheduler 使用 `@SchedulerLock(name = "<稳定锁名>", lockAtMostFor = ..., lockAtLeastFor = ...)`，**锁名禁止动态拼接**。

### Scheduler 使用约定

```java
@Scheduled(cron = "${bpm.route.override-expiration-cron:0 */5 * * * *}")
@SchedulerLock(
        name = "bpm-route-override-expiration",
        lockAtMostFor = "PT5M",
        lockAtLeastFor = "PT30S")
public void expireRoutes() {
    overrideExpirationApplication.expireOutdatedOverrides();
}
```

## 理由

- 与 `nexa-system` 一致，降低跨服务运维与排错成本（同样的依赖、同样的配置入口、可对照的 ADR）。
- 复用现有 Redis 基础设施（`org.redisson:redisson-spring-boot-starter` 已提供 `RedisConnectionFactory`），无需新组件。
- `lockAtMostFor` 取保守上界足以覆盖单批扫描耗时；业务逻辑保持幂等以应对 Redis 主从切换。

## 影响

- `pom.xml` 新增 ShedLock 两个依赖与 `shedlock.version` 属性。
- 新增 `core/config/SchedulerLockConfig.java`；后续 `@Scheduled` 任务必须使用 `@SchedulerLock`，不再用静态分布式锁工具散落调用。
- 与 `nexa-system` ADR 0007 形成双服务对照；其它 Nexa 服务接入定时任务时优先沿用该模式。
- Story 1.7（`OverrideExpirationScheduler`）落地时直接使用本配置；测试参考 `nexa-system` 的 Testcontainer 模式（Redis 容器 + `@SchedulerLock` 互斥用例）。

## 参考

- `nexa-system` 同名 ADR：`nexa/system/docs/decisions/0007-scheduler-lock.md`
- `_bmad-output/planning-artifacts/mk-bpm-integrate/architecture.md` § Distributed Scheduler Lock
