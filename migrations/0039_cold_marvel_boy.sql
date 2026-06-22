DELETE FROM `login_attempts_table`;--> statement-breakpoint
ALTER TABLE `login_attempts_table` ADD `target_hmac` text NOT NULL;