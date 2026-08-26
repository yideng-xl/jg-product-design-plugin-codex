# 产品设计插件自动更新

`requirements2prd`、`prd2prototype`、`proto-check` 共用本机制。同一个 Codex 任务只检查一次;已经由其中一个 skill 检查过,后续切换姐妹 skill 时不重复检查。

## 开始前动作

进入业务讨论、读取 PRD / 原型或修改用户文件前:

1. 先用一句 commentary 告诉用户“正在检查产品设计插件更新”。
2. 根据当前 `SKILL.md` 位置解析插件根目录,运行:

   ```bash
   python3 "<本插件根目录>/scripts/check_update.py"
   ```

3. 若运行环境要求网络或软件更新权限,按系统流程申请;不得绕过。用户明确要求离线或跳过更新时,尊重本次指示并继续使用当前版本。

## 返回值处理

脚本只输出一段 JSON:

- `current`:已是最新版本,继续当前任务,无需重复说明。
- `updated`:插件已完成 marketplace 刷新、安装和版本校验。立即停止当前业务处理,告诉用户“产品设计插件已更新,请新建任务后重新发起本次工作”。当前任务已经载入旧版 skill,不得继续套用新版规则。
- `check_failed`:简短告知失败原因,继续使用当前版本,不阻塞业务。
- `not_configured`:告知尚未配置 `jg-product-design` marketplace,继续使用当前版本。

自动更新只操作 Codex 管理的 marketplace 和插件安装目录。它不会修改 GitHub 源仓库、PRD、原型、自查报告或其他用户文件,也不会提交或推送代码。
