"use client";

"use client";

import type React from "react";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import {
  Home,
  Users,
  Package,
  ShoppingCart,
  DollarSign,
  FileText,
  Settings,
  Landmark,
  Droplet,
  Calendar,
  BarChart3,
  Wrench,
} from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  show?: boolean;
}

interface NavGroup {
  title: string;
  show?: boolean;
  items: NavItem[];
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();
  const userRole = user?.role?.toLowerCase() || "";

  const isActive = (path: string): boolean => {
    return pathname === path;
  };

  const isActiveGroup = (paths: string[]) => {
    return paths.some((path) => pathname.startsWith(path));
  };

  // Mobil navigasyon için AppSidebar ile aynı yapıyı kullan
  const navGroups: NavGroup[] = [
    {
      title: "ANA",
      items: [
        {
          title: "Ana Sayfa",
          href: userRole ? `/dashboard/${userRole}` : "/dashboard",
          icon: <Home className="h-5 w-5" />,
        },
        {
          title: "Bildirimler",
          href: "/dashboard/notifications",
          icon: <Home className="h-5 w-5" />,
        },
      ],
    },
    {
      title: "ENVANTER",
      show: userRole !== "worker",
      items: [
        {
          title: "Envanter",
          href: "/dashboard/owner/inventory",
          icon: <Package className="h-5 w-5" />,
        },
        {
          title: "Satın Alma",
          href: "/dashboard/owner/purchases",
          icon: <ShoppingCart className="h-5 w-5" />,
        },
      ],
    },
    {
      title: "FİNANSAL",
      show: userRole !== "worker",
      items: [
        {
          title: "Borçlar",
          href: "/dashboard/owner/debts",
          icon: <DollarSign className="h-5 w-5" />,
        },
      ],
    },
    {
      title: "ÇİFTLİK",
      items: [
        {
          title: "Tarlalar",
          href: "/dashboard/owner/fields",
          icon: <Landmark className="h-5 w-5" />,
          show: userRole !== "worker",
        },
        {
          title: userRole === "worker" ? "Sulama Görevlerim" : "Sulama Planları",
          href: userRole === "worker" ? "/dashboard/worker/irrigation" : "/dashboard/owner/irrigation",
          icon: <Droplet className="h-5 w-5" />,
        },
        {
          title: userRole === "worker" ? "Görevlerim" : "Süreç Listesi",
          href: userRole === "worker" ? "/dashboard/worker/processes" : "/dashboard/owner/processes",
          icon: <FileText className="h-5 w-5" />,
        },
        {
          title: "Sezonlar",
          href: "/dashboard/owner/seasons",
          icon: <Calendar className="h-5 w-5" />,
        },
        {
          title: "Ekipman",
          href: `/dashboard/${userRole}/equipment`,
          icon: <Wrench className="h-5 w-5" />,
          show: userRole === "admin" || userRole === "owner",
        },
      ],
    },
    {
      title: "RAPORLAR",
      show: userRole !== "worker",
      items: [
        {
          title: "Raporlar",
          href: "/dashboard/owner/reports",
          icon: <BarChart3 className="h-5 w-5" />,
        },
      ],
    },
    {
      title: "YÖNETİM",
      items: [
        {
          title: "Kullanıcılar",
          href: "/dashboard/admin/users",
          icon: <Users className="h-5 w-5" />,
          show: userRole === "admin",
        },
        {
          title: "Ayarlar",
          href: "/dashboard/settings",
          icon: <Settings className="h-5 w-5" />,
        },
      ],
    },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Menüyü aç</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="pr-0 w-64">
        <div className="px-2 py-6 h-full flex flex-col">
          <h2 className="mb-4 text-lg font-semibold px-3">Navigasyon</h2>
          <nav className="flex-1 space-y-4">
            {navGroups.map((group) => {
              // Grubu gösterme koşullarını kontrol et
              const shouldShowGroup = group.show !== false && 
                group.items.some(item => item.show !== false);
              
              if (!shouldShowGroup) return null;

              return (
                <div key={group.title}>
                  <div className="text-xs font-semibold text-muted-foreground mb-2 px-3">
                    {group.title}
                  </div>
                  <div className="space-y-1">
                    {group.items
                      .filter(item => item.show !== false)
                      .map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent w-full",
                            isActive(item.href) || isActiveGroup([item.href])
                              ? "bg-accent text-accent-foreground"
                              : "text-muted-foreground"
                          )}
                        >
                          {item.icon}
                          {item.title}
                        </Link>
                      ))}
                  </div>
                </div>
              );
            })}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}
