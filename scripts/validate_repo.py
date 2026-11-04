from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]


def parse_scalar(raw: str) -> Any:
    value = raw.strip()
    if value in {"null", "~"}:
        return None
    if value == "true":
        return True
    if value == "false":
        return False
    if re.fullmatch(r"0|[1-9]\d*", value):
        return int(value)
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
        return value[1:-1]
    return value


def parse_frontmatter(path: Path) -> dict[str, Any]:
    lines = path.read_text(encoding="utf-8").splitlines()
    if not lines or lines[0].strip() != "---":
        raise ValueError("missing opening YAML frontmatter delimiter")
    try:
        end = next(index for index, line in enumerate(lines[1:], start=1) if line.strip() == "---")
    except StopIteration as exc:
        raise ValueError("missing closing YAML frontmatter delimiter") from exc

    result: dict[str, Any] = {}
    current_list: str | None = None
    for line in lines[1:end]:
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        list_match = re.fullmatch(r"\s{2}-\s+(.+)", line)
        if list_match and current_list:
            result[current_list].append(parse_scalar(list_match.group(1)))
            continue
        key_match = re.fullmatch(r"([a-z_]+):(?:\s*(.*))?", line)
        if not key_match:
            raise ValueError(f"unsupported frontmatter syntax: {line!r}")
        key, raw_value = key_match.groups()
        if raw_value is None or raw_value == "":
            result[key] = []
            current_list = key
        else:
            result[key] = parse_scalar(raw_value)
            current_list = None
    return result


def type_matches(value: Any, expected: str) -> bool:
    checks = {
        "array": lambda item: isinstance(item, list),
        "integer": lambda item: isinstance(item, int) and not isinstance(item, bool),
        "null": lambda item: item is None,
        "string": lambda item: isinstance(item, str),
        "boolean": lambda item: isinstance(item, bool),
    }
    return expected in checks and checks[expected](value)


def validate_schema(metadata: dict[str, Any], schema: dict[str, Any], path: Path) -> list[str]:
    errors: list[str] = []
    for key in schema.get("required", []):
        if key not in metadata:
            errors.append(f"{path}: missing required key {key!r}")
    for key, value in metadata.items():
        rule = schema.get("properties", {}).get(key)
        if not rule:
            continue
        expected_types = rule.get("type", [])
        if isinstance(expected_types, str):
            expected_types = [expected_types]
        if expected_types and not any(type_matches(value, kind) for kind in expected_types):
            errors.append(f"{path}: {key!r} has invalid type")
            continue
        if "enum" in rule and value not in rule["enum"]:
            errors.append(f"{path}: {key!r} must be one of {rule['enum']}")
        if isinstance(value, str):
            if len(value) < rule.get("minLength", 0):
                errors.append(f"{path}: {key!r} is empty")
            if "pattern" in rule and not re.fullmatch(rule["pattern"], value):
                errors.append(f"{path}: {key!r} does not match {rule['pattern']}")
        if isinstance(value, list):
            if len(value) < rule.get("minItems", 0):
                errors.append(f"{path}: {key!r} has too few items")
            item_type = rule.get("items", {}).get("type")
            if item_type and any(not type_matches(item, item_type) for item in value):
                errors.append(f"{path}: {key!r} contains an invalid item")
    return errors


def record_files(directory: Path, template_name: str | None = None) -> list[Path]:
    files = []
    for path in sorted(directory.glob("*.md")):
        if path.name == "README.md" or (template_name and path.name == template_name):
            continue
        files.append(path)
    return files


def normalize_claim(value: str) -> str:
    normalized = value.replace("\\", "/").strip().strip("/")
    return normalized.casefold()


def claims_overlap(left: str, right: str) -> bool:
    if "unassigned" in {left, right}:
        return False
    return left == right or left.startswith(right + "/") or right.startswith(left + "/")


def require_path(relative: str, errors: list[str]) -> None:
    if not (ROOT / relative).exists():
        errors.append(f"missing required skeleton path: {relative}")


def main() -> int:
    errors: list[str] = []
    schemas = {
        "task": json.loads((ROOT / "memory/schemas/task.schema.json").read_text(encoding="utf-8")),
        "plan": json.loads((ROOT / "memory/schemas/plan.schema.json").read_text(encoding="utf-8")),
        "handoff": json.loads((ROOT / "memory/schemas/handoff.schema.json").read_text(encoding="utf-8")),
    }
    groups = {
        "active": record_files(ROOT / "memory/tasks/active"),
        "completed": record_files(ROOT / "memory/tasks/completed"),
        "plan": record_files(ROOT / "memory/plans", "plan-template.md"),
        "handoff": record_files(ROOT / "memory/session-handoffs", "handoff-template.md"),
    }
    parsed: dict[Path, dict[str, Any]] = {}
    for group, paths in groups.items():
        schema_name = "task" if group in {"active", "completed"} else group
        for path in paths:
            try:
                metadata = parse_frontmatter(path)
                parsed[path] = metadata
                errors.extend(validate_schema(metadata, schemas[schema_name], path.relative_to(ROOT)))
                if group == "active" and metadata.get("status") not in {"planned", "in-progress", "blocked"}:
                    errors.append(f"{path.relative_to(ROOT)}: active task has closed status")
                if group == "completed" and metadata.get("status") != "completed":
                    errors.append(f"{path.relative_to(ROOT)}: completed task must have status completed")
                if "{{" in path.read_text(encoding="utf-8"):
                    errors.append(f"{path.relative_to(ROOT)}: unresolved template token")
            except (OSError, ValueError) as exc:
                errors.append(f"{path.relative_to(ROOT)}: {exc}")

    active_claims: list[tuple[Path, str]] = []
    for path in groups["active"]:
        for claim in parsed.get(path, {}).get("owned_paths", []):
            active_claims.append((path, normalize_claim(claim)))
    for index, (left_path, left_claim) in enumerate(active_claims):
        for right_path, right_claim in active_claims[index + 1 :]:
            if left_path != right_path and claims_overlap(left_claim, right_claim):
                errors.append(
                    f"overlapping active claims: {left_path.relative_to(ROOT)}:{left_claim} and "
                    f"{right_path.relative_to(ROOT)}:{right_claim}"
                )

    for path, metadata in parsed.items():
        for key in ("plan", "handoff", "task"):
            target = metadata.get(key)
            if isinstance(target, str) and target and target != "unassigned" and not (ROOT / target).exists():
                errors.append(f"{path.relative_to(ROOT)}: linked {key} does not exist: {target}")

    required_paths = [
        ".editorconfig",
        ".gitattributes",
        ".dockerignore",
        "CONTRIBUTING.md",
        "SECURITY.md",
        ".github/CODEOWNERS",
        ".github/dependabot.yml",
        "docs/adr",
        "docs/api",
        "docs/data",
        "docs/observability",
        "docs/configuration.md",
        "docs/security/threat-model-template.md",
        "docs/runbooks/postmortem-template.md",
        "scripts/check-repo.ps1",
        "tests",
    ]
    for relative in required_paths:
        require_path(relative, errors)

    action_pattern = re.compile(r"^\s*uses:\s*[^\s@]+@([0-9a-f]{40})(?:\s+#.*)?$")
    for workflow in (ROOT / ".github/workflows").glob("*.yml"):
        for number, line in enumerate(workflow.read_text(encoding="utf-8").splitlines(), start=1):
            if "uses:" in line and not action_pattern.match(line):
                errors.append(f"{workflow.relative_to(ROOT)}:{number}: action must be pinned to a 40-char SHA")

    if errors:
        print("Repository governance validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    print(
        f"Repository governance validation passed: {len(groups['active'])} active task(s), "
        f"{len(groups['completed'])} completed task(s), {len(groups['plan'])} plan(s), "
        f"{len(groups['handoff'])} handoff(s)."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
