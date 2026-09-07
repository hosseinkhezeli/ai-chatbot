import { db } from '@/db/client';
import { accounts } from '@/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const result = await db
    .insert(accounts)
    .values({
      userId: 'cc6903fc-f2d9-4bf9-8290-e8410589e4c5',
      type: 'oauth',
      provider: 'github',
      providerAccountId: '123948444',
      refresh_token: 'TEST_REFRESH_TOKEN',
      access_token: 'TEST_ACCESS_TOKEN',
      expires_at: 1788818220,
      token_type: 'bearer',
      scope: 'read:user,user:email',
    })
    .returning();

  console.log(result);

  await db.delete(accounts).where(eq(accounts.userId, 'cc6903fc-f2d9-4bf9-8290-e8410589e4c5'));

  console.log('PASSED');
}

main().catch((error) => {
  console.error('FAILED');
  console.error(error);
  process.exit(1);
});
