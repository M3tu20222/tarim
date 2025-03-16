"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { BellIcon, MoonIcon, SunIcon, SearchIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useTheme } from "next-themes"

interface DashboardHeaderProps {
  title: string
}

export function DashboardHeader({ title }: DashboardHeaderProps) {
  const pathname = usePathname()
  const { setTheme, theme } = useTheme()
  const [showSearch, setShowSearch] = useState(false)

  const getHeaderTitle = () => {
    if (pathname.includes("/dashboard/admin")) {
      return "Admin Paneli"
    } else if (pathname.includes("/dashboard/owner")) {
      return "Sahip Paneli"
    } else if (pathname.includes("/dashboard/worker")) {
      return "İşçi Paneli"
    }
    return title
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-purple-500/30 bg-background/80 px-4 backdrop-blur-sm">
      <div className="flex flex-1 items-center gap-2">
        <SidebarTrigger />
        <h1 className="text-xl font-bold neon-text-purple">{getHeaderTitle()}</h1>
      </div>

      <div className="flex items-center gap-2">
        {showSearch ? (
          <div className="relative w-64 animate-in fade-in slide-in-from-top-4 duration-300">
            <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Ara..."
              className="pl-8 bg-background/50 border-purple-500/30 focus:border-purple-500 focus:neon-glow"
              onBlur={() => setShowSearch(false)}
              autoFocus
            />
          </div>
        ) : (
          <Button variant="ghost" size="icon" onClick={() => setShowSearch(true)} className="hover:bg-purple-500/10">
            <SearchIcon className="h-5 w-5" />
            <span className="sr-only">Ara</span>
          </Button>
        )}

        <Button variant="ghost" size="icon" className="relative hover:bg-purple-500/10">
          <BellIcon className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 neon-glow-pink animate-pulse"></span>
          <span className="sr-only">Bildirimler</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="hover:bg-purple-500/10">
              {theme === "dark" ? <MoonIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" />}
              <span className="sr-only">Tema Değiştir</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-sm border-purple-500/30">
            <DropdownMenuItem onClick={() => setTheme("light")}>
              <SunIcon className="mr-2 h-4 w-4" />
              <span>Açık Tema</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              <MoonIcon className="mr-2 h-4 w-4" />
              <span>Koyu Tema</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

