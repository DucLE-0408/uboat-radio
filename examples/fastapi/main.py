from __future__ import annotations

import os
import secrets
from pathlib import Path

from fastapi import Depends, FastAPI, Header, HTTPException, status


MODULE_PATH = Path(__file__).resolve()
REPOSITORY_ROOT = next(
    (parent for parent in MODULE_PATH.parents if (parent / "VERSION").is_file()),
    MODULE_PATH.parent,
)
VERSION_FILE = Path(os.getenv("VERSION_FILE", str(REPOSITORY_ROOT / "VERSION")))
VERSION = VERSION_FILE.read_text(encoding="utf-8").strip()
INTERNAL_TOKEN_ENV = "INTERNAL_VERSION_TOKEN"

app = FastAPI(title="Replace with service name", version=VERSION)


def require_internal_version_access(
    presented_token: str | None = Header(default=None, alias="X-Internal-Version-Token"),
) -> None:
    expected_token = os.getenv(INTERNAL_TOKEN_ENV)
    if not expected_token or len(expected_token) < 32:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    if not presented_token or not secrets.compare_digest(presented_token, expected_token):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)


@app.get("/health", include_in_schema=False)
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/version", dependencies=[Depends(require_internal_version_access)], include_in_schema=False)
def version() -> dict[str, str]:
    return {"version": VERSION}
