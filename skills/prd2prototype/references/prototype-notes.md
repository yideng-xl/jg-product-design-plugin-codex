# 原型局部说明与全局说明

新建原型、迁移说明布局或调整本地编辑器时读取。说明工具属于产品经理的原型制作层。

## 布局

**页面范围例外**：`index.html` 原型导航首页默认不显示右侧原型说明、编号标记和连线。独立需求说明页也不重复添加侧栏。正文保留导航、版本变更记录、范围、权限说明和变更徽标；其他业务原型页沿用右侧局部说明与底部折叠说明。判断依据为页面用途，业务系统首页不自动套用导航页例外。

- 局部说明：右侧淡黄色卡片，编号、元素定位、选中连线。绑定控件或区域，弹窗说明随弹窗显示。
- 全局说明：保留页底 `.proto-note`，浅黄色背景框；头部固定保留“原型设计说明”和“隐藏说明 / 展开说明”。跨区域范围、宽字段表、通用规则不挤入右侧。
- 两处独立展开或隐藏，偏好只保存在浏览器，不删除说明、不改变发布内容。
- 编号指向与规则直接相关的控件或区域，点击卡片、编号或“定位页面元素”后相互定位。不要把所有说明绑到整张表；相邻标记避免重叠。
- 同一条规则保留一份可编辑正文，局部说明与底部说明不重复。新页面不同时使用编号连线和旧弹出便签解释同一处规则。
- 迁移原型只移动原内容节点，不复制第二份可编辑正文，保留 `data-anno-id`、`data-anno-rich`、手改覆盖和变更徽标。新增辅助元素不得影响产品按钮、表单、表格与弹层行为。

## 接入

导航首页和独立需求说明页不添加 `data-prototype-notes`，不加载说明栏及编号连线运行时；保留原有说明覆盖文件与稳定 ID。升级已有页面时先将仅存在于侧栏或覆盖层的有效内容移回正文，再移除侧栏，不丢失用户手改。

业务原型页复制 `assets/prototype-notes.css`、`assets/prototype-mark.js`、`assets/prototype-notes.js`。已有产品 CSS 和业务脚本继续按原约定加载。

```html
<body data-prototype-notes data-page="config">
<!-- 业务页面、弹层与底部说明 -->
<div data-anno-id="config.rule-1" data-note-target="#config-query">局部规则正文</div>
<section class="proto-note">
  <div data-anno-id="config.scope" data-anno-rich><h3>全局规则</h3><p>……</p></div>
</section>
<script src="data/annotations.js"></script>
<script src="assets/common.js"></script>
<!-- 业务脚本完成初始 DOM 后加载说明工具 -->
<script src="assets/prototype-mark.js"></script>
<script src="assets/prototype-notes.js"></script>
```

`prototype-notes.css` 在产品和页面 CSS 之后加载。`common.js` 检测到 `data-prototype-notes` 时跳过旧编辑覆盖层，避免双重处理；业务交互继续执行。

局部规则必须具有稳定 `data-anno-id` 和 `data-note-target`（CSS 选择器）。在弹窗内显示的说明额外指定 `data-note-when="#dialog-id"`，只在对应弹层可见时显示。无对应控件或宽表内容留在底部。不要将被隐藏的非本期业务说明重新展示出来。

运行时包装业务内容为 `#pn-product`，右侧为 `#pn-rail`。迁移后实测业务滚动容器、fixed 弹层、表格横向滚动、原导航和嵌套弹窗。不要只靠 DOM 存在就判定可用。

## 本地编辑与静态发布

使用同一套独立编辑器 `assets/editor/`。启动器先通过 `/editor-info` 核对构建标识，只复用同版服务；旧服务占用时改用空闲端口，避免新版页面落到旧接口后变成只读。只有本机地址且相对 `notes-session` 握手成功才开放编辑。普通 localhost 静态服务、file://、服务器域名均只读。

产品经理可以：

1. 直接修改右侧和底部带 ID 的文字，富文本说明保留原 HTML；停止输入后自动保存。
2. 点击“添加说明”，点选控件或拖出矩形，随后填写卡片标题和正文。点选时阻止原控件操作；Esc 退出选取。
3. 删除手工说明后撤销上次删除。ID 和展示编号不复用。

发布只复制原型 HTML/CSS/JS 与 `data/annotations.js`。服务器不部署编辑器，没有新增、编辑和删除入口；编号、卡片、连线与折叠功能保留。

## 覆盖层与兼容

`window.__ANNO__` 继续保留 `overrides / additions / removed` 和未知字段，新增 `notes: { [pageKey]: 手工说明数组 }`。新运行时读取旧 flat 覆盖格式。手工卡片包括稳定 ID、编号、标题、正文、目标 selector、可选相对矩形与场景 selector。删除使用 tombstone，不复用 ID。

`data-page` 是稳定页面键，同一原型内不能重复。移动页面或重命名文件时保留该键。生成过程不得覆盖 `data/annotations.js`。

新增接口：GET `notes-session`；POST `save-notes` 携带 token、revision、pageKey、变化的 overrides 和本页 notes 数组。服务器保留其他页面数据，原子写盘；版本冲突返回 409，停止自动覆盖并提示用户保留当前内容后重新打开合并。

点选优先绑定 DOM ID 或 `data-mark-key`；无稳定标识时退回结构路径。动态表格行须提供稳定业务标识，避免刷新或排序后误指。框选位置相对共同容器保存。大幅调整 DOM 后需要重新核对目标；找不到目标时保留说明并提示。

## 验证

- `node scripts/check-prototype-editable.mjs <原型目录>`：检查 ID、加载顺序和说明资源。
- `node --test assets/editor/launcher.test.js`：检查旧服务占用时另选端口、同版复用和旧页面不中断。
- `node --test assets/editor/notes-store.test.js`：检查跨页保留、旧格式、富文本、冲突与接口。
- 浏览器操作：局部编辑和底部富文本编辑落盘；点选/框选、弹窗场景、刷新保留；全局框展开/隐藏；静态服务不出现编辑入口。
- 保留原版时，先保存原版文件哈希，再复制新目录；结束后核对原目录与原覆盖文件未变化。
