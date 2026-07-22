# Changelog

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
