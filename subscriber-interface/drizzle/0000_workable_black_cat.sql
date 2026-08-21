CREATE TABLE `company_admission_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`original_query` text NOT NULL,
	`symbol` text NOT NULL,
	`company_name` text NOT NULL,
	`exchange` text NOT NULL,
	`status` text NOT NULL,
	`classification` text NOT NULL,
	`evidence_stage` text NOT NULL,
	`listing_evidence_url` text NOT NULL,
	`corporate_evidence_url` text NOT NULL,
	`request_count` integer DEFAULT 1 NOT NULL,
	`first_requested_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_requested_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `company_admission_requests_symbol_unique` ON `company_admission_requests` (`symbol`);