export const STATIC_CACHE = 'ai-chatbot-static-v2';

export const NAVIGATION_CACHE = 'ai-chatbot-navigation-v1';

export const OFFLINE_URL = '/offline.html';

export const CACHE_PREFIX = 'ai-chatbot-';

export const PRECACHE_ASSETS = [
  OFFLINE_URL,
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/badge-72.png',
] as const;

export const STATIC_PATTERNS = [
  /\/fonts\//,
  /\/icons\//,
  /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf|eot)$/,
  /\.(?:js|css)$/,
] as const;

export const API_PATTERNS = [/^\/api\//] as const;

export const TRUSTED_EXTERNAL_ORIGINS = new Set([
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
]);

export const SYNC_TAG = 'chat-sync';

export const OFFLINE_DB_NAME = 'ai-chatbot-offline';

export const OFFLINE_DB_VERSION = 1;

export const OUTBOX_STORE = 'messages';