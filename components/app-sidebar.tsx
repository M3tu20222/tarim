"use client";
import Link from "next/link";
import type React from "react";

import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
// Sheet ve SheetTitle'ı import'lardan KALDIRIN:
// import { SheetTitle } from "@/components/ui/sheet";
import {
  HomeIcon,
  UsersIcon,
  ShieldIcon,
  SettingsIcon,
  LayersIcon,
  BoxIcon,
  FileTextIcon,
  BellIcon,
  MapIcon,
  DropletIcon,
  TractorIcon,
  UserIcon,
  LogOutIcon,
  ChevronDownIcon,
  CreditCard,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/auth-provider";
// Dialog bileşenlerini import edin:
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface LinkItem {
  href: string;
  label: string;
  icon: React.ForwardRefExoticComponent<
    React.PropsWithoutRef<React.SVGProps<SVGSVGElement>> &
      React.RefAttributes<SVGSVGElement>
  >;
  badge?: string; // İsteğe bağlı badge özelliği
}

export function AppSidebar() {
  const pathname = usePathname();
  const { state, isMobile, openMobile, setOpenMobile } = useSidebar(); // isMobile, openMobile, setOpenMobile ekleyin
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const adminLinks: LinkItem[] = [
    // Türü belirtiyoruz
    { href: "/dashboard/admin", label: "Genel Bakış", icon: HomeIcon },
    {
      href: "/dashboard/admin/users",
      label: "Kullanıcı Yönetimi",
      icon: UsersIcon,
    },
    { href: "/dashboard/admin/roles", label: "Rol Yönetimi", icon: ShieldIcon },
    { href: "/dashboard/admin/data", label: "Veri Yönetimi", icon: LayersIcon },
    {
      href: "/dashboard/admin/settings",
      label: "Sistem Ayarları",
      icon: SettingsIcon,
    },
  ];

  const ownerLinks: LinkItem[] = [
    { href: "/dashboard/owner", label: "Genel Bakış", icon: HomeIcon },
    {
      href: "/dashboard/owner/fields",
      label: "Tarlalarım",
      icon: MapIcon,
      badge: "8",
    },
    { href: "/dashboard/owner/inventory", label: "Envanterim", icon: BoxIcon },
    {
      href: "/dashboard/owner/purchases",
      label: "Alışlar",
      icon: FileTextIcon,
      badge: "3",
    },
    {
      href: "/dashboard/owner/debts",
      label: "Borçlar",
      icon: CreditCard,
      badge: "5",
    },
    {
      href: "/dashboard/owner/notifications",
      label: "Bildirimler",
      icon: BellIcon,
      badge: "5",
    },
  ];

  const workerLinks: LinkItem[] = [
    // Türü belirtiyoruz
    { href: "/dashboard/worker", label: "Genel Bakış", icon: HomeIcon },
    {
      href: "/dashboard/worker/fields",
      label: "Atanmış Tarlalar",
      icon: MapIcon,
      badge: "4",
    },
    {
      href: "/dashboard/worker/irrigation",
      label: "Sulama Kayıtları",
      icon: DropletIcon,
    },
    {
      href: "/dashboard/worker/cultivation",
      label: "Tarla İşleme",
      icon: TractorIcon,
    },
    {
      href: "/dashboard/worker/notifications",
      label: "Bildirimler",
      icon: BellIcon,
      badge: "2",
    },
  ];

  return (
    <>
      {/* Mobil görünüm için Dialog, masaüstü için Sidebar */}
      {isMobile ? (
        <Dialog open={openMobile} onOpenChange={setOpenMobile}>
          <DialogTrigger asChild>
            {/*  Boş bir trigger ekleyin, cunku zaten SidebarTrigger kullanıyorsunuz */}
            <button>a</button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-sidebar text-sidebar-foreground">
            <DialogHeader>
              <DialogTitle>Tarım Yönetim Sistemi Menüsü</DialogTitle>
              <DialogDescription>
                {/* Açıklama ekleyebilirsiniz */}
              </DialogDescription>
            </DialogHeader>
            {/* SheetContent'in içeriğini buraya taşıyın */}
            <SidebarHeader className="border-b border-sidebar-border pb-2">
              <div className="flex items-center gap-2 px-2">
                <div className="relative w-8 h-8">
                  <div className="absolute inset-0 rounded-full neon-glow-cyan opacity-70"></div>
                  <div className="relative w-full h-full flex items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-cyan-600">
                    <span className="text-xs font-bold">TY</span>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  <h3 className="text-sm font-semibold neon-text-cyan truncate">
                    Tarım Yönetim
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">
                    v1.0.0
                  </p>
                </div>
              </div>
            </SidebarHeader>

            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Demo Paneller</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={
                          pathname === "/dashboard/admin" ||
                          pathname.startsWith("/dashboard/admin/")
                        }
                        tooltip="Admin Paneli"
                      >
                        <Link href="/dashboard/admin">
                          <ShieldIcon />
                          <span>Admin Paneli</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={
                          pathname === "/dashboard/owner" ||
                          pathname.startsWith("/dashboard/owner/")
                        }
                        tooltip="Sahip Paneli"
                      >
                        <Link href="/dashboard/owner">
                          <MapIcon />
                          <span>Sahip Paneli</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={
                          pathname === "/dashboard/worker" ||
                          pathname.startsWith("/dashboard/worker/")
                        }
                        tooltip="İşçi Paneli"
                      >
                        <Link href="/dashboard/worker">
                          <TractorIcon />
                          <span>İşçi Paneli</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>

              <SidebarSeparator />

              {pathname.includes("/dashboard/admin") && (
                <SidebarGroup>
                  <SidebarGroupLabel>Admin Menüsü</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {adminLinks.map((link) => {
                        const isActive = pathname === link.href;
                        const Icon = link.icon;

                        return (
                          <SidebarMenuItem key={link.href}>
                            <SidebarMenuButton
                              asChild
                              isActive={isActive}
                              tooltip={link.label}
                            >
                              <Link href={link.href}>
                                <Icon />
                                <span>{link.label}</span>
                              </Link>
                            </SidebarMenuButton>
                            {link.badge && (
                              <SidebarMenuBadge className="bg-purple-500/20 border border-purple-500/50 neon-glow">
                                {link.badge}
                              </SidebarMenuBadge>
                            )}
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              )}

              {pathname.includes("/dashboard/owner") && (
                <SidebarGroup>
                  <SidebarGroupLabel>Sahip Menüsü</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {ownerLinks.map((link) => {
                        const isActive = pathname === link.href;
                        const Icon = link.icon;

                        return (
                          <SidebarMenuItem key={link.href}>
                            <SidebarMenuButton
                              asChild
                              isActive={isActive}
                              tooltip={link.label}
                            >
                              <Link href={link.href}>
                                <Icon />
                                <span>{link.label}</span>
                              </Link>
                            </SidebarMenuButton>
                            {link.badge && (
                              <SidebarMenuBadge className="bg-cyan-500/20 border border-cyan-500/50 neon-glow-cyan">
                                {link.badge}
                              </SidebarMenuBadge>
                            )}
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              )}

              {pathname.includes("/dashboard/worker") && (
                <SidebarGroup>
                  <SidebarGroupLabel>İşçi Menüsü</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {workerLinks.map((link) => {
                        const isActive = pathname === link.href;
                        const Icon = link.icon;

                        return (
                          <SidebarMenuItem key={link.href}>
                            <SidebarMenuButton
                              asChild
                              isActive={isActive}
                              tooltip={link.label}
                            >
                              <Link href={link.href}>
                                <Icon />
                                <span>{link.label}</span>
                              </Link>
                            </SidebarMenuButton>
                            {link.badge && (
                              <SidebarMenuBadge className="bg-pink-500/20 border border-pink-500/50 neon-glow-pink">
                                {link.badge}
                              </SidebarMenuBadge>
                            )}
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              )}
            </SidebarContent>

            <SidebarFooter className="border-t border-sidebar-border pt-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 px-3 py-2 w-full rounded-md hover:bg-sidebar-accent transition-colors">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src="/placeholder.svg?height=32&width=32"
                        alt="Avatar"
                      />
                      <AvatarFallback className="bg-gradient-to-r from-purple-600 to-cyan-600">
                        <UserIcon className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden text-left">
                      <p className="text-sm font-medium truncate">
                        {user?.name || "Kullanıcı Adı"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user?.email || "kullanici@example.com"}
                      </p>
      </div>
                    {/* Mobil görünümde ChevronDownIcon'u gizleyin */}
                    {/* {state === "expanded" && (
                      <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
                    )} */}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 bg-background/95 backdrop-blur-sm border-purple-500/30"
                >
                  <DropdownMenuLabel>Hesabım</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Profil</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <SettingsIcon className="mr-2 h-4 w-4" />
                    <span>Ayarlar</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOutIcon className="mr-2 h-4 w-4" />
                    <span>Çıkış Yap</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarFooter>
          </DialogContent>
        </Dialog>
      ) : (
        // Masaüstü görünümünde Sidebar'ı kullanmaya devam edin
      <Sidebar
        variant="floating"
        collapsible="icon"
        className="border-r border-purple-500/30"
      >
        <SidebarHeader className="border-b border-sidebar-border pb-2">
          <div className="flex items-center gap-2 px-2">
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 rounded-full neon-glow-cyan opacity-70"></div>
              <div className="relative w-full h-full flex items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-cyan-600">
                <span className="text-xs font-bold">TY</span>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <h3 className="text-sm font-semibold neon-text-cyan truncate">
                Tarım Yönetim
              </h3>
              <p className="text-xs text-muted-foreground truncate">v1.0.0</p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Demo Paneller</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      pathname === "/dashboard/admin" ||
                      pathname.startsWith("/dashboard/admin/")
                    }
                    tooltip="Admin Paneli"
                  >
                    <Link href="/dashboard/admin">
                      <ShieldIcon />
                      <span>Admin Paneli</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      pathname === "/dashboard/owner" ||
                      pathname.startsWith("/dashboard/owner/")
                    }
                    tooltip="Sahip Paneli"
                  >
                    <Link href="/dashboard/owner">
                      <MapIcon />
                      <span>Sahip Paneli</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      pathname === "/dashboard/worker" ||
                      pathname.startsWith("/dashboard/worker/")
                    }
                    tooltip="İşçi Paneli"
                  >
                    <Link href="/dashboard/worker">
                      <TractorIcon />
                      <span>İşçi Paneli</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          {pathname.includes("/dashboard/admin") && (
            <SidebarGroup>
              <SidebarGroupLabel>Admin Menüsü</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminLinks.map((link) => {
                    const isActive = pathname === link.href;
                    const Icon = link.icon;

                    return (
                      <SidebarMenuItem key={link.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={link.label}
                        >
                          <Link href={link.href}>
                            <Icon />
                            <span>{link.label}</span>
                          </Link>
                        </SidebarMenuButton>
                        {link.badge && (
                          <SidebarMenuBadge className="bg-purple-500/20 border border-purple-500/50 neon-glow">
                            {link.badge}
                          </SidebarMenuBadge>
                        )}
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {pathname.includes("/dashboard/owner") && (
            <SidebarGroup>
              <SidebarGroupLabel>Sahip Menüsü</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {ownerLinks.map((link) => {
                    const isActive = pathname === link.href;
                    const Icon = link.icon;

                    return (
                      <SidebarMenuItem key={link.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={link.label}
                        >
                          <Link href={link.href}>
                            <Icon />
                            <span>{link.label}</span>
                          </Link>
                        </SidebarMenuButton>
                        {link.badge && (
                          <SidebarMenuBadge className="bg-cyan-500/20 border border-cyan-500/50 neon-glow-cyan">
                            {link.badge}
                          </SidebarMenuBadge>
                        )}
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {pathname.includes("/dashboard/worker") && (
            <SidebarGroup>
              <SidebarGroupLabel>İşçi Menüsü</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {workerLinks.map((link) => {
                    const isActive = pathname === link.href;
                    const Icon = link.icon;

                    return (
                      <SidebarMenuItem key={link.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={link.label}
                        >
                          <Link href={link.href}>
                            <Icon />
                            <span>{link.label}</span>
                          </Link>
                        </SidebarMenuButton>
                        {link.badge && (
                          <SidebarMenuBadge className="bg-pink-500/20 border border-pink-500/50 neon-glow-pink">
                            {link.badge}
                          </SidebarMenuBadge>
                        )}
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border pt-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-2 w-full rounded-md hover:bg-sidebar-accent transition-colors">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src="/placeholder.svg?height=32&width=32"
                    alt="Avatar"
                  />
                  <AvatarFallback className="bg-gradient-to-r from-purple-600 to-cyan-600">
                    <UserIcon className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden text-left">
                  <p className="text-sm font-medium truncate">
                    {user?.name || "Kullanıcı Adı"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email || "kullanici@example.com"}
                  </p>
                </div>
                {state === "expanded" && (
                  <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 bg-background/95 backdrop-blur-sm border-purple-500/30"
            >
              <DropdownMenuLabel>Hesabım</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Profil</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <SettingsIcon className="mr-2 h-4 w-4" />
                <span>Ayarlar</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOutIcon className="mr-2 h-4 w-4" />
                <span>Çıkış Yap</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      )}
    </>
  );
}
