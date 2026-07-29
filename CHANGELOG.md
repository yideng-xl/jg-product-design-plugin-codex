# Changelog

## 0.3.5 - 2026-07-29

- `proto-check` 按新增、修改、混合迭代划分检查范围。修改既有页面时只检查本次改动和直接影响,不记录无关存量问题。
- 原型说明只列字段联动、状态变化等不直观交互。Tab 切换、全选、普通分页和含义明确的按钮点击不再逐项罗列。
- 通用空状态沿用公共组件,无需逐页展示或说明;存在特殊规则时再检查。
- 列表默认 25 条/页,展示区域不足时使用 15 条/页;明确不超过 15 条的数据列表可不分页。

## 0.3.4 - 2026-07-28

- `prd2prototype` 增加本地 Git 版本管理规则：每个产品迭代独立建库，修改前保留基线，用户确认一项后提交一项。
- 增加原型可编辑接入检查，校验 `annotations.js` 引用顺序、可编辑标识唯一性和需求便签覆盖情况。
- 原型编辑器继续由 `jg-product-design-skills` 主仓库统一分发，本仓库不新增 `.app` 或编辑器源码。

## 0.3.3 - 2026-07-22

- 原型编辑器改由主插件仓库 `jg-product-design-skills` 统一分发:移除本仓库的 `原型编辑器.app` / `.vbs` / `.command` 资产,不再自行发布 `prototype-editor.zip`(避免磁盘上出现多个 `.app` 被 Launchpad 索引)。
- README / SKILL.md / `common.js` 的编辑器下载与使用说明链接,全部改指向主仓库 Release 与 Pages(`https://yideng-xl.github.io/jg-product-design-skills/#editor`)。

## 0.3.2 - 2026-07-16

- Disabled `prd2zentao` in the default skill load config.

## 0.3.1 - 2026-07-16

- Enabled `prd2zentao` in the default skill load config.

## 0.3.0 - 2026-07-16

- Added `skill-load.config.json` to control which bundled skills are exposed to Codex.
- Added `scripts/apply-skill-config.mjs` to enable or disable skill loading by renaming `SKILL.md`.
- Set `prd2zentao` to disabled by default.

## 0.2.1 - 2026-07-16

- Removed the docs deployment files.
- Changed prototype editor help links to the repository README.
- Kept `prototype-editor.zip` as the release download entry.

## 0.2.0 - 2026-07-16

- Synced Claude upstream `1.17.0` changes into the Codex plugin.
- Updated `prd2prototype` with local editable annotations for需求便签 and原型说明.
- Added the prototype editor assets: macOS app bundle, Windows `.vbs` launcher, and macOS `.command` fallback.
- Updated `common.js` and `skill-extras.css` for annotation rendering, edit mode, autosave, and `.proto-tip` click behavior.
- Updated plugin metadata to version `0.2.0`.

## 0.1.0 - 2026-06-30

- Created Codex plugin scaffold under `codex-plugin/jg-product-design-plugin-codex`.
- Migrated `requirements2prd`, `prd2prototype`, `proto-check`, and `prd2zentao` from the Claude plugin source.
- Reworked skill frontmatter for Codex discovery.
- Converted Claude-specific user-question and browser wording to Codex-compatible wording.
- Added Codex plugin manifest, README, and repository metadata.
- Documented the maintenance rule: skill changes must be made in this repository source directory first, then manually loaded into Codex.
