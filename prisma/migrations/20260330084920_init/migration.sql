-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('EMAIL', 'SMS', 'PUSH', 'INAPP', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "EventCategory" AS ENUM ('AUTH', 'USER_MANAGEMENT', 'TENANT', 'BILLING', 'DOCUMENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('USER', 'SYSTEM', 'TENANT');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('MESSAGE', 'WARNING', 'ANNOUNCEMENT', 'ALERT');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'RETRYING', 'READ', 'SCHEDULED');

-- CreateTable
CREATE TABLE "notification_events" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "EventCategory" NOT NULL,
    "scope" "NotificationType" NOT NULL DEFAULT 'USER',
    "defaultChannels" "Channel"[],
    "variables" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" UUID NOT NULL,
    "eventCode" TEXT NOT NULL,
    "channel" "Channel" NOT NULL,
    "tenantId" UUID,
    "name" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "bodyHtml" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID,
    "eventCode" TEXT,
    "type" "NotificationType" NOT NULL,
    "category" "NotificationCategory" NOT NULL DEFAULT 'MESSAGE',
    "channel" "Channel" NOT NULL,
    "templateId" UUID,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "metadata" JSONB,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "readAt" TIMESTAMP(3),
    "scheduledAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_logs" (
    "id" UUID NOT NULL,
    "notificationId" UUID NOT NULL,
    "channel" "Channel" NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "status" "DeliveryStatus" NOT NULL,
    "providerResponse" JSONB,
    "error" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "channel" "Channel" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "dndStart" TEXT,
    "dndEnd" TEXT,
    "dndTimezone" TEXT DEFAULT 'UTC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_events_code_key" ON "notification_events"("code");

-- CreateIndex
CREATE INDEX "notification_events_category_idx" ON "notification_events"("category");

-- CreateIndex
CREATE INDEX "notification_events_isActive_idx" ON "notification_events"("isActive");

-- CreateIndex
CREATE INDEX "notification_templates_eventCode_idx" ON "notification_templates"("eventCode");

-- CreateIndex
CREATE INDEX "notification_templates_tenantId_idx" ON "notification_templates"("tenantId");

-- CreateIndex
CREATE INDEX "notification_templates_isSystem_idx" ON "notification_templates"("isSystem");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_eventCode_channel_tenantId_key" ON "notification_templates"("eventCode", "channel", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_idempotencyKey_key" ON "notifications"("idempotencyKey");

-- CreateIndex
CREATE INDEX "notifications_tenantId_idx" ON "notifications"("tenantId");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_tenantId_userId_status_idx" ON "notifications"("tenantId", "userId", "status");

-- CreateIndex
CREATE INDEX "notifications_tenantId_type_idx" ON "notifications"("tenantId", "type");

-- CreateIndex
CREATE INDEX "notifications_eventCode_idx" ON "notifications"("eventCode");

-- CreateIndex
CREATE INDEX "delivery_logs_notificationId_idx" ON "delivery_logs"("notificationId");

-- CreateIndex
CREATE INDEX "user_preferences_tenantId_userId_idx" ON "user_preferences"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_tenantId_userId_channel_key" ON "user_preferences"("tenantId", "userId", "channel");

-- AddForeignKey
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_eventCode_fkey" FOREIGN KEY ("eventCode") REFERENCES "notification_events"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "notification_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_logs" ADD CONSTRAINT "delivery_logs_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
