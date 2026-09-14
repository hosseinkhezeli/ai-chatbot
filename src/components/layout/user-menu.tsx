'use client';

import { ChevronsUpDown, LogOut, Settings, Sparkles } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

interface UserIdentityProps {
  name: string;
  email?: string | null;
  image?: string | null;
  showEmail?: boolean;
}

function UserIdentity({ name, email, image, showEmail = true }: UserIdentityProps) {
  const initials = getInitials(name);

  return (
    <>
      <Avatar className="h-8 w-8 rounded-lg">
        <AvatarImage src={image ?? undefined} alt={name} />

        <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-medium">{name}</span>

        {showEmail ? (
          <span className="truncate text-xs text-muted-foreground">{email ?? 'No email'}</span>
        ) : (
          <span className="truncate text-xs text-muted-foreground">Pro Plan</span>
        )}
      </div>
    </>
  );
}

export function UserMenu() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled className="opacity-70">
            <div className="size-8 animate-pulse rounded-lg bg-muted" />

            <div className="grid flex-1 gap-1.5 text-left">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-3 w-16 animate-pulse rounded bg-muted" />
            </div>

            <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  const user = session?.user;
  const userName = user?.name?.trim() || 'User';

  async function handleSignOut() {
    await signOut({
      callbackUrl: '/',
    });
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              />
            }
          >
            <UserIdentity name={userName} image={user?.image} email={user?.email} />

            <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-56 rounded-xl" align="end" side="right" sideOffset={8}>
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <UserIdentity name={userName} email={user?.email} image={user?.image} showEmail />
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            {/* <DropdownMenuGroup>
              <DropdownMenuItem>
                <Sparkles className="mr-2 h-4 w-4" />
                Upgrade to Pro
              </DropdownMenuItem>
            </DropdownMenuGroup> */}

            {/* <DropdownMenuSeparator /> */}

            {/* <DropdownMenuGroup>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
            </DropdownMenuGroup> */}

            {/* <DropdownMenuSeparator /> */}

            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
