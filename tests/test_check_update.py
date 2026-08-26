import importlib.util
import json
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "check_update.py"
SPEC = importlib.util.spec_from_file_location("check_update", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(MODULE)


def completed(args, returncode=0, stdout="", stderr=""):
    return subprocess.CompletedProcess(args, returncode, stdout, stderr)


def write_manifest(root: Path, version: str) -> None:
    manifest = root / ".codex-plugin" / "plugin.json"
    manifest.parent.mkdir(parents=True, exist_ok=True)
    manifest.write_text(json.dumps({"version": version}), encoding="utf-8")


def marketplace_payload(root: Path) -> str:
    return json.dumps({"marketplaces": [{"name": MODULE.MARKETPLACE, "root": str(root)}]})


def plugin_payload(version: str) -> str:
    return json.dumps(
        {
            "installed": [
                {
                    "pluginId": MODULE.PLUGIN_ID,
                    "name": MODULE.PLUGIN,
                    "marketplaceName": MODULE.MARKETPLACE,
                    "version": version,
                }
            ]
        }
    )


class CheckUpdateTests(unittest.TestCase):
    @patch.object(MODULE.shutil, "which", return_value="/usr/bin/codex")
    def test_not_configured_does_not_upgrade(self, _which):
        calls = []

        def run(args, timeout):
            calls.append(args)
            return completed(args, stdout=json.dumps({"marketplaces": []}))

        result = MODULE.check_update(run)
        self.assertEqual(result["status"], "not_configured")
        self.assertEqual(len(calls), 1)

    @patch.object(MODULE.shutil, "which", return_value="/usr/bin/codex")
    def test_current_version_does_not_reinstall(self, _which):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_manifest(root, "0.6.2+codex.current")
            calls = []

            def run(args, timeout):
                calls.append(args)
                if args[:4] == ["codex", "plugin", "marketplace", "list"]:
                    return completed(args, stdout=marketplace_payload(root))
                if args[:3] == ["codex", "plugin", "list"]:
                    return completed(args, stdout=plugin_payload("0.6.2+codex.current"))
                if args[0] == "git":
                    return completed(args, stdout="same-head\n")
                return completed(args, stdout="{}")

            result = MODULE.check_update(run)
            self.assertEqual(result["status"], "current")
            self.assertFalse(any(args[:3] == ["codex", "plugin", "add"] for args in calls))

    @patch.object(MODULE.shutil, "which", return_value="/usr/bin/codex")
    def test_new_version_is_installed_and_verified(self, _which):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_manifest(root, "0.6.1+codex.old")
            heads = iter(("old-head\n", "new-head\n"))
            installed_versions = iter(("0.6.1+codex.old", "0.6.2+codex.new"))

            def run(args, timeout):
                if args[:4] == ["codex", "plugin", "marketplace", "list"]:
                    return completed(args, stdout=marketplace_payload(root))
                if args[:3] == ["codex", "plugin", "list"]:
                    return completed(args, stdout=plugin_payload(next(installed_versions)))
                if args[0] == "git":
                    return completed(args, stdout=next(heads))
                if args[:4] == ["codex", "plugin", "marketplace", "upgrade"]:
                    write_manifest(root, "0.6.2+codex.new")
                    return completed(args, stdout="{}")
                if args[:3] == ["codex", "plugin", "add"]:
                    return completed(args, stdout="{}")
                return completed(args, returncode=1, stderr="unexpected command")

            result = MODULE.check_update(run)
            self.assertEqual(result["status"], "updated")
            self.assertEqual(result["before"], "0.6.1+codex.old")
            self.assertEqual(result["after"], "0.6.2+codex.new")

    @patch.object(MODULE.shutil, "which", return_value="/usr/bin/codex")
    def test_changed_source_without_version_bump_is_reported(self, _which):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_manifest(root, "0.6.2+codex.same")
            heads = iter(("old-head\n", "new-head\n"))

            def run(args, timeout):
                if args[:4] == ["codex", "plugin", "marketplace", "list"]:
                    return completed(args, stdout=marketplace_payload(root))
                if args[:3] == ["codex", "plugin", "list"]:
                    return completed(args, stdout=plugin_payload("0.6.2+codex.same"))
                if args[0] == "git":
                    return completed(args, stdout=next(heads))
                return completed(args, stdout="{}")

            result = MODULE.check_update(run)
            self.assertEqual(result["status"], "check_failed")
            self.assertIn("版本未变化", result["message"])

    @patch.object(MODULE.shutil, "which", return_value="/usr/bin/codex")
    def test_install_failure_keeps_current_task_usable(self, _which):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            write_manifest(root, "0.6.1+codex.old")
            heads = iter(("old-head\n", "new-head\n"))

            def run(args, timeout):
                if args[:4] == ["codex", "plugin", "marketplace", "list"]:
                    return completed(args, stdout=marketplace_payload(root))
                if args[:3] == ["codex", "plugin", "list"]:
                    return completed(args, stdout=plugin_payload("0.6.1+codex.old"))
                if args[0] == "git":
                    return completed(args, stdout=next(heads))
                if args[:4] == ["codex", "plugin", "marketplace", "upgrade"]:
                    write_manifest(root, "0.6.2+codex.new")
                    return completed(args, stdout="{}")
                if args[:3] == ["codex", "plugin", "add"]:
                    return completed(args, returncode=1, stderr="install denied")
                return completed(args, returncode=1, stderr="unexpected command")

            result = MODULE.check_update(run)
            self.assertEqual(result["status"], "check_failed")
            self.assertIn("安装失败", result["message"])


if __name__ == "__main__":
    unittest.main()
