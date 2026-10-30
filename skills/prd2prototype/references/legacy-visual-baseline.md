# 历史视觉基线

仅供尚未现网校准的产品 B 或明确保留旧样式的原型使用。来源为本次产品分包前的 skill；不代表已与运行系统一致。产品 A 优先使用 products/jg。

### 配色(通用设计系统 · 取自 Figma,已固化在 assets/common.css)

| 语义 | 色值 | CSS 变量 |
|---|---|---|
| 主色 / 品牌(主色绿) | #007D7B | `--color-primary` |
| 主色 hover / pressed / disabled | #4CA4A3 / #198A88 / #80BEBD | `--color-primary-hover` 等 |
| 输入聚焦边框 | #0FA081 | `--color-input-focus` |
| 链接(链接蓝) | #418CFD | `--color-link` |
| 信息 | #1890FF | `--color-info` |
| 成功 / 完成 | #52C41A | `--color-success` |
| 警告 / 回退 | #FAAD14 | `--color-warning` |
| 危险 / 失败 | #FF4D4F | `--color-danger` |
| 标题 / 正文 / 次要 / 禁用文字 | #333333 / #565656 / #999999 / #BDBDBD | `--text-title` 等 |
| 页面背景 / 卡片 / 表头 / 选中行 | #EFF3F8 / #FFFFFF / #F8F8F9 / #E6F2F2 | `--bg-page` 等 |
| 边框 / 分割线 | #DCDFE6 | `--border-color` |

> 功能色均带 8% 浅底 + 20% 描边的 Tag 变体;Tag 另有紫 #A063EE / 黄 #FCD853 / 粉 #FF66C1。**取色一律用变量,不要写死。**

### 字号

| 用途 | 字号 |
|---|---|
| 表格内文字 | 13px |
| 表头 / section 标题 | 14px |
| 一级标题 | 18-20px |
| 次要说明 | 12px |
| 标签 / 徽章 | 11-12px |
| 代码块 | 12px(等宽字体) |

### 状态色与图标

| 状态 | 图标 | 类名 |
|---|---|---|
| 待处理 | 🔴 | status-pending |
| 待验证 | 🟡 | status-waiting |
| 已验证 | 🟢 | status-verified |
| 已忽略 | ⚫ | status-ignored |
| 失败 | ✗ | status-failed |
| 临时标签:回退 | - | tag tag-warn(橙底) |
| 临时标签:处理失败 | - | tag tag-danger(红底) |

### 暗色代码 / 配置块

```css
.snippet { background: #2d2d2d; color: #d4d4d4; font-family: 'Consolas', monospace;
           font-size: 12px; line-height: 1.6; padding: 8px 10px; border-radius: 3px;
           white-space: pre-wrap; }
.snippet .bad { background: #5c2d2d; color: #fff; padding: 1px 4px; border-radius: 2px; }
.snippet .good { background: #2d5c33; color: #fff; padding: 1px 4px; border-radius: 2px; }
```

复制图标固定在右上角:

```css
.snippet-wrap2 { position: relative; }
.snippet-wrap2 .copy-icon { position: absolute; top: 6px; right: 8px;
                            background: rgba(255,255,255,0.1); color: #d4d4d4;
                            padding: 2px 6px; border-radius: 3px; cursor: pointer;
                            font-size: 11px; }
```

### 对象 chip(可勾选 + 可跳详情)

```html
<span class="dev-tag">
  <input type="checkbox" checked>
  <a href="...详情.html">对象名 / 标识</a>
</span>
```

### 命中事件列表

```html
<div class="hit-tasks">
  <div class="hit-head">在 <strong>8</strong> 次事件中命中:</div>
  <a class="hit-item"><span class="hit-dot"></span>事件 X - YYYY-MM-DD HH:MM</a>
  <a class="hit-item"><span class="hit-dot ok"></span>验证事件 - YYYY-MM-DD HH:MM ✓</a>
</div>
```
