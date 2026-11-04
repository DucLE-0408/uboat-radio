from __future__ import annotations

import importlib.util
import os
import unittest
from pathlib import Path

from fastapi import HTTPException


ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "examples/fastapi/main.py"
SPEC = importlib.util.spec_from_file_location("template_fastapi_example", MODULE_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class FastApiExampleTests(unittest.TestCase):
    def tearDown(self) -> None:
        os.environ.pop(MODULE.INTERNAL_TOKEN_ENV, None)

    def test_runtime_and_openapi_versions_use_root_version(self) -> None:
        expected = (ROOT / "VERSION").read_text(encoding="utf-8").strip()
        self.assertEqual(MODULE.VERSION, expected)
        self.assertEqual(MODULE.app.version, expected)
        self.assertEqual(MODULE.version(), {"version": expected})

    def test_version_access_fails_closed_without_valid_token(self) -> None:
        with self.assertRaises(HTTPException) as missing:
            MODULE.require_internal_version_access(None)
        self.assertEqual(missing.exception.status_code, 404)

        os.environ[MODULE.INTERNAL_TOKEN_ENV] = "a" * 32
        with self.assertRaises(HTTPException) as incorrect:
            MODULE.require_internal_version_access("b" * 32)
        self.assertEqual(incorrect.exception.status_code, 404)

        MODULE.require_internal_version_access("a" * 32)


if __name__ == "__main__":
    unittest.main()
