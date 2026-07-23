import React from "react";
import { Bell, Search, HelpCircle } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
      <Separator orientation="vertical" className="h-5" />
      <div className="relative hidden max-w-md flex-1 md:block">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search users, robots, logs…"
          className="h-9 border-border bg-surface pl-8 text-sm shadow-none focus-visible:ring-1"
        />
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
          <HelpCircle className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 text-muted-foreground">
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-destructive" />
        </Button>
        <Separator orientation="vertical" className="mx-1 h-5" />
        <div className="flex items-center gap-2.5 pl-1">
          <div className="hidden text-right leading-tight sm:block">
            <div className="text-xs font-medium">Anika Rao</div>
            <div className="text-[11px] text-muted-foreground">Administrator</div>
          </div>
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-xs font-medium text-primary-foreground">
              AR
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
