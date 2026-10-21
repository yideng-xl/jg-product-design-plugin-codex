# 网管组件接口

网管业务页面只使用 `assets/products/wg/wg.css`、`wg.js` 和 `wg-` 类名。已观测外观与演示交互的边界见 [采集清单](wg-ui-inventory.md)，接入说明层见 [产品资产选择](products.md)。以下接口以包内实际代码为准。

## 页面与模板

| 模板 | 组合方式 |
|---|---|
| `templates/list.html` | 筛选、工具条、普通表格、分页 |
| `templates/tree-list.html` | 左侧分类树、右侧列表 |
| `templates/device-detail.html` | 设备详情与页内标签；匿名数据 |
| `templates/alarm-monitor.html` | 告警筛选、状态与列表 |
| `templates/task-editor.html` | 全页巡检任务编辑；选择巡检类后打开新增设备抽屉 |
| `templates/report.html` | 多级表头、报表筛选 |
| `templates/topology.html` | 默认实测空画布；显式载入匿名演示节点后可体验节点互动 |

路径相对 `assets/products/wg/`。先打开对应模板确认完整结构，再复制到本轮原型。`index.html` 为组件展示入口。

## 基础结构

页面使用 `body.wg-app`。顶栏 `.wg-header` 包含 `.wg-brand`、`.wg-topnav`、`.wg-header-right`；导航分组 `.wg-nav-group`，项目 `.wg-nav-item`，激活态 `.is-active` 或 `[aria-current=page]`。展开菜单使用 `.wg-mega-menu#ID[hidden]`、`.wg-mega-column`、`.wg-mega-title`，导航触发器设置 `data-wg-menu="ID"`。

工作区标签 `.wg-workspace-tabs > .wg-workspace-tab`；关闭按钮 `data-wg-tab-close`，同页标签可设置 `data-wg-workspace-panel="面板ID"`；正文 `.wg-main`，面包屑 `.wg-breadcrumb`，白底容器 `.wg-content`。树列表使用 `.wg-tree-layout`、`.wg-tree-pane`。组件参数放在 `--wg-*` 变量中，不引用另一产品的 token。

按钮 `.wg-btn`，变体 `.wg-primary`、`.wg-danger`、`.wg-text`。输入 `.wg-input`；表单 `.wg-form > .wg-field`，标签与控件 `.wg-label`、`.wg-control`；必填 `.wg-required`，错误 `.wg-field-error`。复选、单选、开关分别为 `.wg-check`、`.wg-radio`、`.wg-switch`，配合原生输入。

## 筛选与表格

`form.wg-search[data-wg-table="表格ID"]` 控制对应表格；`name="q"` 为全文筛选，其他命名输入与行的 `data-字段名` 精确匹配。提交触发查询，原生 reset 重置。更多条件通过 `[data-wg-toggle="区域ID"]` 控制目标的 `hidden`。

`.wg-table-wrap > table.wg-table#表格ID[data-wg-page-size]`，`tbody` 存放全部匿名示例行。表头 `[data-wg-sort="从0开始的列序号"]` 支持排序；单元格可用 `data-wg-sort-value` 提供排序值。`.wg-fixed-left` / `.wg-fixed-right` 为固定列。`[data-wg-pagination="表格ID"]` 生成分页。

.wg-columns 列设置浮层内使用 `input[type=checkbox][data-wg-column="列索引"][data-wg-table="表格ID"]`，列显隐只用于平面列表。该入口的现网形态是浮层，不应改成 dialog。

多级报表使用 `.wg-report-table` 和原生 `rowspan`、`colspan`。不需要脚本分页的表格标记 `data-wg-static`。代码的分页默认值只服务演示，本轮业务参数仍按确认规则填写。

## 选择、树和标签页

选择器 `.wg-select` 内包含 `.wg-select-trigger` 与 `.wg-select-options`；选项按钮使用 `data-wg-value`，触发器内 `.wg-select-label` 显示当前值。可放带 `name` 的隐藏输入参与表单筛选。选择后触发 `wg:select`，`detail.value` 为所选值。

树 `.wg-tree#树ID` 使用嵌套 `ul/li`，行容器 `.wg-tree-node`；按钮 `data-wg-tree-toggle` 折叠，`data-wg-tree-select` 选择。搜索输入 `data-wg-tree-search="树ID"`。选中事件 `wg:tree-select` 提供 `detail.value`。拓扑树有 `.wg-tree-topology` 变体，行高不同于普通树。

标签组 `.wg-tabs` 或 `.wg-segments`，按钮 `data-wg-tab="面板ID"`，初始激活按钮加 `.is-active`。每组只控制其引用的面板。

## 弹层与日期

居中弹窗使用 `dialog.wg-modal#ID`，内部 `.wg-modal-header`、`.wg-modal-body`、`.wg-modal-footer`；打开按钮 `data-wg-modal-open="ID"`，关闭按钮 `data-wg-modal-close`。原生 dialog 管理模态，关闭后恢复焦点。主站新增和主站规则新增均观测为 720px 居中弹窗。网络设备新增使用 `.wg-modal.wg-drawer`，默认宽 1000px，位于工作区内，顶部 107px、右侧 16px、底部 12px；可通过 `--wg-drawer-*` 变量调整。不要将其改成覆盖顶栏的全屏高抽屉。

日期区间 `.wg-date-picker` 包含 `.wg-date-trigger` 和隐藏输入 `[data-wg-date-start]`、`[data-wg-date-end]`；`data-wg-date-field` 指定表格筛选字段。双月选择、时间输入和校验是本地原型实现，未实测状态保持待校准标记。

详情使用 `.wg-detail-grid`、`.wg-detail-item`、`.wg-detail-label`、`.wg-detail-value`；状态 `.wg-status` 配合 `.wg-success`、`.wg-warning`、`.wg-error`。提示通过 `data-wg-tooltip`。图标 `svg.wg-icon > use[href="#wg-icon-search"]`，包内提供 search、reset、plus、chevron、close、upload、download、folder、file、check、info。

脚本入口 `window.WG`：`init(root=document)`、`refreshTable(id)`、`openModal(id)`、`closeModal(id)`、`setColumn(tableId, column, visible)`。重复初始化不重复绑定。表格重绘事件 `wg:table-render` 提供 `total`、`page`、`pageSize`。

巡检任务的设备选择先要求选择巡检类，再打开 1000px“新增设备”抽屉。抽屉包含基本信息与巡检内容表，底部取消、保存；示例保存属于本地演示。模板只保留已采样的巡检任务编辑形态，未采样流程画布已移除。

## 复用边界

筛选、排序、分页、标签和弹层操作均在浏览器内处理。演示表单反馈不能证明后端保存、权限、运维动作或审核流程已经实现。保留当前需求的字段规则，示例数据匿名化，不放现网地址、截图、人员或客户数据。

## 主题与新增接口

主题样式通过 `body.wg-app[data-wg-theme="blue"]` 启用雅致蓝深色；`data-wg-theme="green"` 为国网绿。保持 `wg-` 组件结构，只切主题属性。示例 URL 可用 `?theme=blue` / `?theme=green` 指定主题；本地保存仅影响原型查看，不修改现网设置。

主题初始化顺序为 URL 显式参数、localStorage 的 `wg-prototype-theme`、默认 green。模板在 head 中设置根元素主题以避免初始闪白，再同步 body。切换按钮使用 `data-wg-theme-option="blue"` / `"green"`，或调用 `WG.setTheme(value, updateURL=true)`；它同步根元素与 body、按钮状态、本地存储和同源 HTML 链接的主题参数。

工作区滚动容器 `.wg-workspace-shell` 内使用 `data-wg-tabs-scroll="-1"` / `"1"` 按钮。`WG.icon(name)` 返回导航 SVG 字符串，支持中文导航名及 home、assets、monitor、communication、operations、security、reports、system；图形资源来自包内 `icons.svg`。

列设置使用 `.wg-column-settings` 内的 `[data-wg-columns-open="面板ID"]` 和 `.wg-columns-popover#面板ID`。浮层宽 260px，勾选暂存；`data-wg-columns-apply` 确认生效，`data-wg-columns-cancel` 恢复已应用状态，`data-wg-columns-reset` 将暂存值恢复为 HTML 初始 checked。只用于平面列表，不对多级表头直接隐藏列。
