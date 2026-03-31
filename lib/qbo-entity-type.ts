/**
 * Maps a QBO CompanyInfo.TaxForm value to our internal EntityType string.
 * Returns "" if the value is missing or unrecognised — callers should
 * fall back to manual selection in that case.
 */
export function mapTaxForm(taxForm: string | undefined): string {
  switch (taxForm) {
    case "Tax_Form_C_Corp_1120":           return "c_corp";
    case "Tax_Form_S_Corp_1120S":          return "s_corp";
    case "Tax_Form_Partnership_1065":      return "llc_partnership";
    case "Tax_Form_Sole_Proprietor_Sch_C": return "sole_prop";
    case "Tax_Form_NonProfit_990":         return "nonprofit";
    default:                               return "";
  }
}
