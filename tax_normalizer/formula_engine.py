"""Safe formula evaluation and topological sorting for calculated fields."""

from __future__ import annotations

import ast
import re
from typing import Any

from .exceptions import CyclicDependencyError, FormulaSecurityError

# ---------------------------------------------------------------------------
# Whitelisted names available inside formulas
# ---------------------------------------------------------------------------
_ALLOWED_NAMES: dict[str, Any] = {
    "max": max,
    "min": min,
    "abs": abs,
    "round": round,
    "True": True,
    "False": False,
}

# Patterns that must never appear in a formula string (belt-and-suspenders)
_FORBIDDEN_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"__\w+__"),          # dunder attrs  (__import__, __class__, …)
    re.compile(r"\bimport\b"),       # import keyword
    re.compile(r"\bopen\s*\("),      # open()
    re.compile(r"\beval\s*\("),      # nested eval
    re.compile(r"\bexec\s*\("),      # exec
    re.compile(r"\bcompile\s*\("),   # compile
    re.compile(r"\bgetattr\s*\("),   # getattr
    re.compile(r"\bsetattr\s*\("),   # setattr
    re.compile(r"\bglobals\s*\("),   # globals
    re.compile(r"\blocals\s*\("),    # locals
    re.compile(r"\bos\b"),           # os module
    re.compile(r"\bsys\b"),          # sys module
    re.compile(r"\bsubprocess\b"),   # subprocess module
]


def _check_formula_security(formula: str) -> None:
    """Raise FormulaSecurityError if the formula contains forbidden constructs."""
    for pat in _FORBIDDEN_PATTERNS:
        if pat.search(formula):
            raise FormulaSecurityError(formula, f"Forbidden pattern: {pat.pattern}")

    # AST-level validation — only allow safe node types
    try:
        tree = ast.parse(formula, mode="eval")
    except SyntaxError as exc:
        raise FormulaSecurityError(formula, f"Syntax error: {exc}") from exc

    _walk_ast(tree, formula)


_SAFE_AST_NODES = (
    ast.Expression,
    ast.BinOp,
    ast.UnaryOp,
    ast.BoolOp,
    ast.Compare,
    ast.Constant,
    ast.Name,
    ast.Load,
    ast.Call,
    ast.Add,
    ast.Sub,
    ast.Mult,
    ast.Div,
    ast.FloorDiv,
    ast.Mod,
    ast.Pow,
    ast.USub,
    ast.UAdd,
    ast.Gt,
    ast.GtE,
    ast.Lt,
    ast.LtE,
    ast.Eq,
    ast.NotEq,
    ast.And,
    ast.Or,
    ast.Not,
    ast.IfExp,
)


def _walk_ast(node: ast.AST, formula: str) -> None:
    """Recursively validate that every AST node is in the safe whitelist."""
    if not isinstance(node, _SAFE_AST_NODES):
        raise FormulaSecurityError(
            formula, f"Disallowed AST node: {type(node).__name__}"
        )
    # For Call nodes, only allow whitelisted function names
    if isinstance(node, ast.Call):
        if isinstance(node.func, ast.Name):
            if node.func.id not in _ALLOWED_NAMES:
                raise FormulaSecurityError(
                    formula, f"Function '{node.func.id}' is not whitelisted"
                )
        else:
            raise FormulaSecurityError(
                formula, "Only simple function calls are allowed (no method calls)"
            )
    for child in ast.iter_child_nodes(node):
        _walk_ast(child, formula)


def safe_eval(formula: str, context: dict[str, Any]) -> float:
    """Evaluate a formula string safely against a context dict of resolved values.

    Only whitelisted builtins (max, min, abs, round) and arithmetic ops are allowed.
    Returns a float rounded to 2 decimal places.
    """
    _check_formula_security(formula)

    namespace = {**_ALLOWED_NAMES, **context}
    # Prevent access to builtins
    namespace["__builtins__"] = {}

    result = eval(compile(ast.parse(formula, mode="eval"), "<formula>", "eval"), namespace)
    return round(float(result), 2)


# ---------------------------------------------------------------------------
# Dependency extraction + topological sort
# ---------------------------------------------------------------------------

_FIELD_REF_RE = re.compile(r"\b([a-zA-Z_]\w*)\b")


def extract_dependencies(formula: str) -> set[str]:
    """Extract field references from a formula, excluding whitelisted names."""
    names = set(_FIELD_REF_RE.findall(formula))
    return names - set(_ALLOWED_NAMES.keys())


def topological_sort(
    fields: dict[str, set[str]],
) -> list[str]:
    """Kahn's algorithm. Returns field_ids in dependency order.

    *fields* maps field_id → set of field_ids it depends on.
    Raises CyclicDependencyError if a cycle is found.
    """
    # Build adjacency and in-degree
    in_degree: dict[str, int] = {f: 0 for f in fields}
    dependents: dict[str, list[str]] = {f: [] for f in fields}

    for fid, deps in fields.items():
        for dep in deps:
            if dep in fields:
                dependents[dep].append(fid)
                in_degree[fid] += 1

    queue = [f for f, d in in_degree.items() if d == 0]
    order: list[str] = []

    while queue:
        node = queue.pop(0)
        order.append(node)
        for dependent in dependents[node]:
            in_degree[dependent] -= 1
            if in_degree[dependent] == 0:
                queue.append(dependent)

    if len(order) != len(fields):
        # Identify cycle members
        remaining = [f for f in fields if f not in order]
        raise CyclicDependencyError(remaining)

    return order
