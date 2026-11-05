CREATE TABLE `admin_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`credential_hash` text NOT NULL,
	`expires_at` integer NOT NULL
);
