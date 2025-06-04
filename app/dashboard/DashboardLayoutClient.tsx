"use client";

import type React from "react";

import { Inter } from "next/font/google";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { useMobile } from "@/hooks/use-mobile";
import { AuthProvider } from "@/components/auth-provider";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar"; // SidebarTrigger ve useSidebar import et
import { cn } from "@/lib/utils"; // cn utility'sini import et
import { Menu } from "lucide-react"; // Menu ikonunu import et
import { Button } from "@/components/ui/button"; // Button bileşenini import et

const inter = Inter({ subsets: ["latin"] });

export default function DashboardLayoutClient({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isMobile = useMobile();
  // Mobil cihazlarda sidebar varsayılan olarak kapalı olsun
  const defaultOpen = !isMobile;

  return (
    <AuthProvider>
      <div className={`${inter.className} min-h-screen bg-background`}>
        <SidebarProvider defaultOpen={defaultOpen}>
          <AppSidebar />
          {/* Masaüstünde sidebar kapalıyken görünür olacak hamburger menü düğmesi */}
          {!isMobile && <DesktopSidebarToggle />}
          <div className="flex min-h-screen flex-col">
            <MobileNav />
            <main className="flex-1">{children}</main>
          </div>
        </SidebarProvider>
      </div>
    </AuthProvider>
  );
}

// Masaüstü için kenar çubuğunu açıp kapatmak için ayrı bir bileşen
function DesktopSidebarToggle() {
  const { open, toggleSidebar } = useSidebar();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      className={cn(
        "fixed top-4 z-20 transition-all duration-300",
        open ? "left-[16rem] opacity-0 pointer-events-none" : "left-4 opacity-100",
        "border border-green-500 shadow-lg shadow-green-500/50 rounded-sm" // Yeşil neon çerçeve stilini ekle
      )}
      aria-label="Toggle Sidebar"
    >
      <Menu className="h-5 w-5 text-green-400" /> {/* İkon rengini de neon yeşili yap */}
    </Button>
  );
}
