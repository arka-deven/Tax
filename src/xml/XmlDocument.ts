export interface XmlFieldValue {
  fieldId: string;
  value: string | number | boolean | null;
  source: "pipeline" | "user_edit" | "computed";
  updatedAt: string;
}

export interface XmlFormDocument {
  formCode: string;
  entityId: string;
  taxYear: number;
  fields: Record<string, XmlFieldValue>;
  returnHeader: {
    ein: string;
    businessName: string;
    address: { line1: string; city: string; state: string; zip: string };
    taxPeriodBegin: string;
    taxPeriodEnd: string;
  };
  version: number;
  updatedAt: string;
}
