import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { WorkerOverviewStats } from "@/components/worker-overview-stats"
import { WorkerRecentTasks } from "@/components/worker-recent-tasks"
import { WorkerTasksChart } from "@/components/worker-tasks-chart"

export default function WorkerDashboard() {
  return (
    <DashboardLayout title="Genel Bakış">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold neon-text-purple">Genel Bakış</h1>
          <p className="text-muted-foreground">Görevleriniz ve aktiviteleriniz hakkında genel bilgiler</p>
        </div>

        <WorkerOverviewStats />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="card-cyberpunk lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg neon-text-cyan">Görev Aktivitesi</CardTitle>
              <CardDescription>Son 30 günlük görev aktivitesi</CardDescription>
            </CardHeader>
            <CardContent>
              <WorkerTasksChart />
            </CardContent>
          </Card>

          <Card className="card-cyberpunk">
            <CardHeader>
              <CardTitle className="text-lg neon-text-cyan">Son Görevler</CardTitle>
              <CardDescription>Son tamamlanan görevler</CardDescription>
            </CardHeader>
            <CardContent>
              <WorkerRecentTasks />
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

