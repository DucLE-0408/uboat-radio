from __future__ import annotations

import re
import unittest
from pathlib import Path
from urllib.parse import unquote


ROOT = Path(__file__).resolve().parents[1]
LINK_PATTERN = re.compile(r"(?<!!)\[[^\]]+\]\(([^)]+)\)")


class MarkdownLinkTests(unittest.TestCase):
    def test_relative_links_resolve_inside_repository(self) -> None:
        missing: list[str] = []
        for document in ROOT.rglob("*.md"):
            if ".venv" in document.parts:
                continue
            content = document.read_text(encoding="utf-8")
            for raw_target in LINK_PATTERN.findall(content):
                target = raw_target.strip().strip("<>").split("#", 1)[0]
                if not target or "://" in target or target.startswith("mailto:"):
                    continue
                resolved = (document.parent / unquote(target)).resolve()
                try:
                    resolved.relative_to(ROOT)
                except ValueError:
                    missing.append(f"{document.relative_to(ROOT)} -> escaped path {target}")
                    continue
                if not resolved.exists():
                    missing.append(f"{document.relative_to(ROOT)} -> missing {target}")
        self.assertEqual(missing, [], "\n".join(missing))


if __name__ == "__main__":
    unittest.main()
