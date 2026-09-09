# Changelog

## 2026-09-09 · 集管详情改用在线文档

- 固定页面数据源为用户指定的在线文档；每次使用用户提供的最新表格。
- 删除集管环境表读取、明细、统计、筛选与导出脚本。
- 地图顶部链接到用户指定的交付版本、中间件详情文档，月度地图继续按进度表更新。

## 2026-09-08 · 集管交付环境明细

- 新增集管专用 `update-jiguan-delivery-map`，与网管地图 skill 同属“三、产品交付阶段”。
- 增加双表匹配、按交付点分别记录环境、重点字段缺项、来源行号和更新时间。
- 提供离线环境明细、筛选、分布统计和 CSV 导出脚本。

## 0.8.0 - 2026-09-08

- 新增 `update-delivery-map`，支持网管和集管月度跟踪表检查、客户映射核对、地图重建与预览站发布。
- 附带只读表格检查脚本，识别新增列、重复客户、新客户和历史未出现客户，保留集管跨调度层级的多行映射。
- README 增加“三、产品交付阶段”，加载配置默认启用交付地图 skill。
- 客户数据、地图资产和内网配置留在产品工作区。插件仅分发操作规则与检查脚本。

## 0.7.0 - 2026-08-31

- 新增 `write-product-weekly-minutes`。会前必须读取上周正式纪要和本周全部成员周报，形成主持稿；会后读取最新主持稿和会议逐字稿，形成正式纪要。
- 根据会议制度和历史人工定稿提炼固定章节、成果与风险取舍、追问归位及待办三要素规则。
- 将原型编辑器源码、打包脚本和 Release 下载迁入本仓库。本仓库接管编辑器后续维护。
- README 按“跟随需求阶段”和“日常工作阶段”重组；GitHub Pages 增加原型编辑器下载与使用说明。

## 0.6.2 - 2026-08-26

- 为 `requirements2prd`、`prd2prototype`、`proto-check` 增加一次性自动更新检查，三个 skill 共用同一脚本和状态处理口径。
- 自动更新按 marketplace 刷新、版本比较、插件安装、安装后复核的顺序执行；更新成功后停止当前任务并提示新建任务。
- 更新检查失败时继续使用当前版本；更新过程不修改 GitHub 源码、产品材料或用户文件。

## 0.6.1 - 2026-08-26

- 按《设计规范 V1.2 更新内容》修订产品和 UI 自查口径，补充日期筛选、定时任务及网管下级页面 3 条产品检查项。
- 表格排序改为由 PRD 定义是否支持手动排序、可排序列及默认排序；原型只表达单列排序，不再要求多列排序规则。
- “导出全部”固定为当前筛选条件下的全部数据，与“导出当前页”分开定义。
- 操作列按无权限、权限可申请、业务条件暂不满足 3 类处理；置灰按钮仅在原因不直观且 PRD 给出文案时显示 Tooltip。
- 统一历史规则和 V1.2 规则的单一来源：稳定规则维护在 `proto-check/assets`，清理 `prd2prototype` 中重复保存的 UI、安全、分页、权限、删除文案和自定义列口径；3 个 skill 只分别承接产品决策、原型表达和评审前检查。

## 0.6.0 - 2026-08-25

- 新增 14 项按攻击面触发的日常迭代安全规则，覆盖命令与脚本、可配置接口、富文本、文件、外部地址、权限、敏感数据、高风险操作、并发、资源、开放接口和供应链等场景。
- `requirements2prd` 在 PRD 阶段识别本轮安全触发项，命中项写入“附录 D：本轮安全需求”；check 规则未确认完整时不流转到原型。
- `prd2prototype` 把 S-* 安全规则映射到页面、控件、交互和 proto-note；禁止默认生成无边界的自由命令输入框，并统一下载文件名为 `页面名称_YYYYMMDD_HHmmss.扩展名`。
- `proto-check` 增加安全自查报告，分别记录产品规则结论和技术/测试承接；静态原型不用于证明服务端防护已经实现。
- 收窄表单、树选择、既有接口和简单页面流程图的自查适用范围，避免把查询条件或无关存量问题误判为本轮整改项。
- 新增插件市场首次安装与日常更新图文手册，并通过 GitHub Pages 发布；明确“本地源码仓库 → GitHub → Codex 自动拉取 → 统一插件目录”的更新链路。

## 0.5.2 - 2026-08-03

- `prd2prototype` 第 8 步增加固定收尾顺序：反写 PRD 细则、回写 PRD、校验原型一致性，再生成研发对接版 Word 需求说明书。
- 研发需求说明书的章节、功能表、宋体和表间空行规则改为 skill 内置，不再依赖个人工作区模板。
- 新增 Word 生成脚本和结构校验脚本；每个功能编号单独一张 8 行表格，每张表后保留 1 个无隐藏属性的可见空行。

## 0.5.1 - 2026-07-31

- `write-design-review-memo` 直接内置设计评审备忘录的目的、结构、结论、复盘、主题、路径和抄送规范。
- 移除对个人工作区 Word 模板及固定目录的依赖，安装到其他环境后可独立使用。

## 0.5.0 - 2026-07-31

- 新增 `write-design-review-memo`，根据设计评审逐字稿、会议记录和评审材料生成可上传的设计评审备忘录。
- 固定基本信息、会议共识/待办、评审结论和条件式复盘结构；复杂逻辑、带条件通过或待二轮评审时必须复盘。
- 待办统一为单行 `事 --人 --时间`，禁止用表格或补写会议未明确的责任人、时间。

## 0.4.0 - 2026-07-29

- 新增 `ui-acceptance-check`，对照 UI 设计稿、UI 说明、复用依据和通用规范验收实际产品的视觉与交互。
- 增加环境与数据操作授权、浏览器实查、UI 出图范围判断、问题复现记录和测试数据收尾规则；业务主流程问题转产品验收确认。
- 检查清单、报告模板和示例全部使用通用表达，不包含具体组织、行业、项目或业务对象信息。

## 0.3.5 - 2026-07-29

- `proto-check` 按新增、修改、混合迭代划分检查范围。修改既有页面时只检查本次改动和直接影响,不记录无关存量问题。
- 原型说明只列字段联动、状态变化等不直观交互。Tab 切换、全选、普通分页和含义明确的按钮点击不再逐项罗列。
- 通用空状态沿用公共组件,无需逐页展示或说明;存在特殊规则时再检查。
- 列表默认 25 条/页,展示区域不足时使用 15 条/页;明确不超过 15 条的数据列表可不分页。

## 0.3.4 - 2026-07-28

- `prd2prototype` 增加本地 Git 版本管理规则：每个产品迭代独立建库，修改前保留基线，用户确认一项后提交一项。
- 增加原型可编辑接入检查，校验 `annotations.js` 引用顺序、可编辑标识唯一性和需求便签覆盖情况。
- 当时原型编辑器仍由旧发布源统一分发，本仓库未保存编辑器源码。

## 0.3.3 - 2026-07-22

- 原型编辑器当时改由旧发布源统一分发:移除本仓库的 `.app` / `.vbs` / `.command` 资产,暂不自行发布 `prototype-editor.zip`。
- README、SKILL.md 和 `common.js` 的编辑器说明当时统一指向旧发布源。

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
