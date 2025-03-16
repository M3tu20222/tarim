"use client"

import type React from "react"

import { DashboardHeader } from "@/components/dashboard-header"

interface DashboardLayoutProps {
  children: React.ReactNode
  title: string
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader title={title} />
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  )
}

