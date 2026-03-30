"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

// Opened inside the OAuth popup.
// Posts result to the opener then closes itself.
export default function QBOConnectedPage() {
  const params = useSearchParams();

  useEffect(() => {
    const entityId = params.get("entityId");
    const companyName = params.get("companyName") ?? "";
    const error = params.get("error");

    if (window.opener) {
      window.opener.postMessage(
        error
          ? { type: "QBO_AUTH_ERROR", error }
          : { type: "QBO_AUTH_SUCCESS", entityId, companyName },
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
