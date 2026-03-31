"use client";

import { useState, useCallback, useEffect, useRef } from "react";

interface SyncResult {
  form_id: string;
  pdf_status: string;
  instructions_status: string;
  fields_added: number;
  fields_removed: number;
  fields_changed: number;
  rule_changes_detected: number;
  committed_to_repo: boolean;
}

interface SyncStatusResponse {
  job_id: string;
  status: "processing" | "complete" | "failed";
  results: SyncResult[];
}

interface AdminSyncPanelProps {
  taxYear: number;
  formIds: string[];
  onSyncComplete?: (results: SyncResult[]) => void;
}

/**
 * Manual form sync panel — triggers sync and polls for status.
 */
export default function AdminSyncPanel({
  taxYear,
  formIds,
  onSyncComplete,
}: AdminSyncPanelProps) {
  const [syncing, setSyncing] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<SyncStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startSync = useCallback(async () => {
    setSyncing(true);
    setError(null);
    setStatus(null);

    try {
      const res = await fetch("/api/admin/sync-forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tax_year: taxYear, form_ids: formIds }),
      });

      if (res.status === 403) {
        setError("Admin access required");
        setSyncing(false);
        return;
      }

      if (!res.ok) {
        setError(`Sync failed: ${res.statusText}`);
        setSyncing(false);
        return;
      }

      const data = await res.json();
      setJobId(data.job_id);
    } catch (e) {
      setError(`Network error: ${e}`);
      setSyncing(false);
    }
  }, [taxYear, formIds]);

  // Poll for status
  useEffect(() => {
    if (!jobId) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/admin/sync-status/${jobId}`);
        if (!res.ok) return;
        const data: SyncStatusResponse = await res.json();
        setStatus(data);

        if (data.status === "complete" || data.status === "failed") {
          setSyncing(false);
          if (pollRef.current) clearInterval(pollRef.current);
          if (data.status === "complete" && onSyncComplete) {
            onSyncComplete(data.results);
          }
        }
      } catch {
        // Retry on next interval
      }
    };

    pollRef.current = setInterval(poll, 2000);
    poll(); // immediate first check

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [jobId, onSyncComplete]);

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Form Sync — TY {taxYear}</h3>
        <button
          onClick={startSync}
          disabled={syncing}
          className={`rounded-md px-4 py-2 text-sm font-medium text-white ${
            syncing
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {syncing ? "Syncing..." : "Sync Forms"}
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 mb-3">
          {error}
        </div>
      )}

      {status && (
        <div className="space-y-2">
          <div className="text-sm text-gray-600">
            Status:{" "}
            <span
              className={`font-medium ${
                status.status === "complete"
                  ? "text-green-600"
                  : status.status === "failed"
                  ? "text-red-600"
                  : "text-yellow-600"
              }`}
            >
              {status.status}
            </span>
          </div>

          {status.results.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-1">Form</th>
                  <th className="pb-1">PDF</th>
                  <th className="pb-1">Fields +/-</th>
                  <th className="pb-1">Repo</th>
                </tr>
              </thead>
              <tbody>
                {status.results.map((r) => (
                  <tr key={r.form_id} className="border-b">
                    <td className="py-1 font-mono">{r.form_id}</td>
                    <td className="py-1">{r.pdf_status}</td>
                    <td className="py-1">
                      +{r.fields_added} / -{r.fields_removed}
                    </td>
                    <td className="py-1">{r.committed_to_repo ? "✓" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
