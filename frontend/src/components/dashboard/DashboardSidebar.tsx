import {
  LayoutDashboard,
  FileText,
  CreditCard,
  RotateCcw,
  Bot,
  Settings,
  ShieldCheck,
  Zap,
  WalletCards,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { invoices } from "@/data/mockDashboard";
import { useWallet, REQUIRED_NETWORK } from "@/contexts/WalletContext";
import { useContractConfig } from "@/hooks/useContract";
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
  SidebarSeparator,
} from "@/components/ui/sidebar";

const pendingCount = invoices.filter((i) => i.status === "pending").length;

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, end: true },
  { title: "Invoices", url: "/dashboard/invoices", icon: FileText, badge: pendingCount },
  { title: "Payments", url: "/dashboard/payments", icon: CreditCard },
  { title: "Refunds", url: "/dashboard/refunds", icon: RotateCcw },
  { title: "Agents", url: "/dashboard/agents", icon: Bot },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];

export function DashboardSidebar() {
  const { isConnected, address } = useWallet();
  const { data: config } = useContractConfig();
  const isOwner = !!address && !!config && address === config.owner;
  const items = isOwner
    ? [...navItems, { title: "Admin", url: "/dashboard/admin", icon: ShieldCheck }]
    : navItems;
  return (
    <Sidebar collapsible="icon" className="hidden md:flex">
      <SidebarHeader className="h-14 justify-center px-4 py-0">
        <NavLink to="/" className="flex items-center gap-2" aria-label="Satpilot home">
          <div className="w-8 h-8 rounded-lg gradient-bitcoin flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-lg text-foreground group-data-[collapsible=icon]:hidden">
            Satpilot
          </span>
        </NavLink>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={"end" in item ? item.end : undefined}
                      className="flex items-center gap-2"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span className="group-data-[collapsible=icon]:hidden flex-1">{item.title}</span>
                      {"badge" in item && item.badge ? (
                        <span className="group-data-[collapsible=icon]:hidden ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">
                          {item.badge}
                        </span>
                      ) : null}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        {isConnected ? (
          <div className="flex items-center gap-2.5 rounded-lg border border-sidebar-border bg-sidebar-accent/40 px-2 py-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent">
            <span className="h-2 w-2 shrink-0 rounded-full bg-success" />
            <span className="text-xs font-medium text-muted-foreground group-data-[collapsible=icon]:hidden">
              {REQUIRED_NETWORK === "mainnet" ? "Stacks Mainnet" : "Stacks Testnet"}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted border border-border group-data-[collapsible=icon]:justify-center">
            <WalletCards className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-xs font-medium text-muted-foreground group-data-[collapsible=icon]:hidden">
              No Wallet
            </span>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
