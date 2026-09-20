CREATE TYPE "public"."memory_sensitivity" AS ENUM('normal', 'sensitive', 'high');--> statement-breakpoint
CREATE TYPE "public"."memory_source" AS ENUM('explicit', 'conversation', 'inferred', 'tool');--> statement-breakpoint
CREATE TYPE "public"."memory_type" AS ENUM('profile', 'preference', 'fact', 'relationship', 'event', 'goal', 'thread', 'commitment', 'interaction_pattern');--> statement-breakpoint
CREATE TABLE "memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "memory_type" NOT NULL,
	"key" text NOT NULL,
	"content" text NOT NULL,
	"source" "memory_source" DEFAULT 'explicit' NOT NULL,
	"confidence" integer DEFAULT 100 NOT NULL,
	"sensitivity" "memory_sensitivity" DEFAULT 'normal' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_confirmed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "memories_user_id_idx" ON "memories" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "memories_user_key_idx" ON "memories" USING btree ("user_id","key");