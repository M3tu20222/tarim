"use client"

import { Badge } from "@/components/ui/badge"
import { MapPinIcon } from "lucide-react"

type Field = {
  id: string
  name: string
  location: string
  crop: string
  status: "active" | "fallow" | "harvested"
  date: string
}

export function OwnerRecentFields() {
  // Mock data - will be replaced with actual data from API
  const fields: Field[] = [
    {
      id: "1",
      name: "Merkez Tarla",
      location: "Adana, Merkez",
      crop: "Buğday",
      status: "active",
      date: "2 gün önce",
    },
    {
      id: "2",
      name: "Doğu Tarla",
      location: "Adana, Ceyhan",
      crop: "Mısır",
      status: "active",
      date: "5 gün önce",
    },
    {
      id: "3",
      name: "Batı Tarla",
      location: "Adana, Seyhan",
      crop: "Pamuk",
      status: "active",
      date: "1 hafta önce",
    },
    {
      id: "4",
      name: "Güney Tarla",
      location: "Adana, Yüreğir",
      crop: "Arpa",
      status: "harvested",
      date: "2 hafta önce",
    },
  ]

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/20 text-green-400 border-green-500/50 hover:bg-green-500/30"
      case "fallow":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50 hover:bg-yellow-500/30"
      case "harvested":
        return "bg-blue-500/20 text-blue-400 border-blue-500/50 hover:bg-blue-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/50 hover:bg-gray-500/30"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "Ekili"
      case "fallow":
        return "Nadasa Bırakılmış"
      case "harvested":
        return "Hasat Edilmiş"
      default:
        return status
    }
  }

  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <div key={field.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-purple-500/10 transition-colors">
          <div className="h-10 w-10 rounded-md bg-cyan-500/10 flex items-center justify-center border border-cyan-500/30">
            <MapPinIcon className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{field.name}</p>
            <p className="text-xs text-muted-foreground truncate">{field.location}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge className={`${getStatusBadgeColor(field.status)} border`}>{getStatusText(field.status)}</Badge>
            <p className="text-xs text-muted-foreground">{field.date}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

