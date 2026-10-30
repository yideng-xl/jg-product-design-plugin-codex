# 产品 A 运行界面采集清单

采集日期：2026-10-16。系统显示版本：V1.24.1。已浏览 47 个不同路由，记录 71 个页面/弹层观测状态。只读浏览，未提交新增、修改、删除或运维操作。

## 覆盖边界

“已查看”表示入口页面已经打开，不表示全部数据分支或交互路径已验收。代表性深入观察包括：工单新增抽屉、扩展筛选、日期区间、资产穿梭；网关详情 6 个标签页；资产新增居中弹窗；工序卡新增三段子表；规则库新增；用户新增；全局配置各标签页。

未验证提交、服务端校验、权限差异、告警处置、媒体回放、导入导出结果及全部记录详情。空数据页面仅确认结构和空态。仪表盘模板中的地图是待接入容器，图表为匿名演示，并非现网图表完整复刻。

原始页面截图和业务数据不打包；`assets/products/jg/measurements.json` 仅保留路由、状态名和样式测量。`icons.svg` 为页面可见的 12 个导航图形；`empty.png` 为不含业务数据的空态插图。

## 页面覆盖

| 页面入口 | 路由 | 状态 |
|---|---|---|
| 运维工单管理 | `#/workorderManagement/devopsTask` | 已查看入口 |
| 站点信息管理 | `#/workorderManagement/stationRelationship` | 已查看入口 |
| 资产台账管理 | `#/workorderManagement/standingBook` | 已查看入口 |
| 定制任务管理 | `#/workorderManagement/customTask` | 占位页面：功能开发中 |
| 定制任务反馈 | `#/workorderManagement/customTaskFeedback` | 占位页面：功能开发中 |
| 日志集中管理 | `#/logManagement/alarmLog/riskCommand` | 已查看入口 |
| 违规外联 | `#/logManagement/alarmLog/foulOutreach` | 已查看入口 |
| 攻击行为 | `#/logManagement/alarmLog/attackAct` | 已查看入口 |
| 高危端口 | `#/logManagement/alarmLog/highriskPorts` | 已查看入口 |
| 恶意代码 | `#/logManagement/alarmLog/maliceCode` | 已查看入口 |
| 二次授权 | `#/logManagement/alarmLog/secondaryAuth` | 已查看入口 |
| 规则自动更新 | `#/rulerManagement/rulerRepo` | 已查看入口 |
| 推送范围管理 | `#/rulerManagement/pushRange` | 已查看入口 |
| 操作指令规则 | `#/rulerManagement/operateCommand` | 已查看入口 |
| 控制指令规则 | `#/rulerManagement/controlCommand` | 已查看入口 |
| 高危端口规则 | `#/rulerManagement/highriskPorts` | 已查看入口 |
| 运维网关管理 | `#/basedataManagement/gatewayWorking` | 已查看入口 |
| 网关备案管理 | `#/basedataManagement/gatewayRegister` | 已查看入口 |
| 恶意代码库升级 | `#/basedataManagement/virus` | 已查看入口 |
| 网关固件升级 | `#/basedataManagement/software` | 已查看入口 |
| 扩展底座管理 | `#/basedataManagement/gatewayBed` | 已查看入口 |
| 网关通信记录 | `#/basedataManagement/gatewayContactrcd` | 已查看入口 |
| 工序管理 | `#/procedureManagement/procedureExecuteAudit` | 已查看入口 |
| 运维监控 | `#/devopsMonitor/woRecord` | 已查看入口 |
| 系统管理 | `#/systemManagement/orgManagement` | 占位页面：功能开发中 |
| 用户管理 | `#/systemManagement/departmentManagement` | 已查看入口 |
| 角色管理 | `#/systemManagement/roleManagement` | 已查看入口 |
| 菜单管理 | `#/systemManagement/menuManagement` | 已查看入口 |
| 字典管理 | `#/systemManagement/dictionaryManagement` | 已查看入口 |
| 审计日志 | `#/systemManagement/logManagement` | 已查看入口 |
| 告警日志 | `#/systemManagement/warningLogManagement` | 已查看入口 |
| 全局配置 | `#/systemManagement/configManagement` | 已查看入口 |
| 级联管理 | `#/systemManagement/cascadeManagement` | 占位页面：功能开发中 |
| 安全配置 | `#/systemManagement/securityManagement` | 已查看入口 |
| 工序卡管理 | `#/procedureManagement/procedureCard` | 已查看入口 |
| 事中审计确认 | `#/procedureManagement/auditConfirm` | 已查看入口 |
| 首页 | `#/home` | 已查看入口 |
| 认证登录 | `#/logManagement/devopsLog/loginAuth` | 已查看入口 |
| 操作日志 | `#/logManagement/devopsLog/deviceOpreate` | 已查看入口 |
| 设备插拔 | `#/logManagement/devopsLog/deviceSfp` | 已查看入口 |
| 文件传输 | `#/logManagement/devopsLog/fileTransfer` | 已查看入口 |
| 屏幕录像 | `#/logManagement/devopsRcd/screenvcr` | 已查看入口 |
| 通信报文 | `#/logManagement/devopsRcd/commmsg` | 已查看入口 |
| 指令记录 | `#/logManagement/devopsRcd/command` | 已查看入口 |
| 键盘记录 | `#/logManagement/devopsRcd/kmouse` | 已查看入口 |
| 综合监视-第1入口 | `#/sysMonitor/practicalMonitor` | 已查看入口 |
| 综合监视-第2入口 | `#/sysMonitorSd` | 已查看入口 |

## 样式基线

| 项目 | 已观测值 |
|---|---|
| 主色 / 页面背景 | #0FA081 / #EFF3F8 |
| 字体 | PingFang SC 等系统中文字体，常规 14px |
| 顶栏 / 导航按钮 | 60px / 32px |
| 侧栏 / 菜单行 | 180px / 56px |
| 输入 / 按钮 | 高 32px，圆角 4px |
| 表格表头及行 | 40px，常规居中 |
| 工单抽屉 | 1440px 视口下宽 1200px、全高；头尾 62px、主体内边距 12px |
| 双月日期面板 | 646 × 412px |
| 文本域 | 高 64px，内边距 5px 11px |
| 默认分页 | 页面存在 25 条与 15 条差异，按具体页面配置 |

模板为了演示翻页使用 10 条/页；正式原型须按目标页面设置。样例中的业务字段、选项、必填条件、保存结果均不能替代当前 PRD。禁用、校验、步骤、提示、键盘等扩展状态含原型补充实现，未逐一确认与运行界面相同。

## 本次验证

- 5 个 HTML 的本地引用、重复 ID、内联脚本语法检查通过；jg.js 语法与 Git 差异检查通过，图标 SVG XML 解析通过。
- 浏览器验证：不存在关键词返回 0 条，重置后恢复 16 条；第 2 页显示 6 条；树选择甲站点返回 1 条；穿梭选项移动到右栏；双月区间回填；抽屉关闭；详情标签页切换。
- 在 1440 × 1000 视口查看列表、树列表、详情、仪表盘及新增抽屉；修正导航尺寸、抽屉宽度和标签换行。
- 单独复制组件包与 common.js、skill-extras.css、已有 annotations.js 接入验证：用户原有说明成功回填；产品 A 抽屉可独立开关；控制台无错误；check-prototype-editable.mjs 通过。未测试所有编辑器保存路径。
- skill-creator 的 quick_validate.py 因本机 Python 缺少 PyYAML 未运行成功。未将此项记为通过。
- 本次只更新源码，未提交、推送或更新安装缓存。
