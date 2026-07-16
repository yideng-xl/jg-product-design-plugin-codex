# jg-product-design-plugin-codex

Codex plugin for product-design work in B-side software projects.

This repository is migrated from the original Claude product-design skills. The Claude source under the sibling `claude-plugin/` directory is treated as read-only migration material; this plugin is the Codex-facing version.

## Skills

| Skill | Purpose |
|---|---|
| `requirements2prd` | Discuss rough needs, new modules, optimization, refactoring, productization, and PRD material. |
| `prd2prototype` | Convert stable PRD scope into reviewable HTML prototypes, including editable local annotations. |
| `proto-check` | Inspect HTML prototypes before review and produce self-check reports plus整改要求. |
| `prd2zentao` | Split stable PRD product-scope chapters into ZenTao SR preparation material and batch scripts. |

## Prototype Editor

`prd2prototype` now includes a local prototype editor for需求便签 and原型说明.

- Download: <https://github.com/yideng-xl/jg-product-design-plugin-codex/releases/latest/download/prototype-editor.zip>
- Usage: unzip, then double-click `原型编辑器.app` on macOS or `原型编辑器.vbs` on Windows. Node.js is required.
- Editable mode only appears on `localhost` or `127.0.0.1`. Published prototype pages stay read-only.
- Edited text is written back to `data/annotations.js`; generated HTML should not overwrite that file.

## Working Agreement

For this workspace, new-demand discussion follows the global AGENTS rule:

- Do not silently invoke product-design skills for weekly reports, memos, emails, or meeting notes.
- For new requirements, new modules, optimization, or refactoring, first suggest `requirements2prd`.
- Use the skill only after the user confirms.
- Do not invent product, business, personnel, schedule, or ZenTao facts. Ask when facts are missing.

## Maintenance Rule

Treat this repository directory as the source of truth for skill changes.

- Update skills under this repository first.
- Do not directly edit installed or cached Codex skill copies.
- After changes are reviewed, load or reinstall the plugin into Codex manually.
- Keep GitHub synchronized so team members do not run different skill versions.

## Repository

GitHub: <https://github.com/yideng-xl/jg-product-design-plugin-codex>

## Structure

```text
jg-product-design-plugin-codex/
├── .codex-plugin/
│   └── plugin.json
├── skills/
│   ├── requirements2prd/
│   ├── prd2prototype/
│   ├── proto-check/
│   └── prd2zentao/
├── docs/
│   └── index.html
├── CHANGELOG.md
└── README.md
```

## Migration Notes

- Claude/Cowork-specific trigger and installation text has been removed.
- `AskUserQuestion` references were converted to Codex-neutral user confirmation language.
- Draft output suffixes were changed to `-Codex` for this workspace.
- `prd2zentao` keeps the browser-cookie based ZenTao workflow, but defaults inner-network cases to a user-run console paste script instead of bypassing access policy.
