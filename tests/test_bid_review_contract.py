"""Keep the published reviewer discoverable and its gate inventory in sync."""
import ast
import json
from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]
REVIEW = ROOT / "skills/review-technical-bid"


class BidReviewContract(unittest.TestCase):
    def test_audit_instructions_do_not_bind_roles_to_named_models(self):
        # Provider names belong in runtime evidence, not reusable role contracts.
        model_names = re.compile(
            r"(?<![A-Za-z0-9_])(?:grok|gemini|chatgpt|claude|deepseek|qwen|llama|"
            r"mistral|openai|anthropic|google|xai|gpt)(?:[- .]?\d[\w.-]*)?"
            r"(?![A-Za-z0-9_])",
            re.IGNORECASE,
        )
        for known_binding in ("Grok 红队裁判", "Gemini独立验收", "GPT-6 审核", "Qwen3.5裁判"):
            self.assertIsNotNone(model_names.search(known_binding))
        sources = {path: path.read_text() for path in REVIEW.rglob("*")
                   if path.is_file() and path.suffix in {".md", ".yaml"}}
        writer = ROOT / "skills/write-technical-bid/SKILL.md"
        sources[writer] = writer.read_text()
        readme = ROOT / "README.md"
        sources[readme] = readme.read_text().split("### 五、技术投标阶段", 1)[1].split(
            "默认加载的 skill：", 1)[0]
        for source, content in sources.items():
            self.assertIsNone(model_names.search(content), source)

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
