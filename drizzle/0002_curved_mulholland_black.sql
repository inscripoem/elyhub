CREATE TYPE "public"."group_import_mode" AS ENUM('standard', 'round_trip');--> statement-breakpoint
CREATE TYPE "public"."group_import_status" AS ENUM('PARSED', 'EXECUTED');--> statement-breakpoint
CREATE TABLE "group_import_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by_user_id" text NOT NULL,
	"mode" "group_import_mode" NOT NULL,
	"status" "group_import_status" DEFAULT 'PARSED' NOT NULL,
	"source_file_name" text NOT NULL,
	"source_file_size_bytes" integer NOT NULL,
	"payload" jsonb NOT NULL,
	"summary" jsonb NOT NULL,
	"errors" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"executed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "group_import_jobs_user_idx" ON "group_import_jobs" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "group_import_jobs_expires_at_idx" ON "group_import_jobs" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "group_import_jobs_status_idx" ON "group_import_jobs" USING btree ("status");