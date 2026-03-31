"""Five-pass field normalizer: QBO → Calculated → Conditional → Validation → Completeness."""

from __future__ import annotations

import ast
import re
from typing import Any

from .exceptions import (
    ConditionParseError,
    CyclicDependencyError,
    MissingDependencyError,
    ValidationDependencyError,
)
from .formula_engine import extract_dependencies, safe_eval, topological_sort
from .models import (
    FieldDescriptor,
    FieldError,
    NormalizationResult,
    Severity,
    SourceType,
    validate_data_type,
)


class FieldNormalizer:
    """Orchestrates the five-pass normalization pipeline."""

    def __init__(
        self,
        descriptors: list[FieldDescriptor],
        qbo_data: dict[str, Any],
        entity_context: dict[str, Any] | None = None,
    ):
        self.descriptors = {fd.field_id: fd for fd in descriptors}
        self.qbo_data = qbo_data
        self.entity_context = entity_context or {}
        self.result = NormalizationResult()

    def normalize(self) -> NormalizationResult:
        """Run all five passes and return the result."""
        self._pass1_resolve_qbo_fields()
        self._pass2_resolve_calculated_fields()
        self._pass3_resolve_conditional_fields()
        self._pass4_run_cross_field_validations()
        self._pass5_check_mandatory_completeness()
        return self.result

    # ------------------------------------------------------------------
    # Pass 1: Resolve QBO fields
    # ------------------------------------------------------------------

    def _pass1_resolve_qbo_fields(self) -> None:
        for fd in self._by_source(SourceType.QBO):
            accounts = fd.qbo_accounts
            missing_accounts = [a for a in accounts if a not in self.qbo_data]
            present_accounts = [a for a in accounts if a in self.qbo_data]

            if missing_accounts:
                if len(missing_accounts) == len(accounts):
                    # ALL accounts missing
                    if fd.mandatory is True:
                        self._error(
                            fd,
                            "missing_qbo_accounts",
                            f"All QBO accounts missing: {', '.join(missing_accounts)}",
                        )
                        continue
                    else:
                        if not fd.warn_if_missing:
                            # Silently skip
                            continue
                        if fd.default_value is not None:
                            self._warn(
                                fd,
                                "qbo_default_used",
                                f"All QBO accounts missing, using default {fd.default_value}",
                            )
                            self._resolve(fd, fd.default_value)
                        else:
                            self._warn(
                                fd,
                                "qbo_default_zero",
                                "All QBO accounts missing, using 0.0",
                            )
                            self._resolve(fd, 0.0)
                        continue
                else:
                    # SOME accounts missing
                    if fd.mandatory is True:
                        self._error(
                            fd,
                            "missing_qbo_accounts",
                            f"QBO accounts missing: {', '.join(missing_accounts)}",
                        )
                        continue
                    else:
                        if fd.default_value is not None:
                            self._warn(
                                fd,
                                "qbo_default_used",
                                f"QBO accounts missing: {', '.join(missing_accounts)}, "
                                f"using default {fd.default_value}",
                            )
                            self._resolve(fd, fd.default_value)
                        else:
                            self._warn(
                                fd,
                                "qbo_partial_missing",
                                f"QBO accounts missing: {', '.join(missing_accounts)}, "
                                "using 0.0 for missing",
                            )
                            total = sum(
                                float(self.qbo_data[a]) for a in present_accounts
                            )
                            self._resolve(fd, total)
                        continue

            # All accounts present
            total = sum(float(self.qbo_data[a]) for a in accounts)
            self._resolve(fd, total)

    # ------------------------------------------------------------------
    # Pass 2: Resolve calculated fields (topological order)
    # ------------------------------------------------------------------

    def _pass2_resolve_calculated_fields(self) -> None:
        calc_fields = {
            fd.field_id: fd for fd in self._by_source(SourceType.CALCULATED)
        }
        if not calc_fields:
            return

        # Security-check all formulas upfront before dependency resolution
        from .formula_engine import _check_formula_security
        for fid, fd in calc_fields.items():
            if fd.formula is not None:
                _check_formula_security(fd.formula)

        # Build dependency graph
        dep_graph: dict[str, set[str]] = {}
        for fid, fd in calc_fields.items():
            if fd.formula is None:
                continue
            dep_graph[fid] = extract_dependencies(fd.formula)

        # Topological sort (may raise CyclicDependencyError)
        order = topological_sort(dep_graph)

        # Track fields that failed so downstream dependents can be skipped
        failed: set[str] = set()

        for fid in order:
            fd = calc_fields[fid]
            if fd.formula is None:
                continue

            deps = dep_graph[fid]
            context: dict[str, float] = {}
            missing_dep = None
            for dep in deps:
                if dep in self.result.resolved:
                    context[dep] = float(self.result.resolved[dep])
                elif dep in failed or dep in self.descriptors:
                    # Dependency exists as a known field but wasn't resolved
                    # (errored in a prior pass or earlier in this pass)
                    missing_dep = dep
                    break
                else:
                    # Completely unknown dependency
                    raise MissingDependencyError(fid, dep)

            if missing_dep is not None:
                failed.add(fid)
                self._error(
                    fd,
                    "missing_dependency",
                    f"Cannot compute: dependency '{missing_dep}' was not resolved",
                )
                continue

            value = safe_eval(fd.formula, context)
            self._resolve(fd, value)

    # ------------------------------------------------------------------
    # Pass 3: Resolve conditional fields
    # ------------------------------------------------------------------

    def _pass3_resolve_conditional_fields(self) -> None:
        for fd in self._by_source(SourceType.CONDITIONAL):
            condition = fd.condition
            if condition is None:
                continue

            # Build evaluation context from resolved values + entity_context
            eval_ctx: dict[str, Any] = {**self.result.resolved, **self.entity_context}

            cond_result = self._eval_condition(fd, condition, eval_ctx)

            if not cond_result:
                # Condition is false — skip the field
                self.result.resolved[fd.field_id] = None
                continue

            # Condition is true — field is required
            # Try to resolve from QBO data
            if fd.qbo_accounts:
                accounts = fd.qbo_accounts
                missing = [a for a in accounts if a not in self.qbo_data]
                if missing:
                    if fd.default_value is not None:
                        self._resolve(fd, fd.default_value)
                    else:
                        self._error(
                            fd,
                            "conditional_missing",
                            f"Condition '{condition}' is true but field data is missing",
                        )
                else:
                    total = sum(float(self.qbo_data[a]) for a in accounts)
                    self._resolve(fd, total)
            elif fd.field_id in self.result.resolved:
                pass  # Already resolved
            elif fd.default_value is not None:
                self._resolve(fd, fd.default_value)
            else:
                self._error(
                    fd,
                    "conditional_missing",
                    f"Condition '{condition}' is true but field data is missing",
                )

    def _eval_condition(
        self, fd: FieldDescriptor, condition: str, context: dict[str, Any]
    ) -> bool:
        """Safely evaluate a condition string. Raises ConditionParseError on failure."""
        try:
            tree = ast.parse(condition, mode="eval")
        except SyntaxError as exc:
            raise ConditionParseError(fd.field_id, condition, str(exc))

        # Validate AST — only comparisons, boolops, names, constants
        _COND_SAFE_NODES = (
            ast.Expression, ast.Compare, ast.BoolOp, ast.UnaryOp,
            ast.BinOp, ast.Constant, ast.Name, ast.Load,
            ast.Eq, ast.NotEq, ast.Gt, ast.GtE, ast.Lt, ast.LtE,
            ast.And, ast.Or, ast.Not, ast.Is, ast.IsNot, ast.In, ast.NotIn,
            ast.Add, ast.Sub, ast.Mult, ast.Div,
        )
        for node in ast.walk(tree):
            if not isinstance(node, _COND_SAFE_NODES):
                raise ConditionParseError(
                    fd.field_id, condition, f"Disallowed node: {type(node).__name__}"
                )

        safe_ctx = {**context, "__builtins__": {}, "True": True, "False": False, "None": None}
        try:
            return bool(eval(compile(tree, "<condition>", "eval"), safe_ctx))
        except Exception as exc:
            raise ConditionParseError(fd.field_id, condition, str(exc))

    # ------------------------------------------------------------------
    # Pass 4: Cross-field validations
    # ------------------------------------------------------------------

    def _pass4_run_cross_field_validations(self) -> None:
        for fd in self.descriptors.values():
            for rule in fd.cross_validations:
                # Extract field references from the rule
                refs = re.findall(r"\b([a-zA-Z_]\w*)\b", rule)
                field_refs = [
                    r for r in refs
                    if r not in ("True", "False", "None", "and", "or", "not")
                ]

                # Check if any referenced field is optional and None → skip
                skip = False
                for ref in field_refs:
                    if ref in self.result.resolved and self.result.resolved[ref] is None:
                        skip = True
                        break
                if skip:
                    continue

                # Check all references are resolved
                context: dict[str, Any] = {}
                has_unresolved = False
                for ref in field_refs:
                    if ref in self.result.resolved:
                        context[ref] = self.result.resolved[ref]
                    elif ref in self.descriptors:
                        # Known field that wasn't resolved (errored earlier) — skip rule
                        has_unresolved = True
                        break
                    else:
                        raise ValidationDependencyError(rule, ref)
                if has_unresolved:
                    continue

                safe_ctx = {**context, "__builtins__": {}, "max": max, "min": min, "abs": abs}
                try:
                    tree = ast.parse(rule, mode="eval")
                    passed = bool(eval(compile(tree, "<rule>", "eval"), safe_ctx))
                except Exception:
                    self._error(fd, "validation_error", f"Failed to evaluate rule: {rule}")
                    continue

                if not passed:
                    values_str = ", ".join(
                        f"{r}={context.get(r)}" for r in field_refs
                    )
                    self._error(
                        fd,
                        "cross_validation_failed",
                        f"Rule failed: {rule} (values: {values_str})",
                    )

    # ------------------------------------------------------------------
    # Pass 5: Mandatory completeness check
    # ------------------------------------------------------------------

    def _pass5_check_mandatory_completeness(self) -> None:
        for fd in self.descriptors.values():
            if fd.source_type == SourceType.MANUAL:
                if fd.field_id not in self.result.resolved:
                    self.result.manual_required.append(fd.field_id)
                continue

            if fd.mandatory is True:
                if fd.field_id not in self.result.resolved:
                    self._error(
                        fd,
                        "mandatory_unresolved",
                        f"Mandatory field '{fd.field_id}' was not resolved after all passes",
                    )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _by_source(self, source_type: SourceType) -> list[FieldDescriptor]:
        return [fd for fd in self.descriptors.values() if fd.source_type == source_type]

    def _resolve(self, fd: FieldDescriptor, value: Any) -> None:
        validated = validate_data_type(
            fd.field_id, value, fd.data_type, fd.min_val, fd.max_val
        )
        self.result.resolved[fd.field_id] = validated

    def _error(self, fd: FieldDescriptor, error_type: str, message: str) -> None:
        self.result.errors.append(
            FieldError(
                field_id=fd.field_id,
                line=fd.line,
                label=fd.label,
                error_type=error_type,
                severity=Severity.ERROR,
                message=message,
            )
        )

    def _warn(self, fd: FieldDescriptor, error_type: str, message: str) -> None:
        self.result.warnings.append(
            FieldError(
                field_id=fd.field_id,
                line=fd.line,
                label=fd.label,
                error_type=error_type,
                severity=Severity.WARNING,
                message=message,
            )
        )
