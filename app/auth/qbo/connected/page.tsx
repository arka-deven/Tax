"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

function QBOConnectedInner() {
  const params = useSearchParams();
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    const entityId = params.get("entityId");
    const companyName = params.get("companyName") ?? "";
    const ein = params.get("ein") ?? "";
    const error = params.get("error");

    // Notify parent window — use "*" because the popup may land on a
    // different Vercel deployment URL than the opener (e.g. production
    // alias vs preview deployment).
    if (window.opener) {
      window.opener.postMessage(
        error
          ? { type: "QBO_AUTH_ERROR", error }
          : { type: "QBO_AUTH_SUCCESS", entityId, companyName, ein },
        "*"
      );
    }

    // Try to close popup — browsers may block this
    try {
      window.close();
    } catch { /* blocked */ }

    // If still open after 500ms, show the manual redirect
    const t = setTimeout(() => setClosed(true), 500);
    return () => clearTimeout(t);
  }, [params]);

  const error = params.get("error");
  const companyName = params.get("companyName");

  if (!closed) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: "#f1f0ea" }}>
        <p className="text-sm" style={{ color: "#78737a" }}>Connecting…</p>
      </div>
    );
  }

  // Popup didn't close — show success + link back
  return (
    <div className="flex h-screen items-center justify-center" style={{ background: "#f1f0ea" }}>
      <div className="text-center max-w-xs px-6">
        {error ? (
          <>
            <p className="text-red-600 font-semibold text-sm">Connection failed</p>
            <p className="text-xs mt-1" style={{ color: "#78737a" }}>{error}</p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={24} className="text-emerald-600" />
            </div>
            <p className="font-semibold text-sm" style={{ color: "#2d232e" }}>
              {companyName || "QuickBooks"} connected
            </p>
            <p className="text-xs mt-1 mb-6" style={{ color: "#78737a" }}>
              You can close this window, or click below to continue.
            </p>
            <a
              href="/"
              className="inline-block px-6 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors"
              style={{ background: "#2d232e" }}
            >
              Continue to Tax
            </a>
          </>
        )}
      </div>
    </div>
  );
}

export default function QBOConnectedPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center" style={{ background: "#f1f0ea" }}><p className="text-sm" style={{ color: "#78737a" }}>Connecting…</p></div>}>
      <QBOConnectedInner />
    </Suspense>
  );
}
