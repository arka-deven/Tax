"use client";

interface FieldChange {
  change_type: string;
  field_id: string;
  description: string;
}

interface LogicChange {
  description: string;
  severity: string;
}

interface RuleChangeReport {
  form_id: string;
  prior_year: number;
  current_year: number;
  field_changes: FieldChange[];
  logic_changes: LogicChange[];
  breaking_count: number;
  summary: string;
}

interface RuleChangeSummaryProps {
  report: RuleChangeReport;
  onAcknowledge?: (formId: string) => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  BREAKING_CHANGE: "bg-red-100 text-red-800",
  BREAKING: "bg-red-100 text-red-800",
  IMPORTANT: "bg-yellow-100 text-yellow-800",
  ADDITIVE: "bg-green-100 text-green-800",
  DEPRECATED: "bg-gray-100 text-gray-800",
  RENAMED: "bg-blue-100 text-blue-800",
  TYPE_CHANGE: "bg-purple-100 text-purple-800",
  MINOR: "bg-gray-100 text-gray-600",
};

/**
 * Shows breaking changes and field diffs before a new year goes live.
 */
export default function RuleChangeSummary({
  report,
  onAcknowledge,
}: RuleChangeSummaryProps) {
  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {report.form_id}: {report.prior_year} → {report.current_year}
        </h3>
        {report.breaking_count > 0 && (
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
            {report.breaking_count} BREAKING
          </span>
        )}
      </div>

      {report.summary && (
        <p className="text-sm text-gray-700">{report.summary}</p>
      )}

      {report.field_changes.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-2">
            Field Changes ({report.field_changes.length})
          </h4>
          <ul className="space-y-1">
            {report.field_changes.map((change, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                    SEVERITY_COLORS[change.change_type] ?? "bg-gray-100"
                  }`}
                >
                  {change.change_type}
                </span>
                <code className="text-xs text-gray-600">{change.field_id}</code>
                <span className="text-gray-500">— {change.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.logic_changes.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-2">
            Logic Changes ({report.logic_changes.length})
          </h4>
          <ul className="space-y-1">
            {report.logic_changes.map((change, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                    SEVERITY_COLORS[change.severity] ?? "bg-gray-100"
                  }`}
                >
                  {change.severity}
                </span>
                <span className="text-gray-700">{change.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {onAcknowledge && report.breaking_count > 0 && (
        <button
          onClick={() => onAcknowledge(report.form_id)}
          className="rounded-md bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700"
        >
          Acknowledge Breaking Changes
        </button>
      )}
    </div>
  );
}
