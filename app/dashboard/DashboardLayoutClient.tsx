"use client";

import type React from "react";
import { useEffect, useState } from "react";

import { Inter } from "next/font/google";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useMobile } from "@/hooks/use-mobile";
import { AuthProvider } from "@/components/auth-provider";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const inter = Inter({ subsets: ["latin"] });

export default function DashboardLayoutClient({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isMobile = useMobile();
  const [mounted, setMounted] = useState(false);

  // Hydration fix
  useEffect(() => {
    setMounted(true);
  }, []);

  // Mobil cihazlarda sidebar varsayılan olarak kapalı olsun
  const defaultOpen = mounted ? !isMobile : false;

  return (
    <AuthProvider>
      <div className={`${inter.className} min-h-screen bg-background`}>
        <SidebarProvider defaultOpen={defaultOpen}>
          <AppSidebar />

          {/* Mobile & Desktop Toggle Buttons with Cyberpunk Style */}
          {mounted && <MobileToggleButton />}
          {mounted && !isMobile && <DesktopSidebarToggle />}

          {/* Mobile Overlay when sidebar is open */}
          {mounted && isMobile && <MobileOverlay />}

          {/* Swipe edge detector for opening sidebar */}
          {mounted && isMobile && <SwipeEdgeDetector />}

          {/* Main Content Container with proper spacing */}
          <div className="flex min-h-screen flex-col">
            <main className="flex-1 px-4 md:px-6 py-4 md:py-6">
              {children}
            </main>
          </div>
        </SidebarProvider>
      </div>
    </AuthProvider>
  );
}

// Mobile için hamburger menü toggle button
function MobileToggleButton() {
  const { open, toggleSidebar } = useSidebar();
  const isMobile = useMobile();

  if (!isMobile) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      className={cn(
        "fixed top-4 left-4 z-50 transition-all duration-300",
        "bg-black/80 backdrop-blur-sm border border-cyan-500 shadow-lg shadow-cyan-500/50 rounded-sm",
        "hover:bg-cyan-500/20 hover:border-cyan-400 hover:shadow-cyan-400/50",
        "active:scale-95"
      )}
      aria-label="Toggle Mobile Menu"
    >
      <Menu className="h-5 w-5 text-cyan-400 transition-colors duration-200" />
    </Button>
  );
}

// Mobile overlay when sidebar is open
function MobileOverlay() {
  const { open, toggleSidebar } = useSidebar();
  const isMobile = useMobile();

  if (!isMobile || !open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 bg-black/60 backdrop-blur-sm z-30 transition-opacity duration-300",
        "animate-in fade-in"
      )}
      onClick={toggleSidebar}
      aria-hidden="true"
    />
  );
}

// Swipe edge detector for opening sidebar from left edge
function SwipeEdgeDetector() {
  const { open, setOpen } = useSidebar();
  const isMobile = useMobile();
  const [touchStart, setTouchStart] = useState<number | null>(null);

  if (!isMobile || open) return null;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;

    const touchEnd = e.changedTouches[0].clientX;
    const distance = touchEnd - touchStart;

    // Open sidebar on right swipe from left edge
    if (distance > 50 && touchStart < 30) {
      setOpen(true);
    }
  };

  return (
    <div
      className="fixed left-0 top-0 bottom-0 w-8 z-10"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-hidden="true"
    />
  );
}

// Desktop için sidebar toggle (eski kod improved)
function DesktopSidebarToggle() {
  const { open, toggleSidebar } = useSidebar();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      className={cn(
        "fixed top-4 z-20 transition-all duration-300",
        open
          ? "left-[16rem] opacity-0 pointer-events-none"
          : "left-4 opacity-100",
        "bg-black/80 backdrop-blur-sm border border-green-500 shadow-lg shadow-green-500/50 rounded-sm",
        "hover:bg-green-500/20 hover:border-green-400 hover:shadow-green-400/50",
        "active:scale-95"
      )}
      aria-label="Toggle Sidebar"
    >
      <Menu className="h-5 w-5 text-green-400 transition-colors duration-200" />
    </Button>
  );
}
