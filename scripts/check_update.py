#!/usr/bin/env python3
"""Refresh and reinstall the JG Product Design plugin when a newer version exists."""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path
from typing import Callable


MARKETPLACE = "jg-product-design"
PLUGIN = "jg-product-design-plugin-codex"
PLUGIN_ID = f"{PLUGIN}@{MARKETPLACE}"

RunCommand = Callable[[list[str], int], subprocess.CompletedProcess[str]]


def _run(args: list[str], timeout: int = 60) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        args,
        capture_output=True,
        text=True,
        timeout=timeout,
        check=False,
    )


def _message(text: str) -> str:
    return " ".join((text or "").strip().split())[:300]


def _marketplaces(payload: object) -> list[dict]:
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    if isinstance(payload, dict):
        for key in ("marketplaces", "items", "data"):
            value = payload.get(key)
            if isinstance(value, list):
                return [item for item in value if isinstance(item, dict)]
    return []


def _marketplace_root(item: dict) -> Path | None:
    for key in ("root", "path", "directory", "checkout_path", "local_path"):
        value = item.get(key)
        if isinstance(value, str) and value:
            return Path(value).expanduser()
    source = item.get("source")
    if isinstance(source, dict):
        for key in ("root", "path", "directory", "checkout_path", "local_path"):
            value = source.get(key)
            if isinstance(value, str) and value:
                return Path(value).expanduser()
    return None


def _git_head(root: Path | None, run: RunCommand) -> str | None:
    if root is None:
        return None
    result = run(["git", "-C", str(root), "rev-parse", "HEAD"], 10)
    if result.returncode != 0:
        return None
    head = result.stdout.strip()
    return head or None


def _manifest_version(root: Path | None) -> str | None:
    if root is None:
        return None
    manifest = root / ".codex-plugin" / "plugin.json"
    try:
        payload = json.loads(manifest.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    version = payload.get("version") if isinstance(payload, dict) else None
    return version if isinstance(version, str) and version else None


def _installed_version(payload: object) -> str | None:
    if not isinstance(payload, dict):
        return None
    candidates: list[object] = []
    for key in ("installed", "plugins", "items", "data"):
        value = payload.get(key)
        if isinstance(value, list):
            candidates.extend(value)
    for item in candidates:
        if not isinstance(item, dict):
            continue
        plugin_id = item.get("pluginId")
        name = item.get("name")
        marketplace = item.get("marketplaceName")
        if plugin_id == PLUGIN_ID or (name == PLUGIN and marketplace == MARKETPLACE):
            version = item.get("version")
            if isinstance(version, str) and version:
                return version
    return None


def _list_installed_version(run: RunCommand) -> tuple[str | None, str | None]:
    listed = run(
        [
            "codex",
            "plugin",
            "list",
            "--marketplace",
            MARKETPLACE,
            "--available",
            "--json",
        ],
        20,
    )
    if listed.returncode != 0:
        return None, _message(listed.stderr)
    try:
        payload = json.loads(listed.stdout or "{}")
    except json.JSONDecodeError as exc:
        return None, _message(str(exc))
    return _installed_version(payload), None


def check_update(run: RunCommand = _run) -> dict[str, str]:
    if shutil.which("codex") is None:
        return {
            "status": "check_failed",
            "message": "未找到 Codex 命令，已继续使用当前版本。",
        }

    try:
        listed = run(["codex", "plugin", "marketplace", "list", "--json"], 20)
        if listed.returncode != 0:
            return {
                "status": "check_failed",
                "message": f"更新检查失败，已继续使用当前版本：{_message(listed.stderr)}",
            }
        payload = json.loads(listed.stdout or "{}")
        marketplace = next(
            (item for item in _marketplaces(payload) if item.get("name") == MARKETPLACE),
            None,
        )
        if marketplace is None:
            return {
                "status": "not_configured",
                "message": "未配置 jg-product-design 插件市场，已继续使用当前版本。",
            }

        installed_before, installed_error = _list_installed_version(run)
        if installed_error:
            return {
                "status": "check_failed",
                "message": f"无法读取已安装版本，已继续使用当前版本：{installed_error}",
            }

        root = _marketplace_root(marketplace)
        before_head = _git_head(root, run)
        before_version = _manifest_version(root)
        upgraded = run(
            ["codex", "plugin", "marketplace", "upgrade", MARKETPLACE, "--json"],
            60,
        )
        if upgraded.returncode != 0:
            return {
                "status": "check_failed",
                "message": f"自动更新失败，已继续使用当前版本：{_message(upgraded.stderr)}",
            }

        after_head = _git_head(root, run)
        after_version = _manifest_version(root)
        if after_version is None:
            return {
                "status": "check_failed",
                "message": "marketplace 已刷新，但无法读取插件版本；已继续使用当前版本。",
            }

        if installed_before == after_version:
            if before_head and after_head and before_head != after_head and before_version == after_version:
                return {
                    "status": "check_failed",
                    "message": "marketplace 内容有更新但插件版本未变化，请维护者补版本号后重新发布；已继续使用当前版本。",
                }
            return {
                "status": "current",
                "message": "产品设计插件已是最新版本。",
                "version": after_version,
            }

        installed = run(["codex", "plugin", "add", PLUGIN_ID, "--json"], 60)
        if installed.returncode != 0:
            return {
                "status": "check_failed",
                "message": f"发现新版本，但安装失败；已继续使用当前版本：{_message(installed.stderr)}",
            }

        installed_after, verify_error = _list_installed_version(run)
        if verify_error or installed_after != after_version:
            reason = verify_error or f"期望 {after_version}，实际 {installed_after or '未知'}"
            return {
                "status": "check_failed",
                "message": f"新版本安装后校验失败；已继续使用当前任务中的旧版本：{reason}",
            }

        return {
            "status": "updated",
            "message": "产品设计插件已更新，请新建任务后重新发起本次工作。",
            "before": installed_before or before_version or "unknown",
            "after": after_version,
        }
    except (json.JSONDecodeError, OSError, subprocess.SubprocessError) as exc:
        return {
            "status": "check_failed",
            "message": f"更新检查异常，已继续使用当前版本：{_message(str(exc))}",
        }


def main() -> None:
    print(json.dumps(check_update(), ensure_ascii=False))


if __name__ == "__main__":
    main()
