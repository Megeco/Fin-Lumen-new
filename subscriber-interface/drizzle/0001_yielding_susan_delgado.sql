ALTER TABLE `company_admission_requests` ADD `isin` text;--> statement-breakpoint
ALTER TABLE `company_admission_requests` ADD `listing_date` text;--> statement-breakpoint
ALTER TABLE `company_admission_requests` ADD `candidate_chart_type` text;--> statement-breakpoint
ALTER TABLE `company_admission_requests` ADD `candidate_date` text;--> statement-breakpoint
ALTER TABLE `company_admission_requests` ADD `candidate_time` text;--> statement-breakpoint
ALTER TABLE `company_admission_requests` ADD `candidate_city` text;--> statement-breakpoint
ALTER TABLE `company_admission_requests` ADD `candidate_timezone` text;--> statement-breakpoint
ALTER TABLE `company_admission_requests` ADD `source_label` text;--> statement-breakpoint
ALTER TABLE `company_admission_requests` ADD `history_flags_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `company_admission_requests` ADD `owner_decision` text;--> statement-breakpoint
ALTER TABLE `company_admission_requests` ADD `owner_note` text;--> statement-breakpoint
ALTER TABLE `company_admission_requests` ADD `decided_at` text;