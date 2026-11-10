CREATE TABLE `evaluation_attempts` (
	`key` text PRIMARY KEY NOT NULL,
	`participant_id` text NOT NULL,
	`is_qa` integer NOT NULL,
	`access_hash` text NOT NULL,
	`pre_answers` text,
	`pre_score` integer,
	`lessons` text DEFAULT '[]' NOT NULL,
	`post_answers` text,
	`post_score` integer,
	`feedback` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
