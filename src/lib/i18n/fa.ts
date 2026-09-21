/**
 * Central Persian (fa-IR) UI copy for the whole app.
 *
 * Why a plain module and not an i18n framework: this product is Persian-first,
 * single-language. A framework (next-intl, react-i18next, ...) would add a
 * dependency, locale routing, and indirection we don't need yet — the cost is
 * real (new architecture, more moving parts) and the benefit (multi-language)
 * isn't a current requirement. If multi-language ever becomes a real need, this
 * file is the seam: its shape already reads like a translation catalog and can
 * be swapped for `messages/fa.json` + a provider with minimal churn elsewhere.
 *
 * Keep code identifiers, route names, API payloads, and technical values
 * (model IDs, tags, manifest `start_url`) out of here — this file only holds
 * user-facing text.
 */

export const fa = {
  common: {
    close: 'بستن',
  },

  meta: {
    title: 'چت‌بات هوش مصنوعی',
    description: 'یک رابط چت هوش مصنوعی، خودمیزبان، با پاسخ‌های جریانی',
    appleWebAppTitle: 'چت هوش مصنوعی',
  },

  chat: {
    newConversation: 'گفت‌وگوی جدید',
    placeholder: 'اینجا بنویسید…',
    ariaMessage: 'پیام',
    ariaAttach: 'پیوست فایل',
    ariaSend: 'ارسال پیام',
    offlineComposer: 'اتصال شما برقرار نیست — پیام‌ها پس از بازگشت اتصال ارسال می‌شوند.',
    emptyPrompt: 'چطور می‌توانم کمکتان کنم؟',
    thinking: 'در حال فکر کردن…',
    loadingHistory: 'در حال بارگذاری گفت‌وگو…',
    retry: 'دوباره تلاش کنید',
  },

  sidebar: {
    newChat: 'چت جدید',
    creating: 'در حال ایجاد…',
    searchPlaceholder: 'جست‌وجو…',
    untitled: 'بدون عنوان',
    emptyTitle: 'هنوز گفت‌وگویی ندارید',
    emptyHint: 'برای شروع، روی «چت جدید» بزنید',
    confirmDelete: 'این گفت‌وگو حذف شود؟',
    rename: 'تغییر نام',
    delete: 'حذف',
    toggle: 'نمایش/پنهان‌سازی نوار کناری',
    moreOptions: 'گزینه‌های بیشتر',
    mobileSidebarTitle: 'نوار کناری',
    mobileSidebarDescription: 'نمایش نوار کناری در حالت موبایل',
  },

  groups: {
    today: 'امروز',
    yesterday: 'دیروز',
    previous7Days: '۷ روز گذشته',
  },

  userMenu: {
    user: 'کاربر',
    noEmail: 'بدون ایمیل',
    proPlan: 'اشتراک حرفه‌ای',
    logOut: 'خروج',
  },

  auth: {
    signIn: 'ورود',
    continueWithGithub: 'ورود با گیت‌هاب',
    continueWithGoogle: 'ورود با گوگل',
    emailLabel: 'آدرس ایمیل',
    emailPlaceholder: 'example@domain.com',
    sendMagicLink: 'ارسال لینک ورود',
    checkEmailTitle: 'لینک ورود ارسال شد',
    checkEmailBody: 'لینک ورود برای <strong>{email}</strong> ارسال شد. لطفاً 받은‌باکس خود را بررسی کنید.',
    backToSignIn: 'بازگشت به ورود',
    magicLinkSent: 'اگر چند دقیقه‌ای صبر کردید و ایمیلی نیافتید، پوشه اسپم را بررسی کنید یا دوباره تلاش کنید.',
    errorTitle: 'خطای احراز هویت',
    tryAgain: 'تلاش دوباره',
    errors: {
      Configuration: 'مشکلی در پیکربندی سرور وجود دارد. لطفاً بعداً دوباره تلاش کنید.',
      AccessDenied: 'شما اجازه‌ی ورود به این حساب را ندارید.',
      Verification: 'لینک ورود دیگر معتبر نیست؛ ممکن است منقضی شده یا قبلاً استفاده شده باشد.',
      OAuthSignin: 'در شروع فرآیند ورود مشکلی پیش آمد. لطفاً دوباره تلاش کنید.',
      OAuthCallback: 'در تکمیل فرآیند ورود مشکلی پیش آمد. لطفاً دوباره تلاش کنید.',
      OAuthAccountNotLinked:
        'این حساب به روش ورود دیگری متصل است. لطفاً از همان روشی که با آن ثبت‌نام کرده‌اید استفاده کنید.',
      Default: 'در هنگام ورود مشکلی پیش آمد. لطفاً دوباره تلاش کنید.',
    },
  },

  pwa: {
    offlineBanner: 'اتصال شما برقرار نیست. تغییرات پس از اتصال همگام‌سازی می‌شوند.',
    backOnline: 'اتصال برقرار شد',
    updateAvailable: 'نسخه‌ی جدیدی در دسترس است.',
    update: 'بروزرسانی',
    dismissUpdate: 'رد کردن بروزرسانی',
    installTitle: 'نصب چت‌بات هوش مصنوعی',
    installDescription: 'برای دسترسی سریع‌تر و پشتیبانی آفلاین، به صفحه‌ی اصلی اضافه کنید.',
    install: 'نصب',
    notNow: 'بعداً',
    installDialogTitle: 'نصب برنامه',
    notificationOpen: 'باز کردن',
    notificationDismiss: 'رد کردن',
    responseReadyTitle: 'پاسخ آماده است',
    responseReadyBody: 'دستیار هوش مصنوعی شما پاسخ داد.',
    pushDefaultTitle: 'چت‌بات هوش مصنوعی',
    pushDefaultBody: 'پیام جدیدی دریافت شد.',
    queueOfflineMessage: 'شما آفلاین هستید. پیامت پس از بازگشت اتصال ارسال خواهد شد.',
    offlinePageTitle: 'اتصال آفلاین',
    offlinePageHeading: 'شما آفلاین هستید',
    offlinePageBody: 'اتصال اینترنتی شناسایی نشد. لطفاً شبکه‌ی خود را بررسی کنید و دوباره تلاش کنید.',
    offlinePageRetry: 'تلاش دوباره',
    offlinePageChecking: 'در حال بررسی اتصال…',
    offlinePageBackOnline: 'اتصال برقرار شد! در حال بارگذاری دوباره…',
    offlinePageStillOffline: 'هنوز آفلاین هستید. در انتظار اتصال…',
  },

  messageScroller: {
    scrollToEnd: 'پیمایش به انتها',
    scrollToStart: 'پیمایش به ابتدا',
  },

  errors: {
    generic: 'مشکلی پیش آمد. لطفاً دوباره تلاش کنید.',
    unauthorized: 'برای ادامه باید وارد حساب خود شوید.',
    loadConversations: 'بارگذاری گفت‌وگوها انجام نشد.',
    createConversation: 'ایجاد گفت‌وگو انجام نشد.',
    deleteConversation: 'حذف گفت‌وگو انجام نشد.',
    renameConversation: 'تغییر نام گفت‌وگو انجام نشد.',
    loadHistory: 'بارگذاری تاریخچه‌ی گفت‌وگو انجام نشد.',
    chatFailed: 'در تولید پاسخ مشکلی پیش آمد. لطفاً دوباره تلاش کنید.',
  },
} as const;
