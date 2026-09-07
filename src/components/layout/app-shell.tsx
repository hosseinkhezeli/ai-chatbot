import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { Chat } from '@/components/chat/chat';

export function AppShell() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="relative flex h-svh flex-1 flex-col overflow-hidden bg-background">
        {/* Mobile-only header */}
        <div className="md:hidden flex h-14 shrink-0 items-center border-b bg-background/80 px-4 backdrop-blur-md sticky top-0 z-10">
          <SidebarTrigger className="text-muted-foreground" />
          <span className="ml-3 text-sm font-medium truncate">New Conversation</span>
        </div>

        {/* Desktop-only floating trigger (shows when sidebar is closed) */}
        <div className="hidden md:flex absolute top-3 left-3 z-10">
          <SidebarTrigger className="text-muted-foreground hover:text-foreground bg-background/50 backdrop-blur-md shadow-sm" />
        </div>

        {/* Main chat container */}
        <div className="flex-1 relative overflow-hidden">
          <Chat />
        </div>
      </main>
    </SidebarProvider>
  );
}
