"use client";
import { useState, useCallback, useEffect } from "react";
import type { UnifiedFormSchema } from "@/src/schemas/types";
import type { XmlFormDocument, XmlFieldValue } from "@/src/xml/XmlDocument";
import { recomputeFields } from "@/src/xml/XmlComputeEngine";

interface UseXmlFormReturn {
  doc: XmlFormDocument | null;
  loading: boolean;
  error: string | null;
  updateField: (fieldId: string, value: string | number) => void;
  regenerate: (facts: Record<string, unknown>, meta: Record<string, unknown>) => Promise<void>;
  downloadXml: () => void;
  editedFields: Set<string>;
}

export function useXmlForm(
  entityId: string,
  formCode: string,
  taxYear: number,
  schema: UnifiedFormSchema
): UseXmlFormReturn {
  const [doc, setDoc] = useState<XmlFormDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editedFields, setEditedFields] = useState<Set<string>>(new Set());

  // Load document
  useEffect(() => {
    if (!entityId || !formCode) return;
    setLoading(true);
    fetch(`/api/xml/${entityId}/${encodeURIComponent(formCode)}?taxYear=${taxYear}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setDoc(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [entityId, formCode, taxYear]);

  // Update a single field (optimistic + persist)
  const updateField = useCallback((fieldId: string, value: string | number) => {
    if (!doc) return;
    const now = new Date().toISOString();
    const updated = { ...doc };
    updated.fields = { ...updated.fields };
    updated.fields[fieldId] = { fieldId, value, source: "user_edit" as const, updatedAt: now };
    updated.fields = recomputeFields(schema, updated.fields);
    updated.version += 1;
    updated.updatedAt = now;
    setDoc(updated);
    setEditedFields(prev => new Set([...prev, fieldId]));

    // Persist to server (fire and forget)
    fetch(`/api/xml/${entityId}/${encodeURIComponent(formCode)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fieldId, value, taxYear }),
    }).catch(() => {});
  }, [doc, schema, entityId, formCode, taxYear]);

  // Regenerate from pipeline facts
  const regenerate = useCallback(async (facts: Record<string, unknown>, meta: Record<string, unknown>) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/xml/${entityId}/${encodeURIComponent(formCode)}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facts, meta, taxYear }),
      });
      if (res.ok) {
        const data = await res.json();
        setDoc(data);
      }
    } finally {
      setLoading(false);
    }
  }, [entityId, formCode, taxYear]);

  // Download MeF XML
  const downloadXml = useCallback(() => {
    if (!doc) return;
    fetch(`/api/xml/${entityId}/${encodeURIComponent(formCode)}/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taxYear }),
    })
      .then(r => r.json())
      .then(data => {
        const blob = new Blob([data.xml], { type: "application/xml" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${formCode}_${taxYear}_MeF.xml`;
        a.click();
        URL.revokeObjectURL(url);
      });
  }, [doc, entityId, formCode, taxYear]);

  return { doc, loading, error, updateField, regenerate, downloadXml, editedFields };
}
