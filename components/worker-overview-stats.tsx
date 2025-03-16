"use client"

import { Card, CardContent } from "@/components/ui/card"
import { MapIcon, DropletIcon, TractorIcon, TrendingUpIcon, TrendingDownIcon } from "lucide-react"

export function WorkerOverviewStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card className="card-cyberpunk overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-center">
            <div className="p-4 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Atanmış Tarla</span>
                <div className="flex items-center text-green-500 text-xs font-medium">
                  <TrendingUpIcon className="h-3 w-3 mr-1" />
                  <span>5%</span>
                </div>
              </div>
              <div className="mt-1 flex items-baseline">
                <span className="text-3xl font-bold neon-text-purple">4</span>
                <span className="ml-2 text-sm text-muted-foreground">tarla</span>
              </div>
            </div>
            <div className="h-full bg-purple-500/10 p-4 flex items-center justify-center">
              <MapIcon className="h-8 w-8 text-purple-400" />
            </div>
          </div>
          <div className="h-1 w-full bg-gradient-to-r from-purple-600 to-cyan-600 animate-pulse-neon"></div>
        </CardContent>
      </Card>

      <Card className="card-cyberpunk overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-center">
            <div className="p-4 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Sulama Bekleyen</span>
                <div className="flex items-center text-red-500 text-xs font-medium">
                  <TrendingUpIcon className="h-3 w-3 mr-1" />
                  <span>10%</span>
                </div>
              </div>
              <div className="mt-1 flex items-baseline">
                <span className="text-3xl font-bold neon-text-cyan">2</span>
                <span className="ml-2 text-sm text-muted-foreground">tarla</span>
              </div>
            </div>
            <div className="h-full bg-cyan-500/10 p-4 flex items-center justify-center">
              <DropletIcon className="h-8 w-8 text-cyan-400" />
            </div>
          </div>
          <div className="h-1 w-full bg-gradient-to-r from-cyan-600 to-blue-600 animate-pulse-neon"></div>
        </CardContent>
      </Card>

      <Card className="card-cyberpunk overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-center">
            <div className="p-4 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">İşleme Bekleyen</span>
                <div className="flex items-center text-yellow-500 text-xs font-medium">
                  <TrendingDownIcon className="h-3 w-3 mr-1" />
                  <span>3%</span>
                </div>
              </div>
              <div className="mt-1 flex items-baseline">
                <span className="text-3xl font-bold neon-text-pink">1</span>
                <span className="ml-2 text-sm text-muted-foreground">tarla</span>
              </div>
            </div>
            <div className="h-full bg-pink-500/10 p-4 flex items-center justify-center">
              <TractorIcon className="h-8 w-8 text-pink-400" />
            </div>
          </div>
          <div className="h-1 w-full bg-gradient-to-r from-pink-600 to-purple-600 animate-pulse-neon"></div>
        </CardContent>
      </Card>
    </div>
  )
}

