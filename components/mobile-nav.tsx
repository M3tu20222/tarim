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
} from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[];
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
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
      href: "/dashboard/users",
      icon: <Users className="h-5 w-5" />,
      roles: ["ADMIN"],
    },
    {
      title: "Tarlalar",
      href: "/dashboard/fields",
      icon: <Map className="h-5 w-5" />,
    },
    {
      title: "Envanter",
      href: "/dashboard/inventory",
      icon: <Package className="h-5 w-5" />,
    },
    {
      title: "Alışlar",
      href: "/dashboard/purchases",
      icon: <ShoppingCart className="h-5 w-5" />,
    },
    {
      title: "Borçlar",
      href: "/dashboard/debts",
      icon: <CreditCard className="h-5 w-5" />,
    },
    {
      title: "Faturalar",
      href: "/dashboard/invoices",
      icon: <FileText className="h-5 w-5" />,
    },
    {
      title: "İşlemler",
      href: "/dashboard/processes",
      icon: <Tractor className="h-5 w-5" />,
    },
    {
      title: "Sulama",
      href: "/dashboard/irrigation",
      icon: <Droplet className="h-5 w-5" />,
    },
    {
      title: "Ayarlar",
      href: "/dashboard/settings",
      icon: <Settings className="h-5 w-5" />,
    },
  ];

  // Filter nav items based on user role
  const filteredNavItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(userRole)
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Menüyü aç</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="pr-0">
        <div className="px-2 py-6">
          <h2 className="mb-4 text-lg font-semibold">Navigasyon</h2>
          <nav className="grid gap-2">
            {filteredNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-accent",
                  pathname === item.href
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground"
                )}
              >
                {item.icon}
                {item.title}
              </Link>
            ))}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}
