export const MESSAGE_TYPES = {
  SKIP_WAITING: 'SKIP_WAITING',
  QUEUE_MESSAGE: 'QUEUE_MESSAGE',
  RETRY_QUEUE: 'RETRY_QUEUE',
  SYNC_SUCCESS: 'SYNC_SUCCESS',
  SYNC_FAILED: 'SYNC_FAILED',
  NOTIFY_COMPLETION: 'NOTIFY_COMPLETION',
} as const;

export const STRINGS = {
  queueOfflineMessage:
    'شما آفلاین هستید. پیامت پس از بازگشت اتصال ارسال خواهد شد.',

  pushDefaultTitle: 'چت‌بات هوش مصنوعی',

  pushDefaultBody: 'پیام جدیدی دریافت شد.',

  notificationOpen: 'باز کردن',

  notificationDismiss: 'رد کردن',

  responseReadyTitle: 'پاسخ آماده است',

  responseReadyBody: 'دستیار هوش مصنوعی شما پاسخ داد.',
} as const;