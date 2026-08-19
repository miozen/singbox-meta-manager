# 发布收尾清单

## 本地边界

- 本地只提交源码、配置和文档。
- 不在本地执行构建、部署或 dry-run。
- 不生成、提交或上传 `dist`、`.wrangler`、`node_modules`。
- 前端 `dist` 由 GitHub + Cloudflare Worker 构建阶段根据 `pnpm run cf:build` 产生。
- Worker 发布由 Cloudflare 构建环境根据 `pnpm run cf:deploy` / `wrangler deploy` 执行。

## 远端构建配置

- 根脚本：`pnpm run cf:build` 构建前端。
- 根脚本：`pnpm run cf:deploy` 部署 Worker。
- 根脚本：`pnpm run cf:publish` 串联远端构建和部署。
- Worker Assets 指向：`packages/frontend/dist`，该目录必须由远端构建产生。
- Wrangler 版本锁定：`4.20.5`。

## D1 结构

发布前需要确认线上 D1 已应用以下表：

- `templates`
- `template_versions`
- `subscriptions`
- `client_profiles`
- `client_profile_subscriptions`
- `generation_runs`
- `client_profile_config_cache`
- `settings`

## 线上验证点

1. 管理员登录可以获得 Bearer token，后台 API 不再出现 `Missing token`。
2. 模板管理可列表、编辑、保存、查看版本和恢复版本。
3. 订阅源可新增、启停、编辑、删除，并可执行即时测试。
4. 客户端链接可新增、绑定模板、绑定多个订阅源、调整顺序、重置公开 token。
5. 后台“测试生成”可以返回 steps、summary，并写入最近生成记录。
6. 公开 `/sub/client/:token` 成功时返回生成后的 sing-box JSON。
7. 公开生成失败且存在最近成功缓存时，返回缓存配置，并带有 `x-singbox-meta-fallback: 1`。
8. 系统设置页可保存区域关键字、过滤正则、订阅拉取限制和 urltest 参数。
9. 修改系统设置后，再次测试生成时 summary 中能看到当前设置摘要。

## 当前目录状态说明

当前源码目录不是 Git 工作树。需要推送时，应进入真实 Git 仓库目录，或把当前源码同步到真实仓库后提交源码文件。不要同步本地构建产物。
