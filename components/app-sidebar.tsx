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
  Wrench,
  Receipt, // Yeni ikon eklendi
  Brain, // AI Dashboard için
  Wheat, // Hasat için
  CloudRain, // Hava durumu için
  Wind, // Rüzgar için
  Thermometer, // Sıcaklık için
  Snowflake, // Don riski için
  AlertTriangle, // Risk uyarıları için
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
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
  WEATHER: "weather",
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
  const { user, logout } = useAuth();

  // Swipe gesture states
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  // Tema değişikliğini işlemek için useEffect
  useEffect(() => {
    setMounted(true);
  }, []);

  // Swipe gesture handlers
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    // Close sidebar on left swipe
    if (isLeftSwipe && open) {
      setOpen(false);
    }
    // Open sidebar on right swipe from left edge
    if (isRightSwipe && !open && touchStart < 30) {
      setOpen(true);
    }
  };

  const toggleSubmenu = (key: string) => {
    setExpanded((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const isActive = (path: string): boolean => {
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
      <Sidebar
        className="border-r border-border bg-card"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <SidebarHeader className="flex items-center justify-between h-14 px-4 border-b">
          <div className="flex items-center">
            <div
              className={cn(
                "font-bold text-lg cursor-pointer transition-all duration-300",
                open ? "ml-2" : "ml-0 scale-90"
              )}
              onClick={() => {
                // Redirect to role-specific dashboard
                if (user?.role) {
                  router.push(`/dashboard/${user.role.toLowerCase()}`);
                } else {
                  // Fallback to generic dashboard if role is not available
                  router.push("/dashboard");
                }
              }}
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(!open)}
            className={cn(
              "border border-green-500 shadow-lg shadow-green-500/50 rounded-sm", // Yeşil neon çerçeve stilini ekle
              !open && "opacity-0 pointer-events-none" // Sidebar kapalıyken gizle
            )}
          >
            <Menu className="h-5 w-5 text-green-400" />{" "}
            {/* İkon rengini de neon yeşili yap */}
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SidebarHeader>
        {/* SidebarNav yerine SidebarContent kullan */}
        <SidebarContent className="flex-1 overflow-y-auto px-2 py-4">
          {/* Ana Grup */}
          <SidebarMenu>
            {" "}
            {/* Wrap in SidebarMenu */}
            <SidebarMenuItem>
              {" "}
              {/* Replace SidebarNavItem */}
              <SidebarMenuButton // Use SidebarMenuButton
                onClick={() => {
                  // Redirect to role-specific dashboard
                  if (user?.role) {
                    router.push(`/dashboard/${user.role.toLowerCase()}`);
                  } else {
                    // Fallback to generic dashboard if role is not available
                    router.push("/dashboard");
                  }
                }}
                isActive={Boolean(
                  isActive("/dashboard") ||
                    (user?.role &&
                      isActive(`/dashboard/${user.role.toLowerCase()}`))
                )}
                tooltip="Ana Sayfa"
              >
                <Home className="h-5 w-5" />
                <span>Ana Sayfa</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              {" "}
              {/* Replace SidebarNavItem */}
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
          </SidebarMenu>{" "}
          {/* Close SidebarMenu */}
          {/* Envanter Grubu - Worker için gösterme */}
          {user?.role && user.role.toLowerCase() !== "worker" && (
            <SidebarMenu>
              {" "}
              {/* Wrap in SidebarMenu */}
              {open && (
                <div className="text-xs font-semibold text-muted-foreground mb-2 px-3">
                  ENVANTER
                </div>
              )}
              <SidebarMenuItem>
                {" "}
                {/* Replace SidebarNavItem */}
                <SidebarMenuButton
                  onClick={() => toggleSubmenu(MENU_GROUPS.INVENTORY)}
                  isActive={isActiveGroup(["/dashboard/owner/inventory"])}
                  data-state={
                    expanded[MENU_GROUPS.INVENTORY] ? "open" : "closed"
                  } // Add data-state for styling
                  tooltip="Envanter"
                >
                  <Package className="h-5 w-5" />
                  <span>Envanter</span>
                  <SidebarMenuAction // Add dropdown arrow
                    asChild
                    className="ml-auto"
                    data-state={
                      expanded[MENU_GROUPS.INVENTORY] ? "open" : "closed"
                    }
                  >
                    <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/menu-button:rotate-90" />
                  </SidebarMenuAction>
                </SidebarMenuButton>
                {expanded[MENU_GROUPS.INVENTORY] && (
                  <SidebarMenuSub>
                    {" "}
                    {/* Use SidebarMenuSub for nested items */}
                    <SidebarMenuSubItem>
                      {" "}
                      {/* Use SidebarMenuSubItem */}
                      <SidebarMenuSubButton // Use SidebarMenuSubButton
                        onClick={() =>
                          router.push("/dashboard/owner/inventory")
                        }
                        isActive={isActive("/dashboard/owner/inventory")}
                      >
                        Envanter Listesi
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        onClick={() =>
                          router.push("/dashboard/owner/inventory/reports")
                        }
                        isActive={isActive(
                          "/dashboard/owner/inventory/reports"
                        )}
                      >
                        Raporlar
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        onClick={() =>
                          router.push("/dashboard/owner/inventory/new")
                        }
                        isActive={isActive("/dashboard/owner/inventory/new")}
                      >
                        Yeni Ekle
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
              <SidebarMenuItem>
                {" "}
                {/* Replace SidebarNavItem */}
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
                  <SidebarMenuSub>
                    {" "}
                    {/* Use SidebarMenuSub */}
                    <SidebarMenuSubItem>
                      {" "}
                      {/* Use SidebarMenuSubItem */}
                      <SidebarMenuSubButton // Use SidebarMenuSubButton
                        onClick={() =>
                          router.push("/dashboard/owner/purchases")
                        }
                        isActive={isActive("/dashboard/owner/purchases")}
                      >
                        Satın Almalar
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        onClick={() =>
                          router.push("/dashboard/owner/purchases/new")
                        }
                        isActive={isActive("/dashboard/owner/purchases/new")}
                      >
                        Yeni Satın Alma
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
            </SidebarMenu>
          )}{" "}
          {/* Close SidebarMenu */}
          {/* Finansal Grup - Worker için gösterme */}
          {user?.role && user.role.toLowerCase() !== "worker" && (
            <SidebarMenu>
              {" "}
              {/* Wrap in SidebarMenu */}
              {open && (
                <div className="text-xs font-semibold text-muted-foreground mb-2 px-3">
                  FİNANSAL
                </div>
              )}
              <SidebarMenuItem>
                {" "}
                {/* Replace SidebarNavItem */}
                <SidebarMenuButton
                  onClick={() => toggleSubmenu(MENU_GROUPS.FINANCIAL)}
                  isActive={isActiveGroup(["/dashboard/owner/debts"])}
                  data-state={
                    expanded[MENU_GROUPS.FINANCIAL] ? "open" : "closed"
                  } // Add data-state
                  tooltip="Borçlar"
                >
                  <DollarSign className="h-5 w-5" />
                  <span>Borçlar</span>
                  <SidebarMenuAction // Add dropdown arrow
                    asChild
                    className="ml-auto"
                    data-state={
                      expanded[MENU_GROUPS.FINANCIAL] ? "open" : "closed"
                    }
                  >
                    <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/menu-button:rotate-90" />
                  </SidebarMenuAction>
                </SidebarMenuButton>
                {expanded[MENU_GROUPS.FINANCIAL] && (
                  <SidebarMenuSub>
                    {" "}
                    {/* Use SidebarMenuSub */}
                    <SidebarMenuSubItem>
                      {" "}
                      {/* Use SidebarMenuSubItem */}
                      <SidebarMenuSubButton // Use SidebarMenuSubButton
                        onClick={() => router.push("/dashboard/owner/debts")}
                        isActive={isActive("/dashboard/owner/debts")}
                      >
                        Borç Listesi
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        onClick={() =>
                          router.push("/dashboard/owner/debts/new")
                        }
                        isActive={isActive("/dashboard/owner/debts/new")}
                      >
                        Yeni Borç
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        onClick={() =>
                          router.push("/dashboard/owner/debts/reminders")
                        }
                        isActive={isActive("/dashboard/owner/debts/reminders")}
                      >
                        Hatırlatmalar
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
              {/* Kuyu Faturaları Menüsü */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => router.push("/dashboard/owner/billing/periods")}
                  isActive={isActive("/dashboard/owner/billing/periods")}
                  tooltip="Kuyu Faturaları"
                >
                  <FileText className="h-5 w-5" />
                  <span>Kuyu Faturaları</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          )}{" "}
          {/* Close SidebarMenu */}
          {/* Çiftlik Grubu */}
          <SidebarMenu>
            {" "}
            {/* Wrap in SidebarMenu */}
            {open && (
              <div className="text-xs font-semibold text-muted-foreground mb-2 px-3">
                ÇİFTLİK
              </div>
            )}
            {/* Tarlalar - Worker için gösterme */}
            {user?.role && user.role.toLowerCase() !== "worker" && (
              <SidebarMenuItem>
                {" "}
                {/* Replace SidebarNavItem */}
                <SidebarMenuButton
                  onClick={() => toggleSubmenu(MENU_GROUPS.FARM)}
                  isActive={isActiveGroup(["/dashboard/owner/fields"])}
                  data-state={expanded[MENU_GROUPS.FARM] ? "open" : "closed"}
                  tooltip="Tarlalar"
                >
                  <Landmark className="h-5 w-5" />
                  <span>Tarlalar</span>
                  <SidebarMenuAction
                    asChild
                    className="ml-auto"
                    data-state={expanded[MENU_GROUPS.FARM] ? "open" : "closed"}
                  >
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
                        onClick={() =>
                          router.push("/dashboard/owner/fields/new")
                        }
                        isActive={isActive("/dashboard/owner/fields/new")}
                      >
                        Yeni Tarla
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
            )}
            {/* Sulama - Tüm roller görebilir */}
            <SidebarMenuItem>
              {" "}
              {/* Replace SidebarNavItem */}
              <SidebarMenuButton
                onClick={() => toggleSubmenu("irrigation")}
                isActive={isActiveGroup([
                  "/dashboard/owner/wells",
                  "/dashboard/owner/irrigation",
                  "/dashboard/worker/irrigation",
                ])}
                data-state={expanded["irrigation"] ? "open" : "closed"}
                tooltip="Sulama"
              >
                <Droplet className="h-5 w-5" />
                <span>Sulama</span>
                <SidebarMenuAction
                  asChild
                  className="ml-auto"
                  data-state={expanded["irrigation"] ? "open" : "closed"}
                >
                  <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/menu-button:rotate-90" />
                </SidebarMenuAction>
              </SidebarMenuButton>
              {expanded["irrigation"] && (
                <SidebarMenuSub>
                  {user?.role && user.role.toLowerCase() !== "worker" && (
                    <>
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
                          onClick={() =>
                            router.push("/dashboard/owner/irrigation")
                          }
                          isActive={isActive("/dashboard/owner/irrigation")}
                        >
                          Sulama Planları
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          onClick={() =>
                            router.push("/dashboard/owner/irrigation/new")
                          }
                          isActive={isActive("/dashboard/owner/irrigation/new")}
                        >
                          Yeni Sulama Planı
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </>
                  )}
                  {user?.role && user.role.toLowerCase() === "worker" && (
                    <>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          onClick={() =>
                            router.push("/dashboard/worker/irrigation")
                          }
                          isActive={isActive("/dashboard/worker/irrigation")}
                        >
                          Sulama Görevlerim
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          onClick={() =>
                            router.push("/dashboard/worker/irrigation/new")
                          }
                          isActive={isActive(
                            "/dashboard/worker/irrigation/new"
                          )}
                        >
                          Yeni Sulama Kaydı
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </>
                  )}
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>

            {/* 🤖 AI Dashboard - Akıllı Sulama Asistanı */}
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => router.push("/dashboard/irrigation-ai")}
                isActive={isActive("/dashboard/irrigation-ai")}
                tooltip="🤖 Akıllı Sulama Asistanı"
              >
                <Brain className="h-5 w-5 text-blue-500" />
                <span className="flex items-center gap-2">
                  🤖 AI Sulama Asistanı
                  <span className="px-1.5 py-0.5 text-xs bg-blue-500 text-white rounded">NEW</span>
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Süreçler - Tüm roller görebilir */}
            <SidebarMenuItem>
              {" "}
              {/* Replace SidebarNavItem */}
              <SidebarMenuButton
                onClick={() => toggleSubmenu("processes")}
                isActive={isActiveGroup([
                  "/dashboard/owner/processes",
                  "/dashboard/worker/processes",
                ])}
                data-state={expanded["processes"] ? "open" : "closed"}
                tooltip="Süreçler"
              >
                <FileText className="h-5 w-5" />
                <span>Süreçler</span>
                <SidebarMenuAction
                  asChild
                  className="ml-auto"
                  data-state={expanded["processes"] ? "open" : "closed"}
                >
                  <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/menu-button:rotate-90" />
                </SidebarMenuAction>
              </SidebarMenuButton>
              {expanded["processes"] && (
                <SidebarMenuSub>
                  {user?.role && user.role.toLowerCase() !== "worker" && (
                    <>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          onClick={() =>
                            router.push("/dashboard/owner/processes")
                          }
                          isActive={isActive("/dashboard/owner/processes")}
                        >
                          Süreç Listesi
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          onClick={() =>
                            router.push("/dashboard/owner/processes/new")
                          }
                          isActive={isActive("/dashboard/owner/processes/new")}
                        >
                          Yeni Süreç
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </>
                  )}
                  {user?.role && user.role.toLowerCase() === "worker" && (
                    <>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          onClick={() =>
                            router.push("/dashboard/worker/processes")
                          }
                          isActive={isActive("/dashboard/worker/processes")}
                        >
                          Görevlerim
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          onClick={() =>
                            router.push("/dashboard/worker/processes/completed")
                          }
                          isActive={isActive(
                            "/dashboard/worker/processes/completed"
                          )}
                        >
                          Tamamlanan Görevler
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </>
                  )}
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>
            <SidebarMenuItem>
              {" "}
              {/* Replace SidebarNavItem */}
              <SidebarMenuButton
                onClick={() => toggleSubmenu("seasons")}
                isActive={isActiveGroup(["/dashboard/owner/seasons"])}
                data-state={expanded["seasons"] ? "open" : "closed"}
                tooltip="Sezonlar"
              >
                <Calendar className="h-5 w-5" />
                <span>Sezonlar</span>
                <SidebarMenuAction
                  asChild
                  className="ml-auto"
                  data-state={expanded["seasons"] ? "open" : "closed"}
                >
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
                      onClick={() =>
                        router.push("/dashboard/owner/seasons/new")
                      }
                      isActive={isActive("/dashboard/owner/seasons/new")}
                    >
                      Yeni Sezon
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>
            {/* Hasat menüsü - Sadece admin ve owner için göster */}
            {user?.role &&
              (user.role.toLowerCase() === "admin" ||
                user.role.toLowerCase() === "owner") && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => toggleSubmenu("harvests")}
                    isActive={isActiveGroup([
                      "/dashboard/owner/harvests",
                      "/dashboard/admin/harvests",
                      "/dashboard/harvests",
                    ])}
                    data-state={expanded["harvests"] ? "open" : "closed"}
                    tooltip="Hasat"
                  >
                    <Wheat className="h-5 w-5" />
                    <span>Hasat</span>
                    <SidebarMenuAction
                      asChild
                      className="ml-auto"
                      data-state={expanded["harvests"] ? "open" : "closed"}
                    >
                      <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/menu-button:rotate-90" />
                    </SidebarMenuAction>
                  </SidebarMenuButton>
                  {expanded["harvests"] && (
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          onClick={() => router.push("/dashboard/harvests")}
                          isActive={isActive("/dashboard/harvests")}
                        >
                          Hasat Kayıtları
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          onClick={() => router.push("/dashboard/harvests/new")}
                          isActive={isActive("/dashboard/harvests/new")}
                        >
                          Yeni Hasat Kaydı
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          onClick={() => router.push("/dashboard/harvests/transfer")}
                          isActive={isActive("/dashboard/harvests/transfer")}
                        >
                          Sezon Aktarımı
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              )}

            {/* 🌦️ Hava Durumu ve Akıllı Risk Yönetimi */}
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => toggleSubmenu("weather")}
                isActive={isActiveGroup([
                  "/dashboard/weather",
                  "/dashboard/owner/weather",
                ])}
                data-state={expanded["weather"] ? "open" : "closed"}
                tooltip="🌦️ Akıllı Hava Durumu"
              >
                <CloudRain className="h-5 w-5 text-blue-500" />
                <span className="flex items-center gap-2">
                  🌦️ Akıllı Hava Durumu
                  <span className="px-1.5 py-0.5 text-xs bg-green-500 text-white rounded">AI</span>
                </span>
                <SidebarMenuAction
                  asChild
                  className="ml-auto"
                  data-state={expanded["weather"] ? "open" : "closed"}
                >
                  <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/menu-button:rotate-90" />
                </SidebarMenuAction>
              </SidebarMenuButton>
              {expanded["weather"] && (
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      onClick={() => router.push("/dashboard/weather")}
                      isActive={isActive("/dashboard/weather")}
                    >
                      <CloudRain className="h-4 w-4" />
                      Dashboard
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      onClick={() => router.push("/dashboard/weather/wind-analysis")}
                      isActive={isActive("/dashboard/weather/wind-analysis")}
                    >
                      <Wind className="h-4 w-4" />
                      Rüzgar Analizi
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      onClick={() => router.push("/dashboard/weather/frost-protection")}
                      isActive={isActive("/dashboard/weather/frost-protection")}
                    >
                      <Snowflake className="h-4 w-4" />
                      Don Koruması
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      onClick={() => router.push("/dashboard/weather/risk-alerts")}
                      isActive={isActive("/dashboard/weather/risk-alerts")}
                    >
                      <AlertTriangle className="h-4 w-4" />
                      Risk Uyarıları
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      onClick={() => router.push("/dashboard/weather/irrigation-advisor")}
                      isActive={isActive("/dashboard/weather/irrigation-advisor")}
                    >
                      <Droplet className="h-4 w-4" />
                      Sulama Danışmanı
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>

            {/* Ekipman menüsü - Sadece admin ve owner için göster */}
            {user?.role &&
              (user.role.toLowerCase() === "admin" ||
                user.role.toLowerCase() === "owner") && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => toggleSubmenu("equipment")}
                    isActive={isActiveGroup([
                      "/dashboard/owner/equipment",
                      "/dashboard/admin/equipment",
                    ])}
                    data-state={expanded["equipment"] ? "open" : "closed"}
                    tooltip="Ekipman"
                  >
                    <Wrench className="h-5 w-5" />
                    <span>Ekipman</span>
                    <SidebarMenuAction
                      asChild
                      className="ml-auto"
                      data-state={expanded["equipment"] ? "open" : "closed"}
                    >
                      <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/menu-button:rotate-90" />
                    </SidebarMenuAction>
                  </SidebarMenuButton>
                  {expanded["equipment"] && (
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          onClick={() =>
                            router.push(
                              `/dashboard/${user.role.toLowerCase()}/equipment`
                            )
                          }
                          isActive={isActive(
                            `/dashboard/${user.role.toLowerCase()}/equipment`
                          )}
                        >
                          Ekipman Listesi
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          onClick={() =>
                            router.push(
                              `/dashboard/${user.role.toLowerCase()}/equipment/new`
                            )
                          }
                          isActive={isActive(
                            `/dashboard/${user.role.toLowerCase()}/equipment/new`
                          )}
                        >
                          Yeni Ekipman
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              )}
          </SidebarMenu>{" "}
          {/* Close SidebarMenu */}
          {/* Raporlar Grubu - Worker için gösterme */}
          {user?.role && user.role.toLowerCase() !== "worker" && (
            <SidebarMenu>
              {" "}
              {/* Wrap in SidebarMenu */}
              {open && (
                <div className="text-xs font-semibold text-muted-foreground mb-2 px-3">
                  RAPORLAR
                </div>
              )}
              <SidebarMenuItem>
                {" "}
                {/* Replace SidebarNavItem */}
                <SidebarMenuButton
                  onClick={() => toggleSubmenu(MENU_GROUPS.REPORTS)}
                  isActive={isActiveGroup(["/dashboard/owner/reports"])}
                  data-state={expanded[MENU_GROUPS.REPORTS] ? "open" : "closed"}
                  tooltip="Raporlar"
                >
                  <BarChart3 className="h-5 w-5" />
                  <span>Raporlar</span>
                  <SidebarMenuAction
                    asChild
                    className="ml-auto"
                    data-state={
                      expanded[MENU_GROUPS.REPORTS] ? "open" : "closed"
                    }
                  >
                    <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/menu-button:rotate-90" />
                  </SidebarMenuAction>
                </SidebarMenuButton>
                {expanded[MENU_GROUPS.REPORTS] && (
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        onClick={() =>
                          router.push("/dashboard/owner/reports/financial")
                        }
                        isActive={isActive(
                          "/dashboard/owner/reports/financial"
                        )}
                      >
                        Finansal Raporlar
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        onClick={() => router.push("/dashboard/owner/reports")}
                        isActive={isActive("/dashboard/owner/reports")}
                      >
                        Aktivite Raporları
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
            </SidebarMenu>
          )}{" "}
          {/* Close SidebarMenu */}
          {/* Yönetim Grubu */}
          <SidebarMenu>
            {" "}
            {/* Wrap in SidebarMenu */}
            {open && (
              <div className="text-xs font-semibold text-muted-foreground mb-2 px-3">
                YÖNETİM
              </div>
            )}
            {/* Kullanıcılar - Sadece admin görebilir */}
            {user?.role && user.role.toLowerCase() === "admin" && (
              <SidebarMenuItem>
                {" "}
                {/* Replace SidebarNavItem */}
                <SidebarMenuButton
                  onClick={() => toggleSubmenu(MENU_GROUPS.ADMIN)}
                  isActive={isActiveGroup(["/dashboard/admin/users"])}
                  data-state={expanded[MENU_GROUPS.ADMIN] ? "open" : "closed"}
                  tooltip="Kullanıcılar"
                >
                  <Users className="h-5 w-5" />
                  <span>Kullanıcılar</span>
                  <SidebarMenuAction
                    asChild
                    className="ml-auto"
                    data-state={expanded[MENU_GROUPS.ADMIN] ? "open" : "closed"}
                  >
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
            )}
            {/* Ayarlar - Tüm roller görebilir */}
            <SidebarMenuItem>
              {" "}
              {/* Replace SidebarNavItem */}
              <SidebarMenuButton
                onClick={() => router.push("/dashboard/settings")}
                isActive={isActive("/dashboard/settings")}
                tooltip="Ayarlar"
              >
                <Settings className="h-5 w-5" />
                <span>Ayarlar</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>{" "}
          {/* Close SidebarMenu */}
        </SidebarContent>{" "}
        {/* SidebarNav yerine SidebarContent kullan */}
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
                    <Button variant="ghost" size="icon" onClick={logout}>
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
                  <DropdownMenuItem onClick={logout}>
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
