"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function QBOConnectedInner() {
  const params = useSearchParams();

  useEffect(() => {
    const entityId = params.get("entityId");
    const companyName = params.get("companyName") ?? "";
    const ein = params.get("ein") ?? "";
    const error = params.get("error");

    if (window.opener) {
      window.opener.postMessage(
        error
          ? { type: "QBO_AUTH_ERROR", error }
          : { type: "QBO_AUTH_SUCCESS", entityId, companyName, ein },
        window.location.origin
      );
    }
    window.close();
  }, [params]);

  return (
    <div className="flex h-screen items-center justify-center text-stone-500 text-sm">
      Connecting…
    </div>
  );
}

export default function QBOConnectedPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-stone-500 text-sm">Connecting…</div>}>
      <QBOConnectedInner />
    </Suspense>
  );
}
