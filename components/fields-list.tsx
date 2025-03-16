"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import {
  DropletIcon,
  EditIcon,
  EyeIcon,
  MoreHorizontalIcon,
  SproutIcon as SeedlingIcon,
  TractorIcon,
} from "lucide-react"

type Field = {
  id: string
  name: string
  location: string
  size: string
  crop: string
  lastIrrigation: string
  status: "active" | "fallow" | "harvested"
}

export function FieldsList() {
  // Mock data - will be replaced with actual data from API
  const [fields] = useState<Field[]>([
    {
      id: "1",
      name: "Merkez Tarla",
      location: "Adana, Merkez",
      size: "120 dönüm",
      crop: "Buğday",
      lastIrrigation: "2023-06-15",
      status: "active",
    },
    {
      id: "2",
      name: "Doğu Tarla",
      location: "Adana, Ceyhan",
      size: "85 dönüm",
      crop: "Mısır",
      lastIrrigation: "2023-06-10",
      status: "active",
    },
    {
      id: "3",
      name: "Batı Tarla",
      location: "Adana, Seyhan",
      size: "150 dönüm",
      crop: "Pamuk",
      lastIrrigation: "2023-06-05",
      status: "active",
    },
    {
      id: "4",
      name: "Güney Tarla",
      location: "Adana, Yüreğir",
      size: "95 dönüm",
      crop: "Arpa",
      lastIrrigation: "2023-05-28",
      status: "harvested",
    },
    {
      id: "5",
      name: "Kuzey Tarla",
      location: "Adana, Karataş",
      size: "110 dönüm",
      crop: "-",
      lastIrrigation: "2023-04-20",
      status: "fallow",
    },
  ])

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/20 text-green-400 border-green-500/50"
      case "fallow":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50"
      case "harvested":
        return "bg-blue-500/20 text-blue-400 border-blue-500/50"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/50"
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
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-purple-500/30">
            <TableHead>Tarla Adı</TableHead>
            <TableHead>Konum</TableHead>
            <TableHead>Büyüklük</TableHead>
            <TableHead>Ekili Ürün</TableHead>
            <TableHead>Son Sulama</TableHead>
            <TableHead>Durum</TableHead>
            <TableHead className="text-right">İşlemler</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fields.map((field) => (
            <TableRow key={field.id} className="border-purple-500/30">
              <TableCell className="font-medium">{field.name}</TableCell>
              <TableCell>{field.location}</TableCell>
              <TableCell>{field.size}</TableCell>
              <TableCell>{field.crop}</TableCell>
              <TableCell>{field.lastIrrigation}</TableCell>
              <TableCell>
                <Badge className={`${getStatusBadgeColor(field.status)} border`}>{getStatusText(field.status)}</Badge>
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
                      <EditIcon className="mr-2 h-4 w-4" />
                      <span>Düzenle</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">
                      <DropletIcon className="mr-2 h-4 w-4" />
                      <span>Sulama Kaydı</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">
                      <TractorIcon className="mr-2 h-4 w-4" />
                      <span>İşleme Kaydı</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">
                      <SeedlingIcon className="mr-2 h-4 w-4" />
                      <span>Ürün Değiştir</span>
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

