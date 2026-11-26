"""Keep the published reviewer discoverable and its gate inventory in sync."""
import ast
import json
from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]
REVIEW = ROOT / "skills/review-technical-bid"


class BidReviewContract(unittest.TestCase):
    def test_plugin_discovers_enabled_reviewer_and_local_references_resolve(self):
        manifest = json.loads((ROOT / ".codex-plugin/plugin.json").read_text())
        config = json.loads((ROOT / "skill-load.config.json").read_text())
        self.assertTrue(config["skills"][REVIEW.name])
        self.assertEqual((ROOT / manifest["skills"]).resolve(), REVIEW.parent)
        self.assertTrue((REVIEW / "agents/openai.yaml").is_file())
        for source in REVIEW.rglob("*.md"):
            for target in re.findall(r"\]\(([^)]+)\)", source.read_text()):
                self.assertTrue((source.parent / target.split("#")[0]).exists(), target)

    def test_documented_hard_gate_codes_cover_actual_script_error_codes(self):
        documented = set(re.findall(r"`([a-z_]+)`", (
            REVIEW / "references/judge-checklists.md").read_text()))
        codes = set()
        for script in (ROOT / "skills/write-technical-bid/scripts").glob("*.py"):
            for node in ast.walk(ast.parse(script.read_text())):
                if isinstance(node, ast.Dict):
                    for key, value in zip(node.keys, node.values):
                        if (isinstance(key, ast.Constant) and key.value == "code"
                                and isinstance(value, ast.Constant)
                                and isinstance(value.value, str)):
                            codes.add(value.value)
        self.assertTrue(codes)
        self.assertEqual(codes - documented, set(), "Reviewer gate inventory is stale")

    def test_reviewer_package_has_no_local_paths_or_business_artifacts(self):
        for artifact in REVIEW.rglob("*"):
            if not artifact.is_file():
                continue
            self.assertIn(artifact.suffix, {".md", ".yaml"})
            self.assertIsNone(re.search(
                r"(?:/Users/|/home/|[A-Za-z]:\\|file://)",
                artifact.read_text()), artifact)


if __name__ == "__main__":
    unittest.main()
