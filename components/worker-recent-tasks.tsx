"use client"

import { Badge } from "@/components/ui/badge"
import { MapPinIcon, DropletIcon, TractorIcon } from "lucide-react"

type Task = {
  id: string
  type: "irrigation" | "cultivation"
  fieldName: string
  location: string
  date: string
  status: "completed" | "pending"
}

export function WorkerRecentTasks() {
  // Mock data - will be replaced with actual data from API
  const tasks: Task[] = [
    {
      id: "1",
      type: "irrigation",
      fieldName: "Merkez Tarla",
      location: "Adana, Merkez",
      date: "Bugün",
      status: "completed",
    },
    {
      id: "2",
      type: "cultivation",
      fieldName: "Doğu Tarla",
      location: "Adana, Ceyhan",
      date: "Dün",
      status: "completed",
    },
    {
      id: "3",
      type: "irrigation",
      fieldName: "Batı Tarla",
      location: "Adana, Seyhan",
      date: "2 gün önce",
      status: "completed",
    },
    {
      id: "4",
      type: "cultivation",
      fieldName: "Güney Tarla",
      location: "Adana, Yüreğir",
      date: "3 gün önce",
      status: "completed",
    },
  ]

  const getTaskIcon = (type: string) => {
    switch (type) {
      case "irrigation":
        return <DropletIcon className="h-5 w-5 text-cyan-400" />
      case "cultivation":
        return <TractorIcon className="h-5 w-5 text-pink-400" />
      default:
        return <MapPinIcon className="h-5 w-5 text-purple-400" />
    }
  }

  const getTaskBgColor = (type: string) => {
    switch (type) {
      case "irrigation":
        return "bg-cyan-500/10 border-cyan-500/30"
      case "cultivation":
        return "bg-pink-500/10 border-pink-500/30"
      default:
        return "bg-purple-500/10 border-purple-500/30"
    }
  }

  const getTaskText = (type: string) => {
    switch (type) {
      case "irrigation":
        return "Sulama"
      case "cultivation":
        return "Tarla İşleme"
      default:
        return type
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/20 text-green-400 border-green-500/50 hover:bg-green-500/30"
      case "pending":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50 hover:bg-yellow-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/50 hover:bg-gray-500/30"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Tamamlandı"
      case "pending":
        return "Bekliyor"
      default:
        return status
    }
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <div key={task.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-purple-500/10 transition-colors">
          <div className={`h-10 w-10 rounded-md ${getTaskBgColor(task.type)} flex items-center justify-center border`}>
            {getTaskIcon(task.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{task.fieldName}</p>
            <p className="text-xs text-muted-foreground truncate">{task.location}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge className={`${getStatusBadgeColor(task.status)} border`}>{getTaskText(task.type)}</Badge>
            <p className="text-xs text-muted-foreground">{task.date}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

