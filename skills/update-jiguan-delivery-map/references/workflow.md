# 集管地图更新链路

先根据当前工作区确认真实路径，用户使用的目录简称可能与实际编号不同。

| 内容 | 路径 |
|---|---|
| 集管目录 | `10-productDocs/01-集管/30-产品交付进度/` |
| 地图 | `集管产品交付地图.html` |
| 月度输入 | 用户指定的集管《进度跟踪表》 |
| 地理骨架 | `集管项目进度表_按调度体系.xlsx` |
| 内部发布仓库 | `10-productDocs/10-gitlab/prototypesite/` |
| 发布文件 | `交付地图/集管产品交付地图.html` |

在集管目录中使用已有 `.venv/bin/python`（依赖 `openpyxl`、`pandas`），每次命令显式设置工作目录：

```bash
.venv/bin/python apply_monthly_update.py '<真实月度文件>'
.venv/bin/python update_map.py --date YYYY-MM
```

`apply_monthly_update.py` 按“地区 / 客户”合并项目，写出 `progress_source.json` 中的来源文件名。`update_map.py` 转换地理表并调用 `rewrite_html_3maps.py`。地图模板从旧 HTML 提取嵌入式地理数据，重建前保留旧 HTML。

用户已取消环境表集成。流程不依赖 `delivery_details.json`、`build_delivery_details.py` 或 `render_delivery_panel.py`。顶部详情链接固定为 `https://365.kdocs.cn/l/cvBe6WVLHm9Q`，除非用户提供新地址。

## 地图口径

| 地图状态 | 原表依据 |
|---|---|
| 运行中 | 阶段 `4.汇报与验收`，状态 `实施完成` |
| 试运行 | 阶段 `4.汇报与验收`，其他状态 |
| 部署中 | 阶段 `3.实施与验证`，任意状态 |
| 未覆盖 | 其余记录 |

沿用已有覆盖统计。蒙西及南网 5 省继续排除，地图层级不自动下穿。原表状态与地图颜色可能不同，例如暂停项目仍按阶段着色，不能据此推断现场运行情况。

更名通过 `KEY_ALIASES` 写回原调度行；新项目通过 `NEW_ROW_MAP` 登记已有地理行。先核对网调、省调、地调、adcode 和占用情况，不能臆造行政区划。

## 发布

读取发布仓库实际 remote、分支、CI 配置及工作区授权，沿用已确认目标。多个会话并行时使用独立克隆或 worktree，只暂存集管 HTML；推送前 fetch，再合并最新远端。不覆盖共用工作区、不 force push、不删除正在使用的 Git 锁。

上线后读取实际页面核对哈希、5 张地图和顶部详情链接。待发布分支应包含用户最新确认的修改，不能继续发布带环境表明细的旧提交。
