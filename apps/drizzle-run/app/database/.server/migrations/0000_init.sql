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

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user" (
	"id" uuid PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"full_name" text,
	"avatar_url" text,
	"joined_at" timestamp(3) DEFAULT NOW() NOT NULL,
	CONSTRAINT "user_username_unique" UNIQUE("username")
);

--> statement-breakpoint
DO $$ BEGIN
ALTER TABLE "playground"
ADD CONSTRAINT "playground_creator_id_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE
SET NULL ON UPDATE no ACTION;

EXCEPTION
WHEN duplicate_object THEN NULL;

END $$;

--> statement-breakpoint
DO $$ BEGIN
ALTER TABLE "user"
ADD CONSTRAINT "user_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE no ACTION;

EXCEPTION
WHEN duplicate_object THEN NULL;

END $$;

--> statement-breakpoint
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
ALTER TABLE "playground" ENABLE ROW LEVEL SECURITY;