# 硬件与终验配置

脚本依赖 Python、python-docx、Pillow、numpy、pdfplumber；读取货物清单另需 openpyxl。使用当前文档环境的运行时，不在技能包内保存业务材料或安装项目级私有依赖。配置及报告放本次输出目录。

## 数据配置

`migration.json` 是当轮事实，不随 Skill 发布。必要字段：

- `historical_paths`：实际参考的定稿完整路径；`history_text_files`：这些文件的本次文本提取副本。脚本从定稿上级目录、文件名客户和高频客户表达生成黑名单。
- `target.region`、`target.project_names`、`target.allowed_entities`：本项目地区、全部项目名称与已确认供应商标识；不是任意删除黑名单的豁免开关。
- `goods_records`：完整货物清单逐行对象，原字段名与值原样保存，以 `included` 标识当前包；排除包的名称和编码自动加入黑名单。包含“是否、编码、电压、采购申请、租赁”的字段必须在交付中有响应。
- `hardware_required`；`bom.approved`、`bom.items`、`bom.supply_boundary`、`bom.operating_terminals`、`bom.evidence`、`bom.unresolved`：BOM通过条件是批准、全部必填项有值且未决项为空。机箱、服务器和终端是不同对象，不能互相代填。
- `require_ref_indexes`：默认true，启用后，所有【索引】段必须含有效REF域且书签存在，纯文本显示章节号不算有效交叉引用。
- `warranty_years`：用户确认的唯一年数；`scoring_sections`：必须各有独立索引表的章节完整标题。
- `unverified_performance_patterns`：本项目尚无资源或测试依据的高性能承诺正则；从继承稿与本次门槛的差异提取，正文及表格命中即失败，不能只检查偏差表。
- `require_image_audit`：默认true；`image_policy`：下述图片配置。

用户未确认的硬件能力、零部件或合同条款不能由脚本补造。缺项保留在独立问题单；停止保证值和正式无负偏差声明的生成，其他已获授权工作可以继续。独立证明材料中的历史事实不改写，不从补充文档内的源文件链接推断读取该文件的权限。

## 图片

`image_policy.overview_ids` 按本次文档出现顺序指定 `#001` 等图片编号，默认空，最多1张；不把某个编号固化在 Skill。`figures` 可按编号或原图SHA256覆盖分类或裁剪矩形，分类改变需写 `review_reason`；矩形为原图像素 `[left, top, right, bottom]`。宽高默认 `width_max_cm=14.2`、`height_max_cm=7.4`，`group_heading_level=4`。

检测使用顶部绿色宽条和侧栏分界；找不到可靠分界时按比例裁剪，并在报告中记录fallback，必须查看裁图确认未切掉表单或列。中央弹窗仅保留无菜单的灰底上下文；右抽屉从对话框左缘裁切，保留完整标题及底部操作区；用户的具体裁图要求优先。算法不会从架构和扫描件中凭颜色随意切图，分类不明必须显式核实。颜色/几何检查不是OCR，不能据此宣称所有文字旧名已清除；最终仍检查图片示例文字和功能内容。

图像清单含 `relationship_id`、章节、四类分类、原图及结果哈希、裁剪矩形、检测方式、`residual_menu`、`rendered_width_cm`、`width_deviation`、`pre_image_whitespace_ratio`。裁前状态 `awaiting_render_audit` 不能当通过；实际PDF映射失败、缺测、宽度偏差超过5%、图前空白超过30%或超宽高阈值均退出2。不可仅更新清单哈希绕过图片审计。

## 命令

以下 `python` 是文档运行时解释器；路径按当前项目替换。首次先备份稿件。`run` 只在全部门禁通过后将 candidate 提升为指定输出，失败候选留工作目录供整改。

```text
python scripts/bid_gate.py run working.docx --config migration.json --output accepted.docx --work-dir qa --renderer /absolute/path/render_docx.py --max-attempts 3
```

需要分步定位时：

```text
python scripts/bid_gate.py repair working.docx --output clean.docx --report repair.json
python scripts/bid_images.py clean.docx --output candidate.docx --policy image-policy.json --report images.json --assets-dir figures
python /absolute/path/render_docx.py candidate.docx --output_dir render --emit_pdf --dpi 100
python scripts/bid_gate.py audit candidate.docx --config migration.json --pdf render/candidate.pdf --images images.json --report gate.json
```

退出0仅表示本次已测的门禁通过；退出2为硬失败，包括缺配置、未决BOM、旧名、重复应答、质保不唯一、特殊字段漏项或图片/排版失败。渲染器缺失或崩溃同样失败，不以“环境限制”转换为通过。

自动结构修复只针对有明确机制的表头、连页、幽灵列及冗余分页；超过三轮或语义缺口须保留失败清单，修正内容或向用户核实后重跑，禁止循环降低门槛。标题表格检测、单字表头识别及色带检测属于可解释的自动筛查，既要处理真阳性，也要凭页面证据修正误检，不能直接删规则。提交裁判前仍需逐页查看实际页面。

## 表格与内容硬门禁

折叠列时同步扣减gridBefore/gridAfter，并校平wBefore/wAfter；为0时删除对应占位属性。每行必须满足gridBefore+所有gridSpan+gridAfter等于网格列数，每个单元格tcW须等于所跨gridCol之和，不只检查小于200 twip的列。三线表及复合表头的前几行也检查单字孤行。正文反引号、行首Markdown标题及连字符列表均阻断，转换为正常Word文字或列表。评分索引不得并列保留无REF的旧纯文本对照表。

operating_terminals采用弱化默认满足时，设备结构响应必须写默认满足且不使用机箱替代终端，不列终端型号清单；技术方案不得写成四个终端已供货事实。规范原文要求列保留。

## 系统页面和证明扫描件边界

仅系统页面截图可做去菜单裁剪；总体介绍仅按名单保留，具体功能模块仅留主体用于功能对应。合同、检测报告、制度凭证扫描件严禁裁剪，必须完整呈现，避免客户误解隐瞒信息；document_type属于此三类或证书时，分类为界面即阻断。右抽屉裁切左缘必须等于对话框左缘，不向左保留灰色菜单；中央弹窗允许保留不含菜单的灰底上下文。残留检测同时检查绿色导航和灰色侧栏/右抽屉分割特征。非绿色顶栏界面必须通过image_policy明确分类与裁剪矩形，不能默认判作非界面。

图前空白按同页上一个文字、表格或图片对象底边起算；上一张图片的高度不计为空白。分类、分割、几何检测不冒充OCR，仍须查看裁图。
