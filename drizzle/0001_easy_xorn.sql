CREATE TABLE "group_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "category_id" uuid;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "site_announcement" text;--> statement-breakpoint
CREATE UNIQUE INDEX "group_categories_name_idx" ON "group_categories" USING btree ("name");--> statement-breakpoint
CREATE INDEX "group_categories_sort_order_idx" ON "group_categories" USING btree ("sort_order");--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_category_id_group_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."group_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "groups_category_idx" ON "groups" USING btree ("category_id");