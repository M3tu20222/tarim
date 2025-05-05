"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Calendar,
  ChevronRight,
  Home,
  Menu,
  Package,
  Settings,
  ShoppingCart,
  Users,
  DollarSign,
  Droplet,
  Landmark,
  FileText,
  BarChart3,
  Sun,
  Moon,
  Computer,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// ui/sidebar'dan doğru bileşenleri import et
import {
  Sidebar,
  SidebarContent, // SidebarNav yerine
  SidebarFooter,
  SidebarHeader,
  SidebarMenu, // Menü listesi için
  SidebarMenuItem, // SidebarNavItem yerine (li etiketi)
  SidebarMenuButton, // Tıklanabilir menü öğesi için
  SidebarMenuSub, // Alt menü listesi için
  SidebarMenuSubItem, // Alt menü öğesi için (li etiketi)
  SidebarMenuSubButton, // Tıklanabilir alt menü öğesi için
  SidebarMenuAction, // Menü öğesi eylemleri için (örn. açılır ok)
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSidebar } from "@/components/ui/sidebar";
import { useTheme } from "next-themes";
import { NotificationCounter } from "./notifications/notification-counter";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Sidebar menü grupları
const MENU_GROUPS = {
  MAIN: "main",
  INVENTORY: "inventory",
  FINANCIAL: "financial",
  FARM: "farm",
  REPORTS: "reports",
  ADMIN: "admin",
};

export function AppSidebar() {
  const { open, setOpen } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Tema değişikliğini işlemek için useEffect
  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleSubmenu = (key: string) => {
    setExpanded((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const isActive = (path: string) => {
    return pathname === path;
  };

  const isActiveGroup = (paths: string[]) => {
    return paths.some((path) => pathname.startsWith(path));
  };

  const logoText = open ? "Çiftlik Yönetimi" : "ÇY";

  // Tema değiştirme simgesi
  const ThemeIcon = () => {
    if (!mounted) return null;

    if (theme === "dark") return <Moon className="h-4 w-4" />;
    if (theme === "light") return <Sun className="h-4 w-4" />;
    return <Computer className="h-4 w-4" />;
  };

  return (
    <TooltipProvider>
      <Sidebar className="border-r border-border bg-card">
        <SidebarHeader className="flex items-center justify-between h-14 px-4 border-b">
          <div className="flex items-center">
            <div
              className={cn(
                "font-bold text-lg cursor-pointer transition-all duration-300",
                open ? "ml-2" : "ml-0 scale-90"
              )}
              onClick={() => router.push("/dashboard")}
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">🚜</span>
                <span
                  className={cn(
                    open ? "opacity-100" : "opacity-0 w-0",
                    "transition-all duration-300 overflow-hidden"
                  )}
                >
                  {logoText}
                </span>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setOpen(!open)}>
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SidebarHeader>

        {/* SidebarNav yerine SidebarContent kullan */}
        <SidebarContent className="flex-1 overflow-y-auto px-2 py-4">
          {/* Ana Grup */}
          <SidebarMenu> {/* Wrap in SidebarMenu */}
            <SidebarMenuItem> {/* Replace SidebarNavItem */}
              <SidebarMenuButton // Use SidebarMenuButton
                onClick={() => router.push("/dashboard")} // Use onClick for navigation
                isActive={isActive("/dashboard")}
                tooltip="Ana Sayfa"
              >
                <Home className="h-5 w-5" />
                <span>Ana Sayfa</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem> {/* Replace SidebarNavItem */}
              <SidebarMenuButton // Use SidebarMenuButton
                onClick={() => router.push("/dashboard/notifications")} // Use onClick for navigation
                isActive={isActive("/dashboard/notifications")}
                tooltip="Bildirimler"
              >
                <div className="relative">
                  <Bell className="h-5 w-5" />
                  <NotificationCounter />
                </div>
                <span>Bildirimler</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu> {/* Close SidebarMenu */}

          {/* Envanter Grubu */}
          <SidebarMenu> {/* Wrap in SidebarMenu */}
            {open && (
              <div className="text-xs font-semibold text-muted-foreground mb-2 px-3">
                ENVANTER
              </div>
            )}

            <SidebarMenuItem> {/* Replace SidebarNavItem */}
              <SidebarMenuButton
                onClick={() => toggleSubmenu(MENU_GROUPS.INVENTORY)}
                isActive={isActiveGroup(["/dashboard/owner/inventory"])}
                data-state={expanded[MENU_GROUPS.INVENTORY] ? "open" : "closed"} // Add data-state for styling
                tooltip="Envanter"
              >
                <Package className="h-5 w-5" />
                <span>Envanter</span>
                <SidebarMenuAction // Add dropdown arrow
                  asChild
                  className="ml-auto"
                  data-state={expanded[MENU_GROUPS.INVENTORY] ? "open" : "closed"}
                >
                  <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/menu-button:rotate-90" />
                </SidebarMenuAction>
              </SidebarMenuButton>
              {expanded[MENU_GROUPS.INVENTORY] && (
                <SidebarMenuSub> {/* Use SidebarMenuSub for nested items */}
                  <SidebarMenuSubItem> {/* Use SidebarMenuSubItem */}
                    <SidebarMenuSubButton // Use SidebarMenuSubButton
                      onClick={() => router.push("/dashboard/owner/inventory")}
                      isActive={isActive("/dashboard/owner/inventory")}
                    >
                      Envanter Listesi
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      onClick={() => router.push("/dashboard/owner/inventory/reports")}
                      isActive={isActive("/dashboard/owner/inventory/reports")}
                    >
                      Raporlar
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      onClick={() => router.push("/dashboard/owner/inventory/new")}
                      isActive={isActive("/dashboard/owner/inventory/new")}
                    >
                      Yeni Ekle
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>

            <SidebarMenuItem> {/* Replace SidebarNavItem */}
              <SidebarMenuButton
                onClick={() => toggleSubmenu("purchases")}
                isActive={isActiveGroup(["/dashboard/owner/purchases"])}
                data-state={expanded["purchases"] ? "open" : "closed"} // Add data-state
                tooltip="Satın Alma"
              >
                <ShoppingCart className="h-5 w-5" />
                <span>Satın Alma</span>
                <SidebarMenuAction // Add dropdown arrow
                  asChild
                  className="ml-auto"
                  data-state={expanded["purchases"] ? "open" : "closed"}
                >
                  <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/menu-button:rotate-90" />
                </SidebarMenuAction>
              </SidebarMenuButton>
              {expanded["purchases"] && (
                <SidebarMenuSub> {/* Use SidebarMenuSub */}
                  <SidebarMenuSubItem> {/* Use SidebarMenuSubItem */}
                    <SidebarMenuSubButton // Use SidebarMenuSubButton
                      onClick={() => router.push("/dashboard/owner/purchases")}
                      isActive={isActive("/dashboard/owner/purchases")}
                    >
                      Satın Almalar
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      onClick={() => router.push("/dashboard/owner/purchases/new")}
                      isActive={isActive("/dashboard/owner/purchases/new")}
                    >
                      Yeni Satın Alma
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>
          </SidebarMenu> {/* Close SidebarMenu */}

          {/* Finansal Grup */}
          <SidebarMenu> {/* Wrap in SidebarMenu */}
            {open && (
              <div className="text-xs font-semibold text-muted-foreground mb-2 px-3">
                FİNANSAL
              </div>
            )}

            <SidebarMenuItem> {/* Replace SidebarNavItem */}
              <SidebarMenuButton
                onClick={() => toggleSubmenu(MENU_GROUPS.FINANCIAL)}
                isActive={isActiveGroup(["/dashboard/owner/debts"])}
                data-state={expanded[MENU_GROUPS.FINANCIAL] ? "open" : "closed"} // Add data-state
                tooltip="Borçlar"
              >
                <DollarSign className="h-5 w-5" />
                <span>Borçlar</span>
                <SidebarMenuAction // Add dropdown arrow
                  asChild
                  className="ml-auto"
                  data-state={expanded[MENU_GROUPS.FINANCIAL] ? "open" : "closed"}
                >
                  <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/menu-button:rotate-90" />
                </SidebarMenuAction>
              </SidebarMenuButton>
              {expanded[MENU_GROUPS.FINANCIAL] && (
                <SidebarMenuSub> {/* Use SidebarMenuSub */}
                  <SidebarMenuSubItem> {/* Use SidebarMenuSubItem */}
                    <SidebarMenuSubButton // Use SidebarMenuSubButton
                      onClick={() => router.push("/dashboard/owner/debts")}
                      isActive={isActive("/dashboard/owner/debts")}
                    >
                      Borç Listesi
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      onClick={() => router.push("/dashboard/owner/debts/new")}
                      isActive={isActive("/dashboard/owner/debts/new")}
                    >
                      Yeni Borç
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      onClick={() => router.push("/dashboard/owner/debts/reminders")}
                      isActive={isActive("/dashboard/owner/debts/reminders")}
                    >
                      Hatırlatmalar
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>
          </SidebarMenu> {/* Close SidebarMenu */}

          {/* Çiftlik Grubu */}
          <SidebarMenu> {/* Wrap in SidebarMenu */}
            {open && (
              <div className="text-xs font-semibold text-muted-foreground mb-2 px-3">
                ÇİFTLİK
              </div>
            )}

            <SidebarMenuItem> {/* Replace SidebarNavItem */}
              <SidebarMenuButton
                onClick={() => toggleSubmenu(MENU_GROUPS.FARM)}
                isActive={isActiveGroup(["/dashboard/owner/fields"])}
                data-state={expanded[MENU_GROUPS.FARM] ? "open" : "closed"}
                tooltip="Tarlalar"
              >
                <Landmark className="h-5 w-5" />
                <span>Tarlalar</span>
                <SidebarMenuAction asChild className="ml-auto" data-state={expanded[MENU_GROUPS.FARM] ? "open" : "closed"}>
                  <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/menu-button:rotate-90" />
                </SidebarMenuAction>
              </SidebarMenuButton>
              {expanded[MENU_GROUPS.FARM] && (
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      onClick={() => router.push("/dashboard/owner/fields")}
                      isActive={isActive("/dashboard/owner/fields")}
                    >
                      Tarla Listesi
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      onClick={() => router.push("/dashboard/owner/fields/new")}
                      isActive={isActive("/dashboard/owner/fields/new")}
                    >
                      Yeni Tarla
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>

            <SidebarMenuItem> {/* Replace SidebarNavItem */}
              <SidebarMenuButton
                onClick={() => toggleSubmenu("irrigation")}
                isActive={isActiveGroup(["/dashboard/owner/wells", "/dashboard/owner/irrigation"])}
                data-state={expanded["irrigation"] ? "open" : "closed"}
                tooltip="Sulama"
              >
                <Droplet className="h-5 w-5" />
                <span>Sulama</span>
                <SidebarMenuAction asChild className="ml-auto" data-state={expanded["irrigation"] ? "open" : "closed"}>
                  <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/menu-button:rotate-90" />
                </SidebarMenuAction>
              </SidebarMenuButton>
              {expanded["irrigation"] && (
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      onClick={() => router.push("/dashboard/owner/wells")}
                      isActive={isActive("/dashboard/owner/wells")}
                    >
                      Kuyular
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      onClick={() => router.push("/dashboard/owner/irrigation")}
                      isActive={isActive("/dashboard/owner/irrigation")}
                    >
                      Sulama Planları
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      onClick={() => router.push("/dashboard/owner/irrigation/new")}
                      isActive={isActive("/dashboard/owner/irrigation/new")}
                    >
                      Yeni Sulama Planı
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>

            <SidebarMenuItem> {/* Replace SidebarNavItem */}
              <SidebarMenuButton
                onClick={() => toggleSubmenu("processes")}
                isActive={isActiveGroup(["/dashboard/owner/processes"])}
                data-state={expanded["processes"] ? "open" : "closed"}
                tooltip="Süreçler"
              >
                <FileText className="h-5 w-5" />
                <span>Süreçler</span>
                <SidebarMenuAction asChild className="ml-auto" data-state={expanded["processes"] ? "open" : "closed"}>
                  <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/menu-button:rotate-90" />
                </SidebarMenuAction>
              </SidebarMenuButton>
              {expanded["processes"] && (
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      onClick={() => router.push("/dashboard/owner/processes")}
                      isActive={isActive("/dashboard/owner/processes")}
                    >
                      Süreç Listesi
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      onClick={() => router.push("/dashboard/owner/processes/new")}
                      isActive={isActive("/dashboard/owner/processes/new")}
                    >
                      Yeni Süreç
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>

            <SidebarMenuItem> {/* Replace SidebarNavItem */}
              <SidebarMenuButton
                onClick={() => toggleSubmenu("seasons")}
                isActive={isActiveGroup(["/dashboard/owner/seasons"])}
                data-state={expanded["seasons"] ? "open" : "closed"}
                tooltip="Sezonlar"
              >
                <Calendar className="h-5 w-5" />
                <span>Sezonlar</span>
                <SidebarMenuAction asChild className="ml-auto" data-state={expanded["seasons"] ? "open" : "closed"}>
                  <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/menu-button:rotate-90" />
                </SidebarMenuAction>
              </SidebarMenuButton>
              {expanded["seasons"] && (
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      onClick={() => router.push("/dashboard/owner/seasons")}
                      isActive={isActive("/dashboard/owner/seasons")}
                    >
                      Sezon Listesi
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      onClick={() => router.push("/dashboard/owner/seasons/new")}
                      isActive={isActive("/dashboard/owner/seasons/new")}
                    >
                      Yeni Sezon
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>
          </SidebarMenu> {/* Close SidebarMenu */}

          {/* Raporlar Grubu */}
          <SidebarMenu> {/* Wrap in SidebarMenu */}
            {open && (
              <div className="text-xs font-semibold text-muted-foreground mb-2 px-3">
                RAPORLAR
              </div>
            )}

            <SidebarMenuItem> {/* Replace SidebarNavItem */}
              <SidebarMenuButton
                onClick={() => toggleSubmenu(MENU_GROUPS.REPORTS)}
                isActive={isActiveGroup(["/dashboard/owner/reports"])}
                data-state={expanded[MENU_GROUPS.REPORTS] ? "open" : "closed"}
                tooltip="Raporlar"
              >
                <BarChart3 className="h-5 w-5" />
                <span>Raporlar</span>
                <SidebarMenuAction asChild className="ml-auto" data-state={expanded[MENU_GROUPS.REPORTS] ? "open" : "closed"}>
                  <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/menu-button:rotate-90" />
                </SidebarMenuAction>
              </SidebarMenuButton>
              {expanded[MENU_GROUPS.REPORTS] && (
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      onClick={() => router.push("/dashboard/owner/reports/financial")}
                      isActive={isActive("/dashboard/owner/reports/financial")}
                    >
                      Finansal Raporlar
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      onClick={() => router.push("/dashboard/owner/reports/activity")}
                      isActive={isActive("/dashboard/owner/reports/activity")}
                    >
                      Aktivite Raporları
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>
          </SidebarMenu> {/* Close SidebarMenu */}

          {/* Yönetim Grubu */}
          <SidebarMenu> {/* Wrap in SidebarMenu */}
            {open && (
              <div className="text-xs font-semibold text-muted-foreground mb-2 px-3">
                YÖNETİM
              </div>
            )}

            <SidebarMenuItem> {/* Replace SidebarNavItem */}
              <SidebarMenuButton
                onClick={() => toggleSubmenu(MENU_GROUPS.ADMIN)}
                isActive={isActiveGroup(["/dashboard/admin/users"])}
                data-state={expanded[MENU_GROUPS.ADMIN] ? "open" : "closed"}
                tooltip="Kullanıcılar"
              >
                <Users className="h-5 w-5" />
                <span>Kullanıcılar</span>
                <SidebarMenuAction asChild className="ml-auto" data-state={expanded[MENU_GROUPS.ADMIN] ? "open" : "closed"}>
                  <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/menu-button:rotate-90" />
                </SidebarMenuAction>
              </SidebarMenuButton>
              {expanded[MENU_GROUPS.ADMIN] && (
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      onClick={() => router.push("/dashboard/admin/users")}
                      isActive={isActive("/dashboard/admin/users")}
                    >
                      Kullanıcı Yönetimi
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>

            <SidebarMenuItem> {/* Replace SidebarNavItem */}
              <SidebarMenuButton
                onClick={() => router.push("/dashboard/settings")}
                isActive={isActive("/dashboard/settings")}
                tooltip="Ayarlar"
              >
                <Settings className="h-5 w-5" />
                <span>Ayarlar</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu> {/* Close SidebarMenu */}
        </SidebarContent> {/* SidebarNav yerine SidebarContent kullan */}

        <SidebarFooter className="flex items-center justify-between p-4 border-t">
          <div className="flex items-center gap-2">
            <Avatar className="h-9 w-9 border-2 border-primary/10">
              <AvatarImage src="/placeholder.svg" alt="avatar" />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            {open && (
              <div className="flex flex-col text-sm">
                <span className="font-medium">Kullanıcı</span>
                <span className="text-xs text-muted-foreground">
                  Çiftlik Sahibi
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {!open ? (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setTheme(theme === "dark" ? "light" : "dark")
                      }
                    >
                      <ThemeIcon />
                      <span className="sr-only">Tema Değiştir</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Tema Değiştir</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push("/auth/logout")}
                    >
                      <LogOut className="h-4 w-4" />
                      <span className="sr-only">Çıkış Yap</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Çıkış Yap</p>
                  </TooltipContent>
                </Tooltip>
              </>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Settings className="h-4 w-4" />
                    <span className="sr-only">Ayarlar</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Tema</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setTheme("light")}>
                    <Sun className="h-4 w-4 mr-2" /> Açık
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("dark")}>
                    <Moon className="h-4 w-4 mr-2" /> Koyu
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("system")}>
                    <Computer className="h-4 w-4 mr-2" /> Sistem
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/auth/logout")}>
                    <LogOut className="h-4 w-4 mr-2" /> Çıkış Yap
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  );
}
