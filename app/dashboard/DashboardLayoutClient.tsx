"use client";

import type React from "react";

import { Inter } from "next/font/google";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { useMobile } from "@/hooks/use-mobile";
import { AuthProvider } from "@/components/auth-provider"; // AuthProvider import edildi

const inter = Inter({ subsets: ["latin"] });

export default function DashboardLayoutClient({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Mobil cihazlarda sidebar varsayılan olarak kapalı olsun
  const defaultOpen = !useMobile();

  return (
    // AuthProvider ile sarmala
    <AuthProvider>
      <div className={`${inter.className} min-h-screen bg-background`}>
        <SidebarProvider defaultOpen={defaultOpen}>
          <AppSidebar />
          <div className="flex min-h-screen flex-col">
            <MobileNav />
            <main className="flex-1">{children}</main>
          </div>
        </SidebarProvider>
      </div>
    </AuthProvider>
  );
}
