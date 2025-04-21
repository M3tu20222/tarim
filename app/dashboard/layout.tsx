import type React from "react";
import { cookies } from "next/headers";
import { ThemeProvider } from "@/components/theme-provider";
// Inter font import removed, using font from root layout
import "../globals.css";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/toaster";

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
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false} // Consider if this conflicts with root layout's ThemeProvider
      disableTransitionOnChange
    >
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar />
        <SidebarInset className="bg-background text-foreground">
          {children}
        </SidebarInset>
      </SidebarProvider>
      <Toaster />
    </ThemeProvider>
  );
}
