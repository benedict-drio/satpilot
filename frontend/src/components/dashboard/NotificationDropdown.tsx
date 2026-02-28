import { useState } from "react";
import { Bell, CircleDot, AlertTriangle, RotateCcw, Info, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { mockNotifications, type NotificationType } from "@/data/mockNotifications";
import { cn } from "@/lib/utils";

const typeConfig: Record<NotificationType, { icon: typeof Bell; className: string }> = {
  payment: { icon: CircleDot, className: "text-green-500" },
  warning: { icon: AlertTriangle, className: "text-yellow-500" },
  refund: { icon: RotateCcw, className: "text-red-500" },
  info: { icon: Info, className: "text-blue-500" },
  system: { icon: Server, className: "text-muted-foreground" },
};

export function NotificationDropdown() {
  const [notifications, setNotifications] = useState(mockNotifications);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative w-9 h-9" aria-label="Notifications">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h4 className="text-sm font-semibold text-foreground">Notifications</h4>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-primary hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">No notifications</p>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notif) => {
                const config = typeConfig[notif.type];
                const Icon = config.icon;
                return (
                    <button
                      key={notif.id}
                      type="button"
                      onClick={() => !notif.read && markAsRead(notif.id)}
                      className={cn(
                        "flex gap-3 px-4 py-3 transition-colors w-full text-left",
                        !notif.read && "bg-accent/50 cursor-pointer"
                    )}
                      aria-label={`${notif.read ? "" : "Unread: "}${notif.title}`}
                  >
                    <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", config.className)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground leading-tight">
                        {notif.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {notif.description}
                      </p>
                    </div>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap mt-0.5">
                      {notif.time}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
