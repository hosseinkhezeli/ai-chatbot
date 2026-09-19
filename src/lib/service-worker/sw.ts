import { registerActivate } from './handlers/activate';
import { registerFetch } from './handlers/fetch';
import { registerInstall } from './handlers/install';
import { registerMessage } from './handlers/message';
import { registerNotificationClick } from './handlers/notification-click';
import { registerPush } from './handlers/push';
import { registerSync } from './handlers/sync';

registerInstall();
registerActivate();
registerFetch();
registerSync();
registerPush();
registerNotificationClick();
registerMessage();