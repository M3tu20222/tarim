"use client";

import type React from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  CreditCard,
  FileText,
  Settings,
  Map,
  Droplet,
  Tractor,
  AreaChart, // Raporlar için yeni ikon
  Landmark, // Fatura Dönemleri için yeni ikon
  Receipt, // Yeni ikon eklendi
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[];
}

export function DashboardNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const userRole = user?.role || "";

  const navItems: NavItem[] = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      title: "Kullanıcılar",
      href: "/dashboard/admin/users", // Admin rolüne özel path düzeltmesi
      icon: <Users className="h-5 w-5" />,
      roles: ["ADMIN"],
    },
    {
      title: "Tarlalar",
      href: "/dashboard/owner/fields", // Owner rolüne özel path
      icon: <Map className="h-5 w-5" />,
      roles: ["OWNER"],
    },
    {
      title: "Envanter",
      href: "/dashboard/owner/inventory", // Owner rolüne özel path
      icon: <Package className="h-5 w-5" />,
      roles: ["OWNER"],
    },
    {
      title: "Alışlar",
      href: "/dashboard/owner/purchases", // Owner rolüne özel path
      icon: <ShoppingCart className="h-5 w-5" />,
      roles: ["OWNER"],
    },
    {
      title: "Borçlar",
      href: "/dashboard/owner/debts", // Owner rolüne özel path
      icon: <CreditCard className="h-5 w-5" />,
      roles: ["OWNER"],
    },
    {
      title: "Faturalar",
      href: "/dashboard/owner/invoices", // Owner rolüne özel path
      icon: <FileText className="h-5 w-5" />,
      roles: ["OWNER"],
    },
    {
      title: "Kuyu Faturaları",
      href: "/dashboard/owner/billing/periods",
      icon: <Receipt className="h-5 w-5" />,
      roles: ["OWNER", "ADMIN"],
    },
    {
      title: "Raporlar",
      href: "/dashboard/owner/reports",
      icon: <AreaChart className="h-5 w-5" />,
      roles: ["OWNER"],
    },
    {
      title: "İşlemler",
      href: "/dashboard/worker/processes", // Worker rolüne özel path
      icon: <Tractor className="h-5 w-5" />,
      roles: ["WORKER"],
    },
    {
      title: "Sulama",
      href: "/dashboard/worker/irrigation", // Worker rolüne özel path
      icon: <Droplet className="h-5 w-5" />,
      roles: ["WORKER"],
    },
    // Genel roller için linkler
    {
      title: "Ayarlar",
      href: "/dashboard/settings",
      icon: <Settings className="h-5 w-5" />,
      roles: ["ADMIN", "OWNER", "WORKER"], // Herkes görebilir
    },
  ];

  // Filter nav items based on user role
  const filteredNavItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(userRole)
  );

  // Adjust hrefs based on role for shared pages
  const getRoleSpecificPath = (basePath: string) => {
    if (userRole.toLowerCase() === 'admin') return basePath;
    return `/dashboard/${userRole.toLowerCase()}${basePath.substring('/dashboard'.length)}`;
  }

  return (
    <nav className="grid items-start gap-2 px-2 py-4 text-sm">
      {filteredNavItems.map((item) => {
        // Adjust the dashboard link for each role
        let finalHref = item.href;
        if (item.title === 'Dashboard') {
            finalHref = `/dashboard/${userRole.toLowerCase()}/dashboard`;
        }

        return (
            <Link
              key={finalHref}
              href={finalHref}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-accent",
                pathname === finalHref
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              )}
            >
              {item.icon}
              {item.title}
            </Link>
        );
      })}
    </nav>
  );
}
