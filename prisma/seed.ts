import { PrismaClient } from '@prisma/client'
import type { Prisma } from '@prisma/client'

const prisma = new PrismaClient()

// ── Event definitions ────────────────────────────────────────────────────────

interface Variable { name: string; description: string; required: boolean; sampleValue: string }

interface EventSeed {
  code: string
  name: string
  description: string
  category: 'AUTH' | 'USER_MANAGEMENT' | 'TENANT' | 'BILLING' | 'DOCUMENT' | 'SYSTEM'
  scope: 'USER' | 'TENANT' | 'SYSTEM'
  defaultChannels: ('EMAIL' | 'SMS' | 'PUSH' | 'INAPP' | 'WHATSAPP')[]
  variables: Variable[]
}

const EVENTS: EventSeed[] = [
  // ── AUTH ──────────────────────────────────────────────────────────────
  {
    code: 'auth.signup',
    name: 'Signup Confirmation',
    description: 'Sent when a new tenant admin signs up',
    category: 'AUTH',
    scope: 'USER',
    defaultChannels: ['EMAIL', 'INAPP'],
    variables: [
      { name: 'firstName',  description: 'User first name',     required: true,  sampleValue: 'Jane' },
      { name: 'email',      description: 'User email address',  required: true,  sampleValue: 'jane@acme.com' },
      { name: 'tenantName', description: 'Organisation name',   required: false, sampleValue: 'Acme Inc' },
      { name: 'loginUrl',   description: 'Login URL',           required: true,  sampleValue: 'https://app.hashiflow.io/login' },
    ],
  },
  {
    code: 'auth.welcome',
    name: 'Welcome',
    description: 'Welcome message after first login',
    category: 'AUTH',
    scope: 'USER',
    defaultChannels: ['EMAIL', 'INAPP'],
    variables: [
      { name: 'firstName',  description: 'User first name',   required: true,  sampleValue: 'Jane' },
      { name: 'tenantName', description: 'Organisation name', required: false, sampleValue: 'Acme Inc' },
      { name: 'loginUrl',   description: 'Login URL',         required: true,  sampleValue: 'https://app.hashiflow.io/login' },
    ],
  },
  {
    code: 'auth.password_reset',
    name: 'Password Reset Request',
    description: 'Sent when a user requests a password reset',
    category: 'AUTH',
    scope: 'USER',
    defaultChannels: ['EMAIL'],
    variables: [
      { name: 'firstName', description: 'User first name',      required: true, sampleValue: 'Jane' },
      { name: 'resetUrl',  description: 'Password reset URL',   required: true, sampleValue: 'https://app.hashiflow.io/reset?token=abc' },
      { name: 'expiresIn', description: 'Link expiry duration', required: false, sampleValue: '30 minutes' },
    ],
  },
  {
    code: 'auth.password_changed',
    name: 'Password Changed',
    description: 'Confirmation that password was changed',
    category: 'AUTH',
    scope: 'USER',
    defaultChannels: ['EMAIL', 'INAPP'],
    variables: [
      { name: 'firstName', description: 'User first name', required: true, sampleValue: 'Jane' },
    ],
  },
  {
    code: 'auth.email_verification',
    name: 'Email Verification',
    description: 'Email verification link',
    category: 'AUTH',
    scope: 'USER',
    defaultChannels: ['EMAIL'],
    variables: [
      { name: 'firstName', description: 'User first name',        required: true, sampleValue: 'Jane' },
      { name: 'verifyUrl', description: 'Email verification URL', required: true, sampleValue: 'https://app.hashiflow.io/verify?token=abc' },
    ],
  },

  // ── USER MANAGEMENT ──────────────────────────────────────────────────
  {
    code: 'user.created',
    name: 'User Created',
    description: 'Sent to a newly created user with their credentials',
    category: 'USER_MANAGEMENT',
    scope: 'USER',
    defaultChannels: ['EMAIL', 'INAPP'],
    variables: [
      { name: 'firstName',         description: 'User first name',      required: true,  sampleValue: 'Jane' },
      { name: 'email',             description: 'User email',           required: true,  sampleValue: 'jane@acme.com' },
      { name: 'temporaryPassword', description: 'Temporary password',   required: false, sampleValue: 'Temp@1234' },
      { name: 'tenantName',        description: 'Organisation name',    required: false, sampleValue: 'Acme Inc' },
      { name: 'loginUrl',          description: 'Login URL',            required: true,  sampleValue: 'https://app.hashiflow.io/login' },
    ],
  },
  {
    code: 'user.invited',
    name: 'User Invitation',
    description: 'Invitation to join an organisation',
    category: 'USER_MANAGEMENT',
    scope: 'USER',
    defaultChannels: ['EMAIL'],
    variables: [
      { name: 'firstName',   description: 'Invitee first name', required: true,  sampleValue: 'Jane' },
      { name: 'inviterName', description: 'Who sent the invite', required: true, sampleValue: 'John Doe' },
      { name: 'tenantName',  description: 'Organisation name',  required: true,  sampleValue: 'Acme Inc' },
      { name: 'inviteUrl',   description: 'Invitation URL',     required: true,  sampleValue: 'https://app.hashiflow.io/invite?token=abc' },
    ],
  },
  {
    code: 'user.deactivated',
    name: 'Account Deactivated',
    description: 'Sent when a user account is deactivated',
    category: 'USER_MANAGEMENT',
    scope: 'USER',
    defaultChannels: ['EMAIL', 'INAPP'],
    variables: [
      { name: 'firstName', description: 'User first name',         required: true,  sampleValue: 'Jane' },
      { name: 'reason',    description: 'Deactivation reason',     required: false, sampleValue: 'Account inactive for 90 days' },
    ],
  },
  {
    code: 'user.role_changed',
    name: 'Role Changed',
    description: 'Sent when a user\'s role is changed',
    category: 'USER_MANAGEMENT',
    scope: 'USER',
    defaultChannels: ['INAPP', 'EMAIL'],
    variables: [
      { name: 'firstName', description: 'User first name', required: true, sampleValue: 'Jane' },
      { name: 'oldRole',   description: 'Previous role',   required: true, sampleValue: 'User' },
      { name: 'newRole',   description: 'New role',        required: true, sampleValue: 'Admin' },
    ],
  },

  // ── TENANT ───────────────────────────────────────────────────────────
  {
    code: 'tenant.created',
    name: 'Tenant Created',
    description: 'Sent when a new organisation is created',
    category: 'TENANT',
    scope: 'TENANT',
    defaultChannels: ['EMAIL', 'INAPP'],
    variables: [
      { name: 'tenantName', description: 'Organisation name', required: true, sampleValue: 'Acme Inc' },
      { name: 'adminName',  description: 'Admin user name',   required: true, sampleValue: 'John Doe' },
    ],
  },
  {
    code: 'tenant.plan_upgraded',
    name: 'Plan Upgraded',
    description: 'Sent when the subscription plan is upgraded',
    category: 'TENANT',
    scope: 'TENANT',
    defaultChannels: ['EMAIL', 'INAPP'],
    variables: [
      { name: 'tenantName', description: 'Organisation name', required: true, sampleValue: 'Acme Inc' },
      { name: 'oldPlan',    description: 'Previous plan',     required: true, sampleValue: 'Starter' },
      { name: 'newPlan',    description: 'New plan',          required: true, sampleValue: 'Pro' },
    ],
  },
  {
    code: 'tenant.plan_downgraded',
    name: 'Plan Downgraded',
    description: 'Sent when the subscription plan is downgraded',
    category: 'TENANT',
    scope: 'TENANT',
    defaultChannels: ['EMAIL', 'INAPP'],
    variables: [
      { name: 'tenantName', description: 'Organisation name', required: true, sampleValue: 'Acme Inc' },
      { name: 'oldPlan',    description: 'Previous plan',     required: true, sampleValue: 'Pro' },
      { name: 'newPlan',    description: 'New plan',          required: true, sampleValue: 'Starter' },
    ],
  },
  {
    code: 'tenant.subscription_expiring',
    name: 'Subscription Expiring',
    description: 'Warning before subscription expires',
    category: 'TENANT',
    scope: 'TENANT',
    defaultChannels: ['EMAIL', 'INAPP'],
    variables: [
      { name: 'tenantName', description: 'Organisation name', required: true, sampleValue: 'Acme Inc' },
      { name: 'expiryDate', description: 'Expiry date',       required: true, sampleValue: '2026-04-15' },
      { name: 'renewUrl',   description: 'Renewal URL',       required: true, sampleValue: 'https://app.hashiflow.io/settings/billing' },
    ],
  },

  // ── BILLING ──────────────────────────────────────────────────────────
  {
    code: 'billing.invoice_generated',
    name: 'Invoice Generated',
    description: 'Sent when a new invoice is generated',
    category: 'BILLING',
    scope: 'USER',
    defaultChannels: ['EMAIL'],
    variables: [
      { name: 'invoiceNumber', description: 'Invoice number', required: true, sampleValue: 'INV-2026-001' },
      { name: 'amount',        description: 'Invoice amount', required: true, sampleValue: '$99.00' },
      { name: 'dueDate',       description: 'Due date',       required: true, sampleValue: '2026-04-01' },
      { name: 'invoiceUrl',    description: 'Invoice URL',    required: false, sampleValue: 'https://app.hashiflow.io/invoices/001' },
    ],
  },
  {
    code: 'billing.payment_received',
    name: 'Payment Received',
    description: 'Confirmation of payment received',
    category: 'BILLING',
    scope: 'USER',
    defaultChannels: ['EMAIL', 'INAPP'],
    variables: [
      { name: 'amount',     description: 'Payment amount', required: true,  sampleValue: '$99.00' },
      { name: 'receiptUrl', description: 'Receipt URL',    required: false, sampleValue: 'https://app.hashiflow.io/receipts/001' },
    ],
  },
  {
    code: 'billing.payment_failed',
    name: 'Payment Failed',
    description: 'Sent when a payment attempt fails',
    category: 'BILLING',
    scope: 'USER',
    defaultChannels: ['EMAIL', 'INAPP'],
    variables: [
      { name: 'amount',   description: 'Payment amount',  required: true,  sampleValue: '$99.00' },
      { name: 'reason',   description: 'Failure reason',  required: false, sampleValue: 'Card declined' },
      { name: 'retryUrl', description: 'Retry URL',       required: true,  sampleValue: 'https://app.hashiflow.io/settings/billing' },
    ],
  },

  // ── DOCUMENT ─────────────────────────────────────────────────────────
  {
    code: 'document.uploaded',
    name: 'Document Uploaded',
    description: 'Confirmation when a document is uploaded',
    category: 'DOCUMENT',
    scope: 'USER',
    defaultChannels: ['INAPP'],
    variables: [
      { name: 'documentName', description: 'Document name', required: true, sampleValue: 'report.pdf' },
    ],
  },
  {
    code: 'document.processed',
    name: 'Document Processed',
    description: 'Sent when document processing is complete',
    category: 'DOCUMENT',
    scope: 'USER',
    defaultChannels: ['INAPP', 'EMAIL'],
    variables: [
      { name: 'documentName', description: 'Document name',   required: true,  sampleValue: 'report.pdf' },
      { name: 'documentUrl',  description: 'Document URL',    required: false, sampleValue: 'https://app.hashiflow.io/docs/abc' },
      { name: 'status',       description: 'Processing status', required: true, sampleValue: 'Completed' },
    ],
  },
  {
    code: 'document.shared',
    name: 'Document Shared',
    description: 'Sent when a document is shared with a user',
    category: 'DOCUMENT',
    scope: 'USER',
    defaultChannels: ['EMAIL', 'INAPP'],
    variables: [
      { name: 'documentName', description: 'Document name', required: true, sampleValue: 'report.pdf' },
      { name: 'sharedBy',     description: 'Who shared it', required: true, sampleValue: 'John Doe' },
      { name: 'documentUrl',  description: 'Document URL',  required: true, sampleValue: 'https://app.hashiflow.io/docs/abc' },
    ],
  },

  // ── SYSTEM ───────────────────────────────────────────────────────────
  {
    code: 'system.maintenance',
    name: 'Scheduled Maintenance',
    description: 'System maintenance announcement',
    category: 'SYSTEM',
    scope: 'SYSTEM',
    defaultChannels: ['EMAIL', 'INAPP'],
    variables: [
      { name: 'startTime',   description: 'Maintenance start', required: true,  sampleValue: '2026-04-01 02:00 UTC' },
      { name: 'endTime',     description: 'Maintenance end',   required: true,  sampleValue: '2026-04-01 06:00 UTC' },
      { name: 'description', description: 'What is happening', required: false, sampleValue: 'Database migration and performance improvements' },
    ],
  },
  {
    code: 'system.update',
    name: 'System Update',
    description: 'New version release announcement',
    category: 'SYSTEM',
    scope: 'SYSTEM',
    defaultChannels: ['INAPP'],
    variables: [
      { name: 'version',      description: 'Version number', required: true,  sampleValue: 'v2.5.0' },
      { name: 'releaseNotes', description: 'Release notes',  required: false, sampleValue: 'New dashboard and improved search' },
    ],
  },
  {
    code: 'system.announcement',
    name: 'System Announcement',
    description: 'General system-wide announcement',
    category: 'SYSTEM',
    scope: 'SYSTEM',
    defaultChannels: ['INAPP'],
    variables: [
      { name: 'title',   description: 'Announcement title', required: true, sampleValue: 'New Feature Available' },
      { name: 'message', description: 'Announcement body',  required: true, sampleValue: 'We have launched the template builder!' },
    ],
  },
  {
    code: 'system.tenant_announcement',
    name: 'Tenant Announcement',
    description: 'Announcement scoped to a specific tenant',
    category: 'SYSTEM',
    scope: 'TENANT',
    defaultChannels: ['INAPP'],
    variables: [
      { name: 'title',   description: 'Announcement title', required: true, sampleValue: 'Team Update' },
      { name: 'message', description: 'Announcement body',  required: true, sampleValue: 'Please review the new guidelines' },
    ],
  },
]

// ── Default templates per event per channel ──────────────────────────────────

interface TemplateSeed {
  eventCode: string
  channel: 'EMAIL' | 'SMS' | 'PUSH' | 'INAPP' | 'WHATSAPP'
  name: string
  subject?: string
  body: string
  bodyHtml?: string
}

function emailWrap(heading: string, body: string): string {
  return `<div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1c1917">
<h2 style="font-size:20px;font-weight:600;margin:0 0 16px">${heading}</h2>
${body}
<p style="margin-top:32px;font-size:13px;color:#78716c">— The HashiFlow Team</p>
</div>`
}

const TEMPLATES: TemplateSeed[] = [
  // auth.signup
  { eventCode: 'auth.signup', channel: 'EMAIL', name: 'Signup – Email',
    subject: 'Welcome to HashiFlow, {{firstName}}!',
    body: 'Hi {{firstName}}, your account has been created. Log in at {{loginUrl}}.',
    bodyHtml: emailWrap('Welcome to HashiFlow!', '<p>Hi {{firstName}},</p><p>Your account has been created successfully. You can now sign in and start exploring.</p><p><a href="{{loginUrl}}" style="display:inline-block;padding:10px 24px;background:#7a5c45;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">Sign In</a></p>') },
  { eventCode: 'auth.signup', channel: 'INAPP', name: 'Signup – In-App',
    subject: 'Welcome!',
    body: 'Welcome to HashiFlow, {{firstName}}! Your account is ready.' },

  // auth.welcome
  { eventCode: 'auth.welcome', channel: 'EMAIL', name: 'Welcome – Email',
    subject: 'Welcome aboard, {{firstName}}!',
    body: 'Hi {{firstName}}, welcome to {{tenantName}}. Sign in at {{loginUrl}}.',
    bodyHtml: emailWrap('Welcome aboard!', '<p>Hi {{firstName}},</p><p>Welcome to <strong>{{tenantName}}</strong>. We\'re glad to have you.</p><p><a href="{{loginUrl}}" style="display:inline-block;padding:10px 24px;background:#7a5c45;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">Go to Dashboard</a></p>') },
  { eventCode: 'auth.welcome', channel: 'INAPP', name: 'Welcome – In-App',
    subject: 'Welcome!',
    body: 'Welcome to {{tenantName}}, {{firstName}}! Explore your dashboard to get started.' },

  // auth.password_reset
  { eventCode: 'auth.password_reset', channel: 'EMAIL', name: 'Password Reset – Email',
    subject: 'Reset your password',
    body: 'Hi {{firstName}}, click here to reset your password: {{resetUrl}}. This link expires in {{expiresIn}}.',
    bodyHtml: emailWrap('Reset Your Password', '<p>Hi {{firstName}},</p><p>We received a request to reset your password. Click the button below to choose a new one.</p><p><a href="{{resetUrl}}" style="display:inline-block;padding:10px 24px;background:#7a5c45;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">Reset Password</a></p><p style="font-size:13px;color:#78716c">This link expires in {{expiresIn}}. If you didn\'t request this, you can safely ignore this email.</p>') },

  // auth.password_changed
  { eventCode: 'auth.password_changed', channel: 'EMAIL', name: 'Password Changed – Email',
    subject: 'Your password has been changed',
    body: 'Hi {{firstName}}, your password has been successfully changed. If this was not you, contact support immediately.',
    bodyHtml: emailWrap('Password Changed', '<p>Hi {{firstName}},</p><p>Your password has been successfully changed.</p><p style="font-size:13px;color:#78716c">If you did not make this change, please contact support immediately.</p>') },
  { eventCode: 'auth.password_changed', channel: 'INAPP', name: 'Password Changed – In-App',
    subject: 'Password updated',
    body: 'Your password has been changed successfully.' },

  // auth.email_verification
  { eventCode: 'auth.email_verification', channel: 'EMAIL', name: 'Email Verification – Email',
    subject: 'Verify your email address',
    body: 'Hi {{firstName}}, please verify your email by clicking: {{verifyUrl}}',
    bodyHtml: emailWrap('Verify Your Email', '<p>Hi {{firstName}},</p><p>Please verify your email address by clicking the button below.</p><p><a href="{{verifyUrl}}" style="display:inline-block;padding:10px 24px;background:#7a5c45;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">Verify Email</a></p>') },

  // user.created
  { eventCode: 'user.created', channel: 'EMAIL', name: 'User Created – Email',
    subject: 'Your {{tenantName}} account is ready',
    body: 'Hi {{firstName}}, an account has been created for you at {{tenantName}}. Sign in at {{loginUrl}} with your email {{email}}. Your temporary password is: {{temporaryPassword}}.',
    bodyHtml: emailWrap('Your Account is Ready', '<p>Hi {{firstName}},</p><p>An account has been created for you at <strong>{{tenantName}}</strong>.</p><p>Sign in with:</p><ul><li>Email: <strong>{{email}}</strong></li><li>Temporary password: <strong>{{temporaryPassword}}</strong></li></ul><p>You will be prompted to change your password on first login.</p><p><a href="{{loginUrl}}" style="display:inline-block;padding:10px 24px;background:#7a5c45;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">Sign In</a></p>') },
  { eventCode: 'user.created', channel: 'INAPP', name: 'User Created – In-App',
    subject: 'Account created',
    body: 'Welcome {{firstName}}! Your account at {{tenantName}} is ready.' },

  // user.invited
  { eventCode: 'user.invited', channel: 'EMAIL', name: 'User Invited – Email',
    subject: '{{inviterName}} invited you to {{tenantName}}',
    body: 'Hi {{firstName}}, {{inviterName}} has invited you to join {{tenantName}}. Accept the invitation at {{inviteUrl}}.',
    bodyHtml: emailWrap('You\'re Invited!', '<p>Hi {{firstName}},</p><p><strong>{{inviterName}}</strong> has invited you to join <strong>{{tenantName}}</strong> on HashiFlow.</p><p><a href="{{inviteUrl}}" style="display:inline-block;padding:10px 24px;background:#7a5c45;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">Accept Invitation</a></p>') },

  // user.deactivated
  { eventCode: 'user.deactivated', channel: 'EMAIL', name: 'Account Deactivated – Email',
    subject: 'Your account has been deactivated',
    body: 'Hi {{firstName}}, your account has been deactivated. Reason: {{reason}}. Contact your admin for assistance.' },
  { eventCode: 'user.deactivated', channel: 'INAPP', name: 'Account Deactivated – In-App',
    subject: 'Account deactivated',
    body: 'Your account has been deactivated. Reason: {{reason}}.' },

  // user.role_changed
  { eventCode: 'user.role_changed', channel: 'INAPP', name: 'Role Changed – In-App',
    subject: 'Your role has changed',
    body: 'Your role has been changed from {{oldRole}} to {{newRole}}.' },
  { eventCode: 'user.role_changed', channel: 'EMAIL', name: 'Role Changed – Email',
    subject: 'Your role has been updated',
    body: 'Hi {{firstName}}, your role has been changed from {{oldRole}} to {{newRole}}.' },

  // tenant.created
  { eventCode: 'tenant.created', channel: 'EMAIL', name: 'Tenant Created – Email',
    subject: '{{tenantName}} is ready on HashiFlow',
    body: 'Hi {{adminName}}, your organisation {{tenantName}} has been created and is ready to use.' },
  { eventCode: 'tenant.created', channel: 'INAPP', name: 'Tenant Created – In-App',
    subject: 'Organisation created',
    body: '{{tenantName}} has been successfully created. Welcome aboard!' },

  // tenant.plan_upgraded
  { eventCode: 'tenant.plan_upgraded', channel: 'INAPP', name: 'Plan Upgraded – In-App',
    subject: 'Plan upgraded!',
    body: '{{tenantName}} has been upgraded from {{oldPlan}} to {{newPlan}}.' },
  { eventCode: 'tenant.plan_upgraded', channel: 'EMAIL', name: 'Plan Upgraded – Email',
    subject: 'Plan upgraded to {{newPlan}}',
    body: 'Hi, {{tenantName}} has been upgraded from {{oldPlan}} to {{newPlan}}. Enjoy the new features!' },

  // tenant.plan_downgraded
  { eventCode: 'tenant.plan_downgraded', channel: 'INAPP', name: 'Plan Downgraded – In-App',
    subject: 'Plan changed',
    body: '{{tenantName}} plan has been changed from {{oldPlan}} to {{newPlan}}.' },
  { eventCode: 'tenant.plan_downgraded', channel: 'EMAIL', name: 'Plan Downgraded – Email',
    subject: 'Plan changed to {{newPlan}}',
    body: 'Hi, {{tenantName}} plan has been changed from {{oldPlan}} to {{newPlan}}.' },

  // tenant.subscription_expiring
  { eventCode: 'tenant.subscription_expiring', channel: 'EMAIL', name: 'Subscription Expiring – Email',
    subject: 'Your subscription is expiring on {{expiryDate}}',
    body: 'Hi, the {{tenantName}} subscription expires on {{expiryDate}}. Renew now at {{renewUrl}} to avoid interruptions.' },
  { eventCode: 'tenant.subscription_expiring', channel: 'INAPP', name: 'Subscription Expiring – In-App',
    subject: 'Subscription expiring soon',
    body: 'Your subscription expires on {{expiryDate}}. Renew to avoid service interruption.' },

  // billing.invoice_generated
  { eventCode: 'billing.invoice_generated', channel: 'EMAIL', name: 'Invoice Generated – Email',
    subject: 'Invoice {{invoiceNumber}} - {{amount}}',
    body: 'Your invoice {{invoiceNumber}} for {{amount}} is due on {{dueDate}}.',
    bodyHtml: emailWrap('New Invoice', '<p>Invoice <strong>{{invoiceNumber}}</strong> for <strong>{{amount}}</strong> has been generated.</p><p>Due date: {{dueDate}}</p>') },

  // billing.payment_received
  { eventCode: 'billing.payment_received', channel: 'EMAIL', name: 'Payment Received – Email',
    subject: 'Payment of {{amount}} received',
    body: 'We have received your payment of {{amount}}. Thank you!' },
  { eventCode: 'billing.payment_received', channel: 'INAPP', name: 'Payment Received – In-App',
    subject: 'Payment confirmed',
    body: 'Payment of {{amount}} has been received. Thank you!' },

  // billing.payment_failed
  { eventCode: 'billing.payment_failed', channel: 'EMAIL', name: 'Payment Failed – Email',
    subject: 'Payment of {{amount}} failed',
    body: 'Your payment of {{amount}} failed. Reason: {{reason}}. Please update your payment method at {{retryUrl}}.' },
  { eventCode: 'billing.payment_failed', channel: 'INAPP', name: 'Payment Failed – In-App',
    subject: 'Payment failed',
    body: 'Payment of {{amount}} failed. Please update your payment method.' },

  // document.uploaded
  { eventCode: 'document.uploaded', channel: 'INAPP', name: 'Document Uploaded – In-App',
    subject: 'Document uploaded',
    body: '{{documentName}} has been uploaded and is being processed.' },

  // document.processed
  { eventCode: 'document.processed', channel: 'INAPP', name: 'Document Processed – In-App',
    subject: 'Document ready',
    body: '{{documentName}} has been processed. Status: {{status}}.' },
  { eventCode: 'document.processed', channel: 'EMAIL', name: 'Document Processed – Email',
    subject: '{{documentName}} is ready',
    body: 'Hi, your document {{documentName}} has been processed ({{status}}).' },

  // document.shared
  { eventCode: 'document.shared', channel: 'EMAIL', name: 'Document Shared – Email',
    subject: '{{sharedBy}} shared {{documentName}} with you',
    body: 'Hi, {{sharedBy}} shared the document {{documentName}} with you. View it at {{documentUrl}}.' },
  { eventCode: 'document.shared', channel: 'INAPP', name: 'Document Shared – In-App',
    subject: 'Document shared',
    body: '{{sharedBy}} shared {{documentName}} with you.' },

  // system.maintenance
  { eventCode: 'system.maintenance', channel: 'EMAIL', name: 'Maintenance – Email',
    subject: 'Scheduled Maintenance: {{startTime}}',
    body: 'HashiFlow will undergo scheduled maintenance from {{startTime}} to {{endTime}}. {{description}}' },
  { eventCode: 'system.maintenance', channel: 'INAPP', name: 'Maintenance – In-App',
    subject: 'Scheduled Maintenance',
    body: 'Maintenance scheduled from {{startTime}} to {{endTime}}. {{description}}' },

  // system.update
  { eventCode: 'system.update', channel: 'INAPP', name: 'System Update – In-App',
    subject: 'HashiFlow {{version}} released',
    body: 'HashiFlow {{version}} is now available. {{releaseNotes}}' },

  // system.announcement
  { eventCode: 'system.announcement', channel: 'INAPP', name: 'System Announcement – In-App',
    subject: '{{title}}',
    body: '{{message}}' },

  // system.tenant_announcement
  { eventCode: 'system.tenant_announcement', channel: 'INAPP', name: 'Tenant Announcement – In-App',
    subject: '{{title}}',
    body: '{{message}}' },
]

// ── Seed runner ──────────────────────────────────────────────────────────────

async function main() {
  console.log('Seeding notification events and default templates...')

  for (const evt of EVENTS) {
    await prisma.notificationEvent.upsert({
      where:  { code: evt.code },
      update: {
        name:            evt.name,
        description:     evt.description,
        category:        evt.category,
        scope:           evt.scope,
        defaultChannels: evt.defaultChannels,
        variables:       evt.variables as unknown as Prisma.InputJsonValue,
      },
      create: {
        code:            evt.code,
        name:            evt.name,
        description:     evt.description,
        category:        evt.category,
        scope:           evt.scope,
        defaultChannels: evt.defaultChannels,
        variables:       evt.variables as unknown as Prisma.InputJsonValue,
      },
    })
    console.log(`  Event: ${evt.code}`)
  }

  for (const tpl of TEMPLATES) {
    // upsert via compound key doesn't work when tenantId is NULL (SQL NULL ≠ NULL),
    // so we find-then-create-or-update manually.
    const existing = await prisma.notificationTemplate.findFirst({
      where: { eventCode: tpl.eventCode, channel: tpl.channel, tenantId: null },
    })
    if (existing) {
      await prisma.notificationTemplate.update({
        where: { id: existing.id },
        data: {
          name:     tpl.name,
          subject:  tpl.subject ?? null,
          body:     tpl.body,
          bodyHtml: tpl.bodyHtml ?? null,
          isSystem: true,
        },
      })
    } else {
      await prisma.notificationTemplate.create({
        data: {
          eventCode: tpl.eventCode,
          channel:   tpl.channel,
          tenantId:  null,
          name:      tpl.name,
          subject:   tpl.subject ?? null,
          body:      tpl.body,
          bodyHtml:  tpl.bodyHtml ?? null,
          isSystem:  true,
          isActive:  true,
        },
      })
    }
    console.log(`    Template: ${tpl.eventCode} [${tpl.channel}]`)
  }

  console.log('Seed complete.')
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
