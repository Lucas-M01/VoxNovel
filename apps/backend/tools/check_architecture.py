"""Check explicit source-level boundaries; not a Python security sandbox."""

import ast
import re
from pathlib import Path

NETWORK_MODULES = {
    "requests",
    "httpx",
    "httpx2",
    "aiohttp",
    "cloudscraper",
    "curl_cffi",
    "supabase",
    "socket",
}
SQL = re.compile(
    r"^\s*(SELECT|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|CREATE\s+TABLE|ALTER\s+TABLE)\b",
    re.I,
)


def find_violations(source: str, path: str) -> list[str]:
    tree = ast.parse(source, filename=path)
    parts = Path(path).parts
    config = path.endswith("core/config.py")
    network = "adapters" in parts or "engines" in parts
    repository = "repositories" in parts
    violations: list[str] = []
    aliases: dict[str, str] = {}

    for node in ast.walk(tree):
        modules: list[tuple[str, int]] = []
        if isinstance(node, ast.Import):
            for alias in node.names:
                aliases[alias.asname or alias.name.split(".")[0]] = alias.name
                modules.append((alias.name, node.lineno))
        elif isinstance(node, ast.ImportFrom):
            module = node.module or ""
            modules.append((module, node.lineno))
            for alias in node.names:
                aliases[alias.asname or alias.name] = f"{module}.{alias.name}"
        for module, line in modules:
            if not network and (
                module.split(".")[0] in NETWORK_MODULES
                or module.startswith("urllib.request")
            ):
                violations.append(
                    f"{path}:{line}: network import outside adapters/engines"
                )
            if not config and module in {"dotenv", "pydantic_settings"}:
                violations.append(f"{path}:{line}: settings outside core/config.py")

    def qualified(node: ast.expr) -> str:
        if isinstance(node, ast.Name):
            return aliases.get(node.id, node.id)
        if isinstance(node, ast.Attribute):
            return f"{qualified(node.value)}.{node.attr}"
        return ""

    for node in ast.walk(tree):
        if isinstance(node, ast.expr) and not config:
            name = qualified(node)
            if name in {"os.environ", "os.getenv", "os.putenv"}:
                violations.append(
                    f"{path}:{node.lineno}: environment access outside config"
                )
        if isinstance(node, ast.Call):
            name = qualified(node.func)
            if not network and name in {
                "fetch",
                "urllib.request.urlopen",
                "urllib.request.urlretrieve",
            }:
                violations.append(
                    f"{path}:{node.lineno}: network call outside adapters/engines"
                )
            if (
                not repository
                and isinstance(node.func, ast.Attribute)
                and node.func.attr in {"execute", "executemany", "executescript"}
            ):
                violations.append(
                    f"{path}:{node.lineno}: query execution outside repositories"
                )
        if isinstance(node, ast.Constant) and isinstance(node.value, str):
            if not repository and SQL.match(node.value):
                violations.append(f"{path}:{node.lineno}: SQL outside repositories")
            if not config and node.value.startswith(("http://", "https://")):
                violations.append(f"{path}:{node.lineno}: hardcoded URL outside config")
        if (
            isinstance(node, ast.ClassDef)
            and any(
                keyword.arg == "table"
                and isinstance(keyword.value, ast.Constant)
                and keyword.value.value is True
                for keyword in node.keywords
            )
            and not any(
                isinstance(child, ast.AnnAssign)
                and isinstance(child.target, ast.Name)
                and child.target.id == "updated_at"
                for child in node.body
            )
        ):
            violations.append(
                f"{path}:{node.lineno}: persistent model needs updated_at"
            )
    return sorted(set(violations))


def main() -> int:
    violations = [
        violation
        for path in sorted(Path("src").rglob("*.py"))
        for violation in find_violations(path.read_text(), path.as_posix())
    ]
    for violation in violations:
        print(violation)
    return int(bool(violations))


if __name__ == "__main__":
    raise SystemExit(main())
