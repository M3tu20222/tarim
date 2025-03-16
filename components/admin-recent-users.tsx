"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

type User = {
  id: string
  name: string
  email: string
  role: "admin" | "owner" | "worker"
  date: string
  avatar?: string
}

export function AdminRecentUsers() {
  // Mock data - will be replaced with actual data from API
  const users: User[] = [
    {
      id: "1",
      name: "Ahmet Yılmaz",
      email: "ahmet@example.com",
      role: "admin",
      date: "2 saat önce",
    },
    {
      id: "2",
      name: "Mehmet Demir",
      email: "mehmet@example.com",
      role: "owner",
      date: "5 saat önce",
    },
    {
      id: "3",
      name: "Ayşe Kaya",
      email: "ayse@example.com",
      role: "owner",
      date: "1 gün önce",
    },
    {
      id: "4",
      name: "Fatma Şahin",
      email: "fatma@example.com",
      role: "worker",
      date: "2 gün önce",
    },
  ]

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-500/20 text-purple-400 border-purple-500/50 hover:bg-purple-500/30"
      case "owner":
        return "bg-cyan-500/20 text-cyan-400 border-cyan-500/50 hover:bg-cyan-500/30"
      case "worker":
        return "bg-pink-500/20 text-pink-400 border-pink-500/50 hover:bg-pink-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/50 hover:bg-gray-500/30"
    }
  }

  const getRoleText = (role: string) => {
    switch (role) {
      case "admin":
        return "Admin"
      case "owner":
        return "Sahip"
      case "worker":
        return "İşçi"
      default:
        return role
    }
  }

  return (
    <div className="space-y-4">
      {users.map((user) => (
        <div key={user.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-purple-500/10 transition-colors">
          <Avatar className="h-10 w-10 border border-purple-500/30">
            <AvatarImage src={user.avatar || `/placeholder.svg?height=40&width=40`} alt={user.name} />
            <AvatarFallback className="bg-gradient-to-r from-purple-600 to-cyan-600">
              {user.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge className={`${getRoleBadgeColor(user.role)} border`}>{getRoleText(user.role)}</Badge>
            <p className="text-xs text-muted-foreground">{user.date}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

