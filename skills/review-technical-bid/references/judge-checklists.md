# 裁判职责、清单与门禁

## 角色 A：红队攻防裁判，四阶段攻击

审商务/技术响应能否评分、签约，专找事实偷换、无依据承诺和机器假绿。只核对商务与技术的交界及证据，不替其他责任方填资质、业绩、人员或授权。

| 阶段 | 必查项 |
|---|---|
| 1. 前置材料与 BOM | 基础版由用户点名；责任方章节保持框架。硬件 BOM 批准，整机、核心部件、网口、电源、操作系统、数据库、数量、品牌型号、制造商、原产地、供货边界、操作终端及证据齐全，未决为空。机箱、服务器、终端不得互代。逐项目扫描货物全字段；质保年数、起算、对象、重复故障规则闭合；继承性能绑定本次资源与测试。 |
| 2. 初稿盲测 | 攻击偏差表、保证值、环境/绝缘/电磁兼容、组件表与服务承诺：不能一边需确认一边无负偏差或正偏差，不能用产线装备型号冒充交货设备。核对使用环境、静电放电、工频磁场的值、等级、判据与有效证明。软硬一体四段骨架齐全，功能段覆盖配套装置。专用逐节独答、通用按模块集中应答；评分各有独立活 REF 索引直达正文。初稿应答红字黄底并加下划线，规范原文不整体染色；编稿过程语不进正式正文。逐项目表不能合并或用一个名称代表整包。 |
| 3. 修复复审与假绿攻击 | 对上轮每条必改项读 XML、看页面、核对真实响应格；报告“已弱化”不能代替实改。哈希须对应同一版稿件，不能只改清单。旧缺陷负对照应退出 2 且出现预期错误码；检查灰色侧栏残字、合并单元格宽度、叠图空白算法、终端偷换等漏检。全量回归检查新伤。 |
| 4. 发布前对比 | 对比认可成稿的实质能力，按内容映射而非标题差集判丢章；保留其他责任方空节。核对 Word 实读、字段/截图/REF 覆盖、通用性与精确提交路径，不用自动稿覆盖人类成稿。 |

终端证据未闭合时，招标要求列保留原文，不将弱化措辞、“默认满足”或机箱型号当成确定供货事实。初稿可以列问题，正式保证值与承诺仍需证据闭合；现行配置允许的初稿表达不自动构成终验通过。

## 角色 B：独立验收裁判，五阶段核验

对长材料横向核对真源，追到 OOXML、实际页面和门禁反向验证。不能以红队抽查替代全量覆盖。

两角色均遵守入口 Skill 的执行体独立和信息隔离要求：切换不同模型时仍须新建无编写上下文的审核任务，或为每个角色新开不继承父上下文的只读独立子代理。优先采用不同厂商的模型减少同源盲区；厂商与模型选择不属于输入契约。只交接待审产物、真源和门禁证据，双方提交独立结论前不互看报告，不接收编写者自我结论作为判断依据。

1. **Pre-flight 真源与配置。** 框架、通用/专用规范、澄清、评分、货物清单、基础版逐项登记来源和适用项目。效力冲突不自行取宽松要求。扫描正文、表格、附录和供货范围；“是否、编码、电压、采购申请、租赁”字段同时核对字段名、原值与交付动作。动态黑名单覆盖历史客户、项目、排除包；白名单仅真正确认目标与供应商。排查同公司其他产品术语污染，不能照抄项目事实进通用 Skill。
2. **机器门禁全量执行与 OOXML。** 不仅读取 passed：核对配置完整性、哈希、错误清单和现行代码。标题四绑定为 Heading1–9、outlineLvl、同一多级 numId、lvl/pStyle；abstractNum 有唯一八位 nsid、hybridMultilevel 且无显式 lvlRestart。小列表按节和父项独立 numId、startOverride=1；大序号用 Word 实读。字体、字号、段距来自当轮框架直接格式；正文 firstLineChars=200 与字号对应 firstLine，无 hanging 或手打空白，并检查 widowControl。表格/图片/标题/原规范编号等按各自规则，不能套正文格式。
3. **多模态全量渲染与 Word 实测。** PDF 每页检查空白、标题与首表/首段分离、竖条窄列、半页异常空白、文字截断、单字表头。每行 gridBefore + gridSpan 总和 + gridAfter = 网格列数；tcW = 所跨 gridCol 总宽，省略列宽也一致；无小于 200 twip 幽灵列，只有首表头行 tblHeader，无表内 keepNext。Word 实测导航、列表重启、刷新 REF 与缓存，不能用 PDF 代替。若复用此前 Word 实读，须证明 DOCX、编号部件、标题顺序和 REF 均未变；否则重测。
4. **负对照与发布安全。** 隔离重跑已知缺陷稿或合成样本，预期退出 2 并命中对应错误码；单测全过不代替负对照。核对 Skill、配置、模板、测试 diff 无专名与本机路径，无业务产物。记录完整命令、版本、退出码、原件/副本哈希。未获准读旧稿时使用合成样本，不越权取证。
5. **定稿对比与裁决。** 按条款与实质内容对比认可成稿，量化 audit 错误数、活 REF 数、表格/图片计数、旧名及特殊字段覆盖率，分清职责边界与实质差距；不用人类成稿中的厂房、产能或业绩自动补技术稿。汇总双方结果、必改项与未查范围，仅以全部适用硬门禁成立作通过结论。

图片在两套清单中都必查：总体介绍、模块功能、弹窗、非界面四类；总体介绍白名单默认空、最多一张。模块和弹窗去菜单，细框及裁切按当轮策略；右抽屉从对话框左缘起，保留标题和底部按钮，灰侧栏不得可读；中央弹窗可保留无菜单灰底。非界面图、合同、报告、证书、制度凭证、架构图及流程图不裁，核对原图 SHA256。非绿色界面须显式分类和裁框。核对关系 ID、部件哈希、页面映射；同节宽度偏差 ≤5%，图前空白 ≤30%，默认宽高上限 14.2×7.4 cm（脚本容差不授权放宽策略）；空白从同页上一个图文对象底边起算。颜色和几何检查不是 OCR；未做 OCR 或逐图文字检查不能宣称图内旧名清零。

## 硬门禁：退出 2 一票否决

以下为当前编制侧三个脚本的错误码全集；审核使用当轮真实版本，新增码默认按硬失败处理，不因本表未列而忽略。审核不运行会改稿的图片生成器，从已有图片报告读取其错误，并独立核验图像。

| 类别 | 错误码 |
|---|---|
| 预检即停 | `bom_preflight`、`missing_format_profile` |
| 内容、承诺与响应 | `old_entity`、`missing_hardware_skeleton`、`goods_special_field`、`warranty_not_unique`、`unresolved_warranty`、`unverified_performance`、`unresolved_commitment`、`unresolved_guarantee`、`operating_terminals`、`duplicate_special_answer`、`imprecise_special_index`、`all_see_elsewhere`、`missing_scoring_index`、`plain_scoring_index`、`invalid_reference_index`、`markdown_residue` |
| 编号与格式 | `heading_numbering_binding`、`missing_independent_heading`、`multiple_chapter_number_instances`、`numbering_identity_missing`、`numbering_identity_collision`、`invalid_numbering_reference`、`heading_restart_compatibility`、`list_cross_section_continuation`、`list_restart_missing`、`list_ordinal_overflow`、`body_first_line_indent_drift`、`font_size_drift`、`paragraph_spacing_drift` |
| 表格 | `ghost_column`、`nonfirst_header`、`table_keep_next`、`table_grid_mismatch`、`row_omission_width_mismatch`、`cell_width_mismatch` |
| 渲染 | `render_failed`、`blank_page`、`title_table_split`、`single_character_header_wrap`、`missing_render_audit` |
| 图片分类与保护 | `unclassified_drawing`、`unsupported_image`、`protected_document_crop`、`invalid_kind`、`overview_not_allowlisted`、`unreviewed_classification_override`、`crop_failed`、`menu_residual` |
| 图片证据与布局 | `figure_hash_mismatch`、`stale_figure_manifest`、`figure_render_mapping`、`figure_width_deviation`、`figure_preceding_whitespace`、`figure_bounding_box`、`missing_image_audit` |

总结材料中的 `residual_menu` 是清单字段；灰侧栏或残留菜单当前实际错误码为 `menu_residual`，不是 `gray_sidebar_or_menu_context`。编号身份 collision/missing 是两个码。报告写当轮实测码，不把摘要别名当已实现功能。

裁判附加红线同样否决，即使脚本返回 0：

- 真源漏项、配置删规则/抬阈值/滥用白名单、事实伪造、跨项目或跨产品污染、责任方越权代填。
- 不确定保证值、质保或无负偏差声明；产品支持能力冒充本次部署；软件性能冒充硬件保证；机箱或产线设备冒充终端/供货设备；证据与响应不符。
- 脚本漏报但 XML/页面已证实的空白页、标题分离、截断、竖条表格、灰菜单、单字表头、无效 REF、错误列表起号、正文 Markdown 或图片裁坏。
- 输入与报告哈希不一致、只改清单哈希、渲染不是同版、关键证据缺失、负对照不失败、测试失败或未做适用的必需核验；原件被审核操作改写。
- 未逐页检查就声称全量视觉通过，未做 Word 实测却以其他渲染结果替代，未核图中文字却声称全图旧名清零；伪称实际未运行的裁判结论。
- 审核执行体未独立于编写者、继承编写上下文或自我结论、双角色提交前互看报告，或无法提供信息隔离实证；不得以换模型名或模拟角色代替独立执行。
- Skill、模板、测试含客户/地区/项目/机型/合同号/本机路径，或提交清单夹带业务产物；未通过仍请求作为终验发布。

审核侧不执行自动修复。编制侧仅可自动修以下版式码：`blank_page`、`title_table_split`、`single_character_header_wrap`、`nonfirst_header`、`table_keep_next`、`ghost_column`、`table_grid_mismatch`、`cell_width_mismatch`、`row_omission_width_mismatch`；语义项、渲染器故障、预检失败立即熔断。裁判不得用“可自动修”把当前失败改判通过。

## 软门禁：P2 建议的边界

叙述展开深度、实施计划颗粒度、已有效的偏差表索引进一步细化、已完整评分索引的展示颗粒度、无事实污染的同源措辞润色，可列建议。标题不同但实质能力已覆盖、同节图片按比例高度不同、其他责任方按模板留空，不单独否决。

扫描件未做 OCR 是检查局限，字节不变仅证明未裁改；若图中文字核验属于本轮必需范围而无法完成，则未通过，不能降为建议。条款号开头的手写段落是否误用须按用途核对；若已违反自动列表或缩进硬门禁，就不能列 P2。“需确认”属于正常功能操作文字时不误判未决承诺；若出现在保证值与正式承诺中，必须按硬门禁核对。单字表头、无 REF 评分表、正文 Markdown、灰菜单和终端偷换已是硬失败，不再作为润色建议。
