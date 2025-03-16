import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlusIcon } from "lucide-react"
import { OwnerOverviewStats } from "@/components/owner-overview-stats"
import { OwnerRecentFields } from "@/components/owner-recent-fields"
import { OwnerIrrigationChart } from "@/components/owner-irrigation-chart"

export default function OwnerDashboard() {
  return (
    <DashboardLayout title="Genel Bakış">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold neon-text-purple">Genel Bakış</h1>
            <p className="text-muted-foreground">Tarlalarınız ve aktiviteleriniz hakkında genel bilgiler</p>
          </div>

          <Button className="btn-cyberpunk">
            <PlusIcon className="mr-2 h-4 w-4" />
            Yeni Tarla Ekle
          </Button>
        </div>

        <OwnerOverviewStats />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="card-cyberpunk lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg neon-text-cyan">Sulama Aktivitesi</CardTitle>
              <CardDescription>Son 30 günlük sulama aktivitesi</CardDescription>
            </CardHeader>
            <CardContent>
              <OwnerIrrigationChart />
            </CardContent>
          </Card>

          <Card className="card-cyberpunk">
            <CardHeader>
              <CardTitle className="text-lg neon-text-cyan">Son Tarlalar</CardTitle>
              <CardDescription>Son eklenen tarlalar</CardDescription>
            </CardHeader>
            <CardContent>
              <OwnerRecentFields />
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

