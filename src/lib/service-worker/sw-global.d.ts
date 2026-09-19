/// <reference lib="webworker" />

/**
 * Extended Service Worker global scope types
 * These augment the standard webworker lib with missing SW-specific types
 */

interface ExtendableEvent extends Event {
  waitUntil(f: Promise<unknown>): void;
}

interface ExtendableMessageEvent extends ExtendableEvent {
  readonly data: unknown;
  readonly origin: string;
  readonly lastEventId: string;
  readonly source: Client | MessagePort | null;
  readonly ports: readonly MessagePort[];
}

interface FetchEvent extends ExtendableEvent {
  readonly request: Request;
  readonly clientId: string;
  readonly resultingClientId: string;
  readonly replacesClientId: string;
  readonly handled: Promise<void>;
  readonly preloadResponse: Promise<Response | undefined>;
  respondWith(r: Response | Promise<Response>): void;
}

interface PushEvent extends ExtendableEvent {
  readonly data: PushMessageData | null;
}

interface PushMessageData {
  arrayBuffer(): ArrayBuffer;
  blob(): Blob;
  json(): unknown;
  text(): string;
}

interface SyncEvent extends ExtendableEvent {
  readonly tag: string;
  readonly lastChance: boolean;
}

interface NotificationEvent extends ExtendableEvent {
  readonly action: string;
  readonly notification: Notification;
}

interface ServiceWorkerGlobalScope extends WorkerGlobalScope {
  readonly clients: Clients;
  readonly registration: ServiceWorkerRegistration;
  readonly caches: CacheStorage;
  readonly indexedDB: IDBFactory;
  readonly crypto: Crypto;
  skipWaiting(): Promise<void>;
  addEventListener(
    type: 'install',
    listener: (event: ExtendableEvent) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: 'activate',
    listener: (event: ExtendableEvent) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: 'fetch',
    listener: (event: FetchEvent) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: 'message',
    listener: (event: ExtendableMessageEvent) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: 'push',
    listener: (event: PushEvent) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: 'notificationclick',
    listener: (event: NotificationEvent) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: 'sync',
    listener: (event: SyncEvent) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
}

declare const self: ServiceWorkerGlobalScope;