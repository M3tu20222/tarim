import type React from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { Inter } from "next/font/google";
import "../globals.css";
import { cookies } from "next/headers";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Sidebar durumunu cookie'den al
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar:state")?.value === "true";

  return (
    <html lang="tr" suppressHydrationWarning>
      {/* ThemeProvider'ı body ETRAFINA sarın */}
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        disableTransitionOnChange
      >
        <body className={`${inter.className} antialiased`}>
          <SidebarProvider defaultOpen={defaultOpen}>
            <AppSidebar />
            <SidebarInset className="cyberpunk-grid">
              <header className="flex h-16 items-center gap-4 border-b border-purple-500/30 px-6">
                <SidebarTrigger />
                <div className="flex-1">
                  <h1 className="text-lg font-semibold">
                    Tarım Yönetim Sistemi
                  </h1>
                </div>
              </header>
              {children}
            </SidebarInset>
          </SidebarProvider>
          <Toaster />
        </body>
      </ThemeProvider>
    </html>
  );
}
