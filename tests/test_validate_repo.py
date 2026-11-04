from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "scripts/validate_repo.py"
SPEC = importlib.util.spec_from_file_location("validate_repo", MODULE_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class RepositoryValidatorTests(unittest.TestCase):
    def test_frontmatter_parser_supports_scalar_null_and_list(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "record.md"
            path.write_text(
                "---\nschema_version: 1\nstatus: in-progress\nowned_paths:\n  - src\nplan: null\n---\n# Body\n",
                encoding="utf-8",
            )
            parsed = MODULE.parse_frontmatter(path)
        self.assertEqual(parsed["schema_version"], 1)
        self.assertEqual(parsed["owned_paths"], ["src"])
        self.assertIsNone(parsed["plan"])

    def test_claim_overlap_is_prefix_aware(self) -> None:
        self.assertTrue(MODULE.claims_overlap("src", "src/api"))
        self.assertTrue(MODULE.claims_overlap("docs/api", "docs/api"))
        self.assertFalse(MODULE.claims_overlap("src/api", "src/ui"))
        self.assertFalse(MODULE.claims_overlap("unassigned", "src"))


if __name__ == "__main__":
    unittest.main()
