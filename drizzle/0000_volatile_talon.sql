CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'todo' NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`tag` text DEFAULT 'Personal' NOT NULL,
	`due_date` text DEFAULT '' NOT NULL,
	`assignee` text DEFAULT 'CM' NOT NULL,
	`created_at` integer NOT NULL
);
