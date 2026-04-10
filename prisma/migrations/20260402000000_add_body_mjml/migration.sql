-- Add MJML source column to notification_templates
ALTER TABLE "notification_templates" ADD COLUMN "body_mjml" TEXT;
