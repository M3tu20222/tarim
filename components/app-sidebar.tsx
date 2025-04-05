"use client";

import type React from "react";
import { Button } from "@/components/ui/button";
import {
  HomeIcon,
  MapIcon,
  BoxIcon,
  FileTextIcon,
  CreditCard,
  BellIcon,
  Calendar,
  DropletIcon,
  TractorIcon,
  ActivityIcon,
  UsersIcon,
  SettingsIcon,
  UserIcon,
  LogOutIcon,
} from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

interface LinkItem {
  href: string;
  label: string;
  icon: React.ForwardRefExoticComponent<
    React.PropsWithoutRef<React.SVGProps<SVGSVGElement>> &
      React.RefAttributes<SVGSVGElement>
  >;
  badge?: string; // İsteğe bağlı badge özelliği
}

// Admin bağlantıları
const adminLinks: LinkItem[] = [
  { href: "/dashboard/admin", label: "Genel Bakış", icon: HomeIcon },
  { href: "/dashboard/admin/users", label: "Kullanıcılar", icon: UsersIcon },
  { href: "/dashboard/admin/settings", label: "Ayarlar", icon: SettingsIcon },
];

// Sahip bağlantıları
const ownerLinks: LinkItem[] = [
  { href: "/dashboard/owner", label: "Genel Bakış", icon: HomeIcon },
  {
    href: "/dashboard/owner/fields",
    label: "Tarlalarım",
    icon: MapIcon,
    badge: "8",
  },
  { href: "/dashboard/owner/wells", label: "Kuyular", icon: DropletIcon },
  {
    href: "/dashboard/owner/equipment",
    label: "Ekipmanlar",
    icon: TractorIcon,
  },
  { href: "/dashboard/owner/processes", label: "İşlemler", icon: ActivityIcon },
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
  { href: "/dashboard/owner/seasons", label: "Sezonlar", icon: Calendar },
  {
    href: "/dashboard/owner/notifications",
    label: "Bildirimler",
    icon: BellIcon,
    badge: "5",
  },
];

// İşçi bağlantıları
const workerLinks: LinkItem[] = [
  { href: "/dashboard/worker", label: "Genel Bakış", icon: HomeIcon },
  { href: "/dashboard/worker/tasks", label: "Görevlerim", icon: FileTextIcon },
  { href: "/dashboard/worker/fields", label: "Tarlalar", icon: MapIcon },
  {
    href: "/dashboard/worker/notifications",
    label: "Bildirimler",
    icon: BellIcon,
    badge: "2",
  },
];

export function AppSidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Kullanıcı rolüne göre bağlantıları seç
  // let links: LinkItem[] = []
  // if (user?.role === "ADMIN") {
  //   links = adminLinks
  // } else if (user?.role === "OWNER") {
  //   links = ownerLinks
  // } else if (user?.role === "WORKER") {
  //   links = workerLinks
  // }

  return (
    <div className="h-screen flex flex-col border-r border-border">
      <div className="p-2 border-b">
        <h2 className="text-lg font-semibold tracking-tight">Tarım Yönetim</h2>
        <p className="text-xs text-muted-foreground">v1.0.0</p>
      </div>

      <div className="flex-1 overflow-auto py-2">
        <nav className="grid gap-1 px-2">
          {/* Render links based on user role */}
          {user?.role === "ADMIN" &&
            adminLinks.map((link) => (
              <Button
                key={link.href}
                variant={pathname === link.href ? "secondary" : "ghost"}
                size="sm"
                className="justify-start h-9"
                asChild
              >
                <Link href={link.href}>
                  <link.icon className="mr-2 h-4 w-4" />
                  {link.label}
                  {link.badge && (
                    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                      {link.badge}
                    </span>
                  )}
                </Link>
              </Button>
            ))}

          {user?.role === "OWNER" &&
            ownerLinks.map((link) => (
              <Button
                key={link.href}
                variant={pathname === link.href ? "secondary" : "ghost"}
                size="sm"
                className="justify-start h-9"
                asChild
              >
                <Link href={link.href}>
                  <link.icon className="mr-2 h-4 w-4" />
                  {link.label}
                  {link.badge && (
                    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                      {link.badge}
                    </span>
                  )}
                </Link>
              </Button>
            ))}

          {user?.role === "WORKER" &&
            workerLinks.map((link) => (
              <Button
                key={link.href}
                variant={pathname === link.href ? "secondary" : "ghost"}
                size="sm"
                className="justify-start h-9"
                asChild
              >
                <Link href={link.href}>
                  <link.icon className="mr-2 h-4 w-4" />
                  {link.label}
                  {link.badge && (
                    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                      {link.badge}
                    </span>
                  )}
                </Link>
              </Button>
            ))}
        </nav>
      </div>

      <div className="mt-auto p-2 border-t">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start px-2">
              <Avatar className="h-6 w-6 mr-2">
                <AvatarFallback>{user?.name?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
              <span className="truncate">{user?.name || "Kullanıcı"}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
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
            <DropdownMenuItem onClick={logout}>
              <LogOutIcon className="mr-2 h-4 w-4" />
              <span>Çıkış Yap</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
