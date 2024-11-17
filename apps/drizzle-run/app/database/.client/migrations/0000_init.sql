CREATE TABLE IF NOT EXISTS "playground" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"dialect" text NOT NULL,
	"content" jsonb NOT NULL,
	"creator_id" uuid,
	"created_at" timestamp(3) DEFAULT NOW() NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"forked_from_id" text
);