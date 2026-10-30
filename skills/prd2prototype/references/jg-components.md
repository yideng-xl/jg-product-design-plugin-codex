# 产品 A 包 HTML 接口
body.jg-app（默认1440最小宽）；示例可加 jg-fluid。
布局：.jg-header > .jg-brand + .jg-topnav > a/button.jg-nav-item[aria-current=page]；.jg-layout > aside.jg-sidebar + main.jg-main；.jg-breadcrumb；.jg-content 白底；.jg-toolbar/.jg-spacer。
按钮 .jg-btn[.jg-primary/.jg-danger/.jg-text]；输入 .jg-input；表单 .jg-form > .jg-field > label + .jg-control；.jg-required；.jg-check/.jg-radio 包原生 input；.jg-switch 原生 checkbox。
筛选：form.jg-search[data-jg-table=表格id]，input[name=q] 全文；其他 name 对应 tr[data-字段名] 精确过滤。submit查询，type=reset重置。更多按钮[data-jg-toggle=区域id]，对应区域[hidden]。
表格：.jg-table-wrap > table.jg-table#id[data-jg-page-size=25]，tbody 是完整静态示例行，th[data-jg-sort=列序号] 可排序。td.jg-fixed-left/right，第二固定列用 style=--jg-sticky-left:56px。分页 div.jg-pagination[data-jg-pagination=表格id] 由JS生成。无数据自动生成行。
Tabs：.jg-tabs 或 .jg-segments 内 button[data-jg-tab=面板id]；内容 div#面板id.jg-tab-panel；每组只控制其明确引用的面板，初始按钮 class=is-active。
弹窗：button[data-jg-modal-open=dialogId]；dialog.jg-modal#dialogId > .jg-modal-header + .jg-modal-body + .jg-modal-footer；关闭 button[data-jg-modal-close]，native dialog 管理模态和Escape，JS恢复焦点。宽度 style=--jg-modal-width:900px。
选择器：div.jg-select > button.jg-select-trigger[type=button] + div.jg-select-options[hidden] > button[type=button][data-jg-value=value]，可含 input[type=hidden][name=status]；trigger内span.jg-select-label。选择后回填值触发change。选项/触发器支持键盘。
树：div.jg-tree#treeId，嵌套 ul/li；li > .jg-tree-node 内 button[data-jg-tree-toggle] 与 button[data-jg-tree-select]；子ul；树搜索 input[data-jg-tree-search=treeId]。
穿梭：div.jg-transfer > .jg-transfer-panel[data-jg-transfer-side=left/right]，各有 input[data-jg-transfer-search] + .jg-transfer-list > label.jg-transfer-item > input[type=checkbox] + 文字；按钮[data-jg-transfer-move=right/left] 放同一transfer内，移动勾选项。
上传：label.jg-upload > input[type=file] + 按钮样式span + span[data-jg-file-name]；只显示本地文件名。
日期区间：.jg-date-picker 内 .jg-date-trigger 按钮及 input[type=hidden][data-jg-date-start]、[data-jg-date-end]；由脚本生成双月面板。data-jg-date-field 对应表格行的日期字段时参与筛选。
详情 .jg-section-title/.jg-detail-grid > .jg-detail-item > .jg-detail-label + .jg-detail-value；.jg-status[.jg-success/.jg-warning/.jg-error/.jg-neutral]；.jg-empty；.jg-steps > .jg-step[.is-done/.is-active]；.jg-kpis > .jg-kpi > .jg-kpi-label + .jg-kpi-value；.jg-version-card > .jg-version-title。
Tooltip 任意元素[data-jg-tooltip=文字]（聚焦/悬停触发）；图标 svg.jg-icon > use[href=#jg-icon-search]，JS注入 search/reset/plus/chevron/close/upload/download/folder/file/check/info 图形。
JS window.JG: init(root=document), refreshTable(id), openModal(id), closeModal(id)。重复init不重复绑定。

抽屉：dialog.jg-modal.jg-drawer，默认宽1200px。居中旧式弹窗使用 .jg-modal-legacy。
外部导航图标：svg.jg-icon > use[href="相对路径/icons.svg#workorders"]，可用ID见SVG；内部线性图标使用 #jg-icon-*。

## 使用边界

本包为无后端原型组件。筛选、排序、分页、树、日期、穿梭、标签页和弹层由本地脚本处理；上传只显示文件名。示例保存仅改变内存，刷新即恢复。业务数据和校验规则由当前需求补齐。完整页面组合直接参考 templates/，不要只凭类名猜结构。
