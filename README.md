# jg-product-design-plugin-codex

这是给 Codex 用的产品设计插件。

它从原 Claude 版产品设计 skill 迁移而来。Claude 版目录只作为上游来源；Codex 版以本仓库为准。

## 包含的 skill

| Skill | 用途 |
|---|---|
| `requirements2prd` | 粗需求、新模块、既有模块调整、产品化讨论，整理成 PRD 口径。 |
| `prd2prototype` | 根据稳定的 PRD 范围生成 HTML 原型，含本地可编辑的需求便签和原型说明。 |
| `proto-check` | 原型评审前做自查，输出产品自查、UI 规范自查和整改要求。 |
| `prd2zentao` | 根据 PRD 第四章拆禅道研发需求，并生成批量同步材料或控制台脚本。 |

默认加载的 skill：

- `requirements2prd`
- `prd2prototype`
- `proto-check`

默认不加载：

- `prd2zentao`

## 安装到 Codex

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

## 更新插件

维护者更新 GitHub 后，本机执行：

```bash
codex plugin marketplace upgrade jg-product-design
```

然后重启 Codex。

如果插件已经安装过，但新 skill 没生效，进入 **Plugins** 重新安装或刷新一次。

## 配置加载哪些 skill

加载开关在 `skill-load.config.json`。

默认配置：

```json
{
  "skills": {
    "requirements2prd": true,
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

**编辑器统一由主插件仓库分发，本仓库不自带、也不自己发布**（避免磁盘上冒出多个 `.app`）。下载地址（主仓库 Release）：

```text
https://github.com/yideng-xl/jg-product-design-skills/releases/latest/download/prototype-editor.zip
```

也可从主仓库使用说明页下载：<https://yideng-xl.github.io/jg-product-design-skills/#editor>

用法：

- 下载解压一次，把 `原型编辑器.app` 拖进「应用程序」常驻(只留一份)。
- macOS 双击 `原型编辑器.app`；Windows 双击 `原型编辑器.vbs`。机器需装 Node.js。
- 打开控制页后，选择要编辑的原型目录。

编辑器是独立工具，不放进原型目录、也不放进本插件。每个原型自己的手工修改写入该原型的 `data/annotations.js`。

只有 `localhost` / `127.0.0.1` 下会出现编辑态。发布到内网后的原型页面仍是只读。

## 维护规则

本仓库是 Codex 版 skill 的唯一源码。

- 以后调整 skill，只改本仓库里的文件。
- 不直接改 Codex 已安装或缓存里的 skill。
- 改完后提交并推送 GitHub。
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

- 已移除 Claude / Cowork 的安装方式。
- 已把 `AskUserQuestion` 改为 Codex 可执行的用户确认口径。
- 草稿文件统一使用 `-Codex` 后缀。
- `prd2zentao` 保留禅道浏览器登录态方案。内网场景默认生成控制台粘贴脚本，由用户在已登录禅道页面执行。
