ALTER TABLE "playground" ADD COLUMN "fts" "tsvector" GENERATED ALWAYS AS (to_tsvector('english',coalesce("playground"."name", '') || ' ' || coalesce("playground"."description", ''))) STORED;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dialect_idx" ON "playground" USING btree ("dialect");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "playground_search_index" ON "playground" USING gin ("fts");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "username_idx" ON "user" USING btree ("username");