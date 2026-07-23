import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  ScanFace,
  ScrollText,
  ShieldAlert,
  Bot,
  BarChart3,
  Settings,
  ShieldCheck,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const overview = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Live authentication", url: "/authenticate", icon: ScanFace },
];

const access = [
  { title: "Enrolled users", url: "/users", icon: Users },
  { title: "New enrollment", url: "/enroll", icon: UserPlus },
  { title: "Robot fleet", url: "/robots", icon: Bot },
];

const security = [
  { title: "Authentication logs", url: "/logs", icon: ScrollText },
  { title: "Alerts", url: "/alerts", icon: ShieldAlert },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
];

const system = [{ title: "Settings", url: "/settings", icon: Settings }];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const pathname = location.pathname;
  const isActive = (u) => (u === "/" ? pathname === "/" : pathname.startsWith(u));

  const renderGroup = (label, items) => (
    <SidebarGroup>
      {!collapsed && (
        <SidebarGroupLabel className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.url)}
                tooltip={item.title}
                className="data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:font-medium"
              >
                <Link to={item.url}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
            <ShieldCheck className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold tracking-tight">AVAR</div>
              <div className="truncate text-[11px] text-muted-foreground">
                Robotic Authentication
              </div>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        {renderGroup("Overview", overview)}
        {renderGroup("Access", access)}
        {renderGroup("Security", security)}
        {renderGroup("System", system)}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed && (
          <div className="px-2 py-1.5 text-[11px] leading-relaxed text-muted-foreground">
            <div className="font-medium text-foreground">System status</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              All services operational
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
