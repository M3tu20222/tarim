import type React from "react";
import { cookies } from "next/headers";
import { ThemeProvider } from "@/components/theme-provider";
import { Inter } from "next/font/google";
import "../globals.css";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

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

  return (
    <html lang="tr" suppressHydrationWarning>
      <body
        className={`${inter.className} min-h-screen bg-background text-foreground antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
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
      </body>
    </html>
  );
}
