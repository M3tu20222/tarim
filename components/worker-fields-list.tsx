"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { DropletIcon, EyeIcon, MoreHorizontalIcon, TractorIcon } from "lucide-react"

type Field = {
  id: string
  name: string
  location: string
  crop: string
  lastIrrigation: string
  irrigationStatus: "needed" | "recent" | "upcoming"
  cultivationStatus: "needed" | "recent" | "upcoming"
}

export function WorkerFieldsList() {
  // Mock data - will be replaced with actual data from API
  const [fields] = useState<Field[]>([
    {
      id: "1",
      name: "Merkez Tarla",
      location: "Adana, Merkez",
      crop: "Buğday",
      lastIrrigation: "2023-06-15",
      irrigationStatus: "needed",
      cultivationStatus: "recent",
    },
    {
      id: "2",
      name: "Doğu Tarla",
      location: "Adana, Ceyhan",
      crop: "Mısır",
      lastIrrigation: "2023-06-10",
      irrigationStatus: "recent",
      cultivationStatus: "needed",
    },
    {
      id: "3",
      name: "Batı Tarla",
      location: "Adana, Seyhan",
      crop: "Pamuk",
      lastIrrigation: "2023-06-05",
      irrigationStatus: "needed",
      cultivationStatus: "upcoming",
    },
    {
      id: "4",
      name: "Güney Tarla",
      location: "Adana, Yüreğir",
      crop: "Arpa",
      lastIrrigation: "2023-05-28",
      irrigationStatus: "upcoming",
      cultivationStatus: "recent",
    },
  ])

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "needed":
        return "bg-red-500/20 text-red-400 border-red-500/50"
      case "recent":
        return "bg-green-500/20 text-green-400 border-green-500/50"
      case "upcoming":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/50"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "needed":
        return "Gerekli"
      case "recent":
        return "Yakın Zamanda"
      case "upcoming":
        return "Yaklaşıyor"
      default:
        return status
    }
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-purple-500/30">
            <TableHead>Tarla Adı</TableHead>
            <TableHead>Konum</TableHead>
            <TableHead>Ekili Ürün</TableHead>
            <TableHead>Son Sulama</TableHead>
            <TableHead>Sulama Durumu</TableHead>
            <TableHead>İşleme Durumu</TableHead>
            <TableHead className="text-right">İşlemler</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fields.map((field) => (
            <TableRow key={field.id} className="border-purple-500/30">
              <TableCell className="font-medium">{field.name}</TableCell>
              <TableCell>{field.location}</TableCell>
              <TableCell>{field.crop}</TableCell>
              <TableCell>{field.lastIrrigation}</TableCell>
              <TableCell>
                <Badge className={`${getStatusBadgeColor(field.irrigationStatus)} border`}>
                  {getStatusText(field.irrigationStatus)}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={`${getStatusBadgeColor(field.cultivationStatus)} border`}>
                  {getStatusText(field.cultivationStatus)}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontalIcon className="h-4 w-4" />
                      <span className="sr-only">Menü</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-sm border-purple-500/30">
                    <DropdownMenuItem className="cursor-pointer">
                      <EyeIcon className="mr-2 h-4 w-4" />
                      <span>Detaylar</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">
                      <DropletIcon className="mr-2 h-4 w-4" />
                      <span>Sulama Kaydı Ekle</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">
                      <TractorIcon className="mr-2 h-4 w-4" />
                      <span>İşleme Kaydı Ekle</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

