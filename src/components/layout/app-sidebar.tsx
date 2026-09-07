'use client';

import { Plus, MessageSquare, MoreHorizontal, Search, Settings } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/layout/user-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Static mock data isolated from real app logic
const MOCK_HISTORY = [
  {
    group: 'Today',
    items: [
      { id: '1', title: 'React 19 Server Components', active: true },
      { id: '2', title: 'Debug PostgreSQL Query', active: false },
    ],
  },
  {
    group: 'Previous 7 Days',
    items: [
      { id: '3', title: 'Tailwind v4 Upgrade Guide', active: false },
      { id: '4', title: 'Pricing Page Copy', active: false },
      { id: '5', title: 'Next.js Middleware Auth', active: false },
    ],
  },
];

export function AppSidebar() {
  return (
    <Sidebar collapsible="offcanvas" className="border-r border-border/50 bg-muted/20">
      <SidebarHeader className="p-4 space-y-2">
        <Button
          variant="outline"
          className="w-full justify-start h-10 px-3 shadow-sm bg-background"
        >
          <Plus className="mr-2 h-4 w-4" />
          <span className="text-sm font-medium">New chat</span>
        </Button>
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search..."
            className="w-full rounded-md border border-border/50 bg-background/50 py-1.5 pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring transition-all"
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {MOCK_HISTORY.map((group) => (
          <SidebarGroup key={group.group}>
            <SidebarGroupLabel className="text-xs font-medium text-muted-foreground/70 mb-1">
              {group.group}
            </SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton isActive={item.active} className="text-sm">
                    <MessageSquare className="h-4 w-4 text-muted-foreground/70" />
                    <span className="truncate">{item.title}</span>
                  </SidebarMenuButton>

                  {/* Overflow menu visible on hover/focus */}
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<SidebarMenuAction />}>
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start">
                      <DropdownMenuItem>Rename</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive">
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border/50">
        <UserMenu />
      </SidebarFooter>
    </Sidebar>
  );
}
