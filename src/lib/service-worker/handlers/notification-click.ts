const sw = self as unknown as ServiceWorkerGlobalScope;

export function registerNotificationClick(): void {
  sw.addEventListener('notificationclick', (event: NotificationEvent) => {
    event.notification.close();

    if (event.action === 'dismiss') {
      return;
    }

    const url = event.notification.data?.url || '/';

    event.waitUntil(
      (async () => {
        const clients = await sw.clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        });

        for (const client of clients) {
          if (client.url === url && 'focus' in client) {
            await client.focus();
            return;
          }
        }

        if (sw.clients.openWindow) {
          await sw.clients.openWindow(url);
        }
      })(),
    );
  });
}