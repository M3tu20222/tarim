import type React from "react";
import { cookies } from "next/headers";
import { ThemeProvider } from "@/components/theme-provider";
// Inter font import removed, using font from root layout
import "../globals.css";
// AppSidebar, SidebarProvider, SidebarInset importları kaldırıldı
import { Toaster } from "@/components/ui/toaster";
import DashboardLayoutClient from "./DashboardLayoutClient"; // DashboardLayoutClient'ı import et

// inter constant removed

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const cookieStore = await cookies();
  const sidebarStateCookie = cookieStore.get("sidebar:state");
  const defaultOpen = sidebarStateCookie
    ? sidebarStateCookie.value === "true"
    : true;

  // Removed <html> and <body> tags
  // ThemeProvider is likely already in the root layout, but keeping it here
  // might be intentional for nested theme control, though potentially redundant.
  // If ThemeProvider is only needed once, it should be removed from here.
  // For now, let's keep it but remove the body wrapper.
  // SidebarProvider, AppSidebar ve SidebarInset kaldırıldı.
  // DashboardLayoutClient tüm yapıyı yönetecek.
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false} // Consider if this conflicts with root layout's ThemeProvider
      disableTransitionOnChange
    >
      <DashboardLayoutClient>{children}</DashboardLayoutClient>
      <Toaster />
    </ThemeProvider>
  );
}
