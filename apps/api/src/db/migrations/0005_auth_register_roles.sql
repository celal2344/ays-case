-- the moderator role is gone: its users become plain users before the CHECK is added
UPDATE "user" SET "role" = 'user' WHERE "role" = 'moderator';--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_role_check" CHECK ("user"."role" in ('admin', 'user'));
