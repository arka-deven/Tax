// Generated Supabase database types — keep in sync with supabase/migrations/001_init.sql

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      raw_source_records: {
        Row: {
          raw_source_id: string;
          source_system: string;
          entity_id: string;
          tax_year: number;
          payload_json: Json;
          ingested_at: string;
          checksum: string;
        };
        Insert: Omit<Database["public"]["Tables"]["raw_source_records"]["Row"], never>;
        Update: Partial<Database["public"]["Tables"]["raw_source_records"]["Insert"]>;
      };
      canonical_ledger_accounts: {
        Row: {
          canonical_account_id: string;
          raw_source_id: string;
          entity_id: string;
          account_number: string;
          account_name: string;
          account_type: string;
          account_subtype: string;
          normal_balance: "debit" | "credit";
          is_active: boolean;
          source_refs: string[];
        };
        Insert: Omit<Database["public"]["Tables"]["canonical_ledger_accounts"]["Row"], never>;
        Update: Partial<Database["public"]["Tables"]["canonical_ledger_accounts"]["Insert"]>;
      };
      canonical_ledger_entries: {
        Row: {
          canonical_entry_id: string;
          raw_source_id: string;
          entity_id: string;
          posting_date: string;
          tax_year: number;
          debit_amount: number;
          credit_amount: number;
          account_id: string;
          counterparty_id: string | null;
          memo: string | null;
          class_id: string | null;
          location_id: string | null;
          source_refs: string[];
        };
        Insert: Omit<Database["public"]["Tables"]["canonical_ledger_entries"]["Row"], never>;
        Update: Partial<Database["public"]["Tables"]["canonical_ledger_entries"]["Insert"]>;
      };
      trial_balance_lines: {
        Row: {
          tb_line_id: string;
          entity_id: string;
          tax_year: number;
          account_id: string;
          beginning_balance: number;
          activity_debits: number;
          activity_credits: number;
          ending_balance: number;
          adjusted_balance: number;
          adjustment_ids: string[];
          source_refs: string[];
        };
        Insert: Omit<Database["public"]["Tables"]["trial_balance_lines"]["Row"], never>;
        Update: Partial<Database["public"]["Tables"]["trial_balance_lines"]["Insert"]>;
      };
      tax_adjustments: {
        Row: {
          adjustment_id: string;
          entity_id: string;
          tax_year: number;
          adjustment_type: string;
          target_tb_line_id: string;
          amount: number;
          direction: "debit" | "credit";
          reason_code: string;
          note: string | null;
          created_by: string;
          created_at: string;
          approved_by: string | null;
          approved_at: string | null;
          source_refs: string[];
        };
        Insert: Omit<Database["public"]["Tables"]["tax_adjustments"]["Row"], never>;
        Update: Partial<Database["public"]["Tables"]["tax_adjustments"]["Insert"]>;
      };
      tax_code_mappings: {
        Row: {
          mapping_id: string;
          entity_id: string;
          tax_year: number;
          tb_line_id: string;
          semantic_category: string;
          tax_code: string;
          target_form: string;
          target_schedule: string | null;
          target_line: string;
          mapping_method: string;
          confidence_score: number;
          requires_review: boolean;
          review_reason_code: string | null;
          explanation: string;
          source_refs: string[];
        };
        Insert: Omit<Database["public"]["Tables"]["tax_code_mappings"]["Row"], never>;
        Update: Partial<Database["public"]["Tables"]["tax_code_mappings"]["Insert"]>;
      };
      tax_facts: {
        Row: {
          tax_fact_id: string;
          entity_id: string;
          tax_year: number;
          fact_name: string;
          fact_value_json: Json;
          value_type: string;
          confidence_score: number;
          is_unknown: boolean;
          derived_from_mapping_ids: string[];
          derived_from_adjustment_ids: string[];
          explanation: string;
        };
        Insert: Omit<Database["public"]["Tables"]["tax_facts"]["Row"], never>;
        Update: Partial<Database["public"]["Tables"]["tax_facts"]["Insert"]>;
      };
      rule_definitions: {
        Row: {
          rule_id: string;
          rule_family: string;
          rule_version: string;
          tax_year: number;
          entity_scope: string[];
          jurisdiction_scope: string[];
          effective_from: string;
          effective_to: string | null;
          condition_json: Json;
          action_json: Json;
          on_unknown_json: Json;
          source_document: string;
          source_section: string;
          source_citation_text: string;
          status: "draft" | "active" | "deprecated";
          created_at: string;
          supersedes_rule_id: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["rule_definitions"]["Row"], never>;
        Update: Partial<Database["public"]["Tables"]["rule_definitions"]["Insert"]>;
      };
      diagnostics: {
        Row: {
          diagnostic_id: string;
          entity_id: string;
          tax_year: number;
          severity: "blocking_error" | "warning" | "info";
          category: string;
          code: string;
          title: string;
          message: string;
          affected_forms: string[];
          affected_lines: string[];
          source_rule_ids: string[];
          source_mapping_ids: string[];
          source_tb_line_ids: string[];
          resolution_status: "open" | "resolved" | "waived";
          resolution_note: string | null;
          created_at: string;
          resolved_at: string | null;
          resolved_by: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["diagnostics"]["Row"], never>;
        Update: Partial<Database["public"]["Tables"]["diagnostics"]["Insert"]>;
      };
      review_workpapers: {
        Row: {
          workpaper_id: string;
          entity_id: string;
          tax_year: number;
          workpaper_type: string;
          title: string;
          description: string;
          attached_source_refs: string[];
          attached_mapping_ids: string[];
          attached_rule_ids: string[];
          attached_diagnostic_ids: string[];
          preparer_note: string | null;
          reviewer_note: string | null;
          signoff_status: string;
          signed_off_by: string | null;
          signed_off_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["review_workpapers"]["Row"], never>;
        Update: Partial<Database["public"]["Tables"]["review_workpapers"]["Insert"]>;
      };
      form_requirements: {
        Row: {
          form_requirement_id: string;
          entity_id: string;
          tax_year: number;
          form_code: string;
          schedule_code: string | null;
          requirement_status: "required" | "possible" | "blocked" | "not_required";
          triggered_by_rule_ids: string[];
          triggered_by_fact_ids: string[];
          explanation: string;
          confidence_score: number;
        };
        Insert: Omit<Database["public"]["Tables"]["form_requirements"]["Row"], never>;
        Update: Partial<Database["public"]["Tables"]["form_requirements"]["Insert"]>;
      };
      filing_packages: {
        Row: {
          filing_package_id: string;
          entity_id: string;
          tax_year: number;
          form_set: string[];
          assembly_status: string;
          validation_status: string;
          review_status: string;
          transmission_status: string;
          acknowledgement_status: string;
          last_status_at: string;
          status_message: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["filing_packages"]["Row"], never>;
        Update: Partial<Database["public"]["Tables"]["filing_packages"]["Insert"]>;
      };
    };
  };
}
