import { AppShell } from '@/components/layout/app-shell';
import { SWRegistration } from '@/components/pwa/sw-registration';

export default function Page() {
  return (
    <>
      <SWRegistration />
      <AppShell />
    </>
  );
}