# jg-product-design-plugin-codex

这是给 Codex 用的产品设计插件。

本仓库是 Codex 版产品设计 Skill、原型编辑器和 GitHub Pages 的唯一维护源。旧 Claude 仓库不再作为上游来源。

## 安装与更新手册

- [图文操作手册（GitHub Pages）](https://yideng-xl.github.io/jg-product-design-plugin-codex/)
- [仓库内 Markdown 版](docs/插件市场安装与更新操作手册.md)

图文手册包含首次添加插件市场、安装插件、日常更新和异常处理。下面保留命令行方式，供维护和故障处理使用。

## 业务流程

插件按工作发生的阶段分为 3 类。

### 一、跟随需求阶段

#### 1. 需求管理流程

| Skill | 用途 |
|---|---|
| `requirements2prd` | 把粗需求、新模块或既有模块调整梳理成 PRD 口径；按本轮改动识别安全触发项。 |
| `prd2prototype` | 根据稳定 PRD 生成 HTML 原型，支持需求便签和原型说明本地编辑，并在评审确认后反写 PRD。 |
| `prd2zentao` | 根据 PRD 第四章拆分禅道研发需求，生成批量同步材料或控制台脚本。默认关闭，需要时再启用。 |

#### 2. 需求自查流程

| Skill | 用途 |
|---|---|
| `proto-check` | 设计评审前检查产品规则、UI 和安全表达，区分原型整改项与技术、测试承接项。 |

#### 3. 设计评审记录

| Skill | 用途 |
|---|---|
| `write-design-review-memo` | 根据逐字稿、会议记录和评审材料，整理可上传的设计评审备忘录。 |

#### 4. 实现验收

| Skill | 用途 |
|---|---|
| `ui-acceptance-check` | 对照 UI 设计、UI 说明和通用规范，在实际产品环境中验收视觉、交互和页面状态。 |

### 二、日常工作阶段

| Skill | 用途 |
|---|---|
| `write-product-weekly-minutes` | 会前读取上周正式纪要和本周全部成员周报，形成主持稿；会后读取最新主持稿和会议逐字稿，形成正式纪要。 |

### 三、产品交付阶段

| Skill | 用途 |
|---|---|
| `update-delivery-map-wg` | 使用本次提供的网管进度表更新地图，核对客户映射与覆盖状态；页面保留固定数据源链接，不展示本期项目明细。 |
| `update-delivery-map-jg` | 读取集管月度进度，更新交付地图；交付版本、中间件等细节通过顶部在线文档链接查看。 |

网管与集管分别维护独立 skill，统一归入本阶段。

集管地图的“数据源”和“交付版本、中间件等细节”固定指向用户指定的在线文档。每次更新使用用户从该文档提供的最新进度表，保留 5 张覆盖地图；页面不显示本地文件名，也不再读取《集管信息一览表》或生成环境明细。具体步骤见 [集管交付地图 skill](skills/update-delivery-map-jg/SKILL.md)。

网管地图的“数据源”固定指向用户指定的在线文档。用户每次从这里取得最新表格后提供，地图按本次文件更新；来源链接保持不变，截止月份按导入表填写。页面不自动同步在线内容。

网管地图已移除“本期项目明细与覆盖依据”区块。项目核对记录留在本地，后续重建也不恢复该区块。

默认加载的 skill：

- `requirements2prd`
- `write-design-review-memo`
- `write-product-weekly-minutes`
- `update-delivery-map-wg`
- `update-delivery-map-jg`
- `ui-acceptance-check`
- `prd2prototype`
- `proto-check`

默认不加载：

- `prd2zentao`

## 安全需求贯通

安全规则在需求阶段进入 PRD，原型阶段负责表达，`proto-check` 只做评审前闸门：

1. `requirements2prd` 按本轮新增/修改内容扫描 14 个 `S-*` 安全触发场景。命中项写入 PRD“附录 D：本轮安全需求”，逐条列出产品规则、check 规则、前端与后端/实际入口执行位置、失败处置及技术/测试承接。
2. `prd2prototype` 把命中项映射到具体页面、控件、交互和 proto-note。用户可见的限制与错误反馈落到原型；服务端强制、注入防护、越权验证等继续标记为“需技术评审/测试验证”。
3. `proto-check` 按同一 `S-*` 编号核对遗漏。产品规则缺失进入原型整改，运行防护进入技术/测试承接，不从静态 HTML 推断安全通过。

共用规则源：`skills/proto-check/assets/日常迭代安全自查表.md`。未改动的登录、会话、TLS、端口等框架能力不在每次迭代重复检查。

## 规则单一来源

稳定规则统一维护在 `skills/proto-check/assets/`：

- `产品设计自查表.md`：产品规则和原型说明要求。
- `七大易用原则量化标准.md`：UI 原型检查口径。
- `日常迭代安全自查表.md`：日常安全触发规则。
- `易用性原则定义.md`：七大原则的定义。

`requirements2prd` 负责确认规则需要的产品参数，`prd2prototype` 负责把确认结果落到界面和原型说明，`proto-check` 负责按同一编号检查证据。各 skill 可以保留流程和执行提醒，不复制规则全文。规则升版时先修改上述权威源，再检查 3 个 skill 的引用。

## 自动更新

`requirements2prd`、`prd2prototype`、`proto-check` 在每个新任务开始时共用一次更新检查：

1. 刷新已配置的 `jg-product-design` marketplace。
2. 比较 marketplace 版本与本地已安装版本。
3. 有新版本时执行插件安装并复核版本；当前任务停止，提示新建任务加载新版 skill。
4. 检查失败时继续使用当前版本，不阻塞需求、原型或自查工作。

更新逻辑统一维护在 `scripts/check_update.py`，状态处理统一维护在 `references/skill-auto-update.md`。它只操作 Codex 管理的 marketplace 和插件安装目录，不修改源码仓库、产品材料或用户文件，也不自动提交、推送 GitHub。

## 通过命令行安装到 Codex

首次安装先添加 marketplace：

```bash
codex plugin marketplace add yideng-xl/jg-product-design-plugin-codex --ref main
```

命令成功后重启 Codex。

重启后进入 **Plugins**，在 marketplace 来源里找到 **JG Product Design**，安装 `jg-product-design-plugin-codex`。

安装后开新会话生效。可以用这句话测试：

```text
我们来聊个新需求
```

预期行为：Codex 先建议使用 `requirements2prd`，等用户确认后再进入流程。

## 通过命令行更新插件

维护者更新 GitHub 后，本机执行：

```bash
codex plugin marketplace upgrade jg-product-design
codex plugin add jg-product-design-plugin-codex@jg-product-design
```

然后开一个新会话验证新 skill。已安装插件使用 `codex plugin add` 会按 marketplace 当前版本刷新 Codex 统一插件目录。

如果插件已经安装过，但新 skill 没生效，进入 **Plugins** 重新安装或刷新一次。

## 配置加载哪些 skill

加载开关在 `skill-load.config.json`。

默认配置：

```json
{
  "skills": {
    "requirements2prd": true,
    "write-design-review-memo": true,
    "write-product-weekly-minutes": true,
    "update-delivery-map-wg": true,
    "update-delivery-map-jg": true,
    "ui-acceptance-check": true,
    "prd2prototype": true,
    "proto-check": true,
    "prd2zentao": false
  }
}
```

应用配置：

```bash
node scripts/apply-skill-config.mjs
```

实现方式很简单：启用时使用 `SKILL.md`；禁用时改成 `SKILL.disabled.md`。Codex 只识别 `SKILL.md`，所以禁用后的 skill 不会进入加载列表。

如果要临时启用 `prd2zentao`，把配置改成：

```json
"prd2zentao": true
```

再执行：

```bash
node scripts/apply-skill-config.mjs
```

改完后提交并推送 GitHub。使用方再执行 marketplace 更新。

## 原型编辑器

`prd2prototype` 有一个独立的原型编辑器，用来改需求便签和原型说明。

本仓库负责编辑器源码、打包、Release 下载和使用说明。下载地址：

```text
https://github.com/yideng-xl/jg-product-design-plugin-codex/releases/latest/download/prototype-editor.zip
```

使用说明：<https://yideng-xl.github.io/jg-product-design-plugin-codex/#editor>

用法：

- 下载解压一次，把 `原型编辑器.app` 拖进「应用程序」常驻(只留一份)。
- macOS 双击 `原型编辑器.app`；Windows 双击 `原型编辑器.vbs`。机器需装 Node.js。
- 打开控制页后，选择要编辑的原型目录。

编辑器仍是独立工具，不复制到具体原型目录。源码维护在 `skills/prd2prototype/assets/editor/`，发布包由其中的 `pack.sh` 生成。每个原型的手工修改写入该原型的 `data/annotations.js`。

只有 `localhost` / `127.0.0.1` 下会出现编辑态。发布到内网后的原型页面仍是只读。

## 维护规则

本仓库是 Codex 版 skill 的唯一源码。

- 以后调整 skill，只改本仓库里的文件。
- 本地源码提交并推送 GitHub 后，再由使用方升级 marketplace 和插件。
- `.codex/.tmp/marketplaces/...` 是 Codex 自动拉取的市场快照。
- `.codex/plugins/cache/...` 是 Codex 统一插件目录，`cache` 是内部目录名；不直接修改其中的 skill。
- 使用方通过 `codex plugin marketplace upgrade jg-product-design` 更新。

这样能避免本机改了但 GitHub 没更新，导致同事之间使用的 skill 不一致。

## 仓库结构

```text
jg-product-design-plugin-codex/
├── .codex-plugin/
│   └── plugin.json
├── .agents/
│   └── plugins/
│       └── marketplace.json
├── skills/
│   ├── requirements2prd/
│   ├── write-design-review-memo/
│   ├── write-product-weekly-minutes/
│   ├── update-delivery-map-wg/
│   ├── update-delivery-map-jg/
│   ├── ui-acceptance-check/
│   ├── prd2prototype/
│   ├── proto-check/
│   └── prd2zentao/
├── scripts/
│   └── apply-skill-config.mjs
├── skill-load.config.json
├── CHANGELOG.md
└── README.md
```

## 迁移说明

- Codex 仓库已接管产品部周例会 Skill、原型编辑器源码、Release 下载和 GitHub Pages。
- 仓库内容不再引用旧 Claude 仓库。
- 已移除 Claude / Cowork 的安装方式。
- 已把 `AskUserQuestion` 改为 Codex 可执行的用户确认口径。
- 草稿文件统一使用 `-Codex` 后缀。
- `prd2zentao` 保留禅道浏览器登录态方案。内网场景默认生成控制台粘贴脚本，由用户在已登录禅道页面执行。
