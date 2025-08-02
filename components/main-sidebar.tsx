"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useMobile } from "@/hooks/use-mobile"
import { ChevronLeftIcon, ChevronRightIcon, HomeIcon, MapIcon, TractorIcon, ShieldIcon } from "lucide-react"

export function MainSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const isMobile = useMobile()

  // Collapse sidebar by default on mobile
  useEffect(() => {
    if (isMobile) {
      setIsCollapsed(true)
    }
  }, [isMobile])

  // Close sidebar when navigating on mobile
  useEffect(() => {
    if (isMobile) {
      setIsOpen(false)
    }
  }, [pathname, isMobile])

  const toggleSidebar = () => {
    if (isMobile) {
      setIsOpen(!isOpen)
    } else {
      setIsCollapsed(!isCollapsed)
    }
  }

  const links = [
    { href: "/", label: "Giriş Sayfası", icon: HomeIcon },
    { href: "/dashboard/admin", label: "Admin Paneli", icon: ShieldIcon },
    { href: "/dashboard/owner", label: "Sahip Paneli", icon: MapIcon },
    { href: "/dashboard/worker", label: "İşçi Paneli", icon: TractorIcon },
  ]

  const sidebarContent = (
    <div
      className={cn(
        "h-full flex flex-col bg-background/80 backdrop-blur-sm border-r border-purple-500/30 transition-all duration-300",
        isCollapsed && !isOpen ? "w-16" : "w-64",
      )}
    >
      <div className="p-4 flex items-center justify-between">
        {(!isCollapsed || isOpen) && <h2 className="text-xl font-bold neon-text-cyan">Tarım Yönetim</h2>}
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="ml-auto">
          {isCollapsed && !isOpen ? <ChevronRightIcon className="h-4 w-4" /> : <ChevronLeftIcon className="h-4 w-4" />}
        </Button>
      </div>

      <div className="flex-1 px-3 py-2 space-y-1">
        {links.map((link) => {
          const isActive = pathname === link.href
          const Icon = link.icon

          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => isMobile && setIsOpen(false)}
              className={cn(
                "flex items-center px-3 py-2 text-sm rounded-md transition-colors",
                isActive
                  ? "bg-purple-500/20 text-white neon-glow"
                  : "text-muted-foreground hover:text-white hover:bg-purple-500/10",
              )}
            >
              <Icon className={cn("h-4 w-4", isActive && "text-cyan-400")} />
              {(!isCollapsed || isOpen) && <span className="ml-2">{link.label}</span>}
            </Link>
          )
        })}
      </div>

      {(!isCollapsed || isOpen) && (
        <div className="p-4 border-t border-purple-500/30">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-cyan-600 flex items-center justify-center">
              <span className="text-xs font-bold">TY</span>
            </div>
            <div>
              <p className="text-sm font-medium">Tarım Yönetim</p>
              <p className="text-xs text-muted-foreground">v1.0.0</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // For mobile: render a fixed sidebar with backdrop when open
  if (isMobile && isOpen) {
    return (
      <>
        <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
        <div className="fixed inset-y-0 left-0 z-50">{sidebarContent}</div>
        <div className="w-16 flex-shrink-0">{/* Spacer to prevent content shift */}</div>
      </>
    )
  }

  // For desktop or mobile collapsed state
  return (
    <>
      {sidebarContent}
      {isMobile && !isOpen && (
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-50 bg-background/50 backdrop-blur-sm border border-purple-500/30"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      )}
    </>
  )
}

