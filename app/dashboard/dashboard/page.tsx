import { Suspense } from "react";
import { ProtectedPage } from "@/components/protected-page";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { Skeleton } from "@/components/ui/skeleton";

function AdminDashboardContent() {
    return <div>Admin Content</div>;
}
function WorkerDashboardContent() {
    return <div>Worker Content</div>;
}

function OwnerDashboardContent() {
  return (
      <>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Tarım işletmenizin genel durumuna hoş geldiniz.
        </p>

        <Suspense fallback={<DashboardStatsSkeleton />}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {statsData.map((stat, index) => (
              <DashboardStats key={index} {...stat} />
            ))}
          </div>
        </Suspense>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Genel Bakış</CardTitle>
              <CardDescription>
                İşletmenizin performansını zaman içinde görüntüleyin.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">
                  Grafik burada görüntülenecek
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Son Aktiviteler</CardTitle>
              <CardDescription>
                Son işlemleriniz ve aktiviteleriniz.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense
                fallback={
                  <div className="h-[300px] flex items-center justify-center">
                    <Skeleton className="h-[300px] w-full" />
                  </div>
                }
              >
                <RecentActivity />
              </Suspense>
            </CardContent>
          </Card>
        </div>
    </>
  )
}


// Örnek istatistik verileri
const statsData = [
  {
    statTitle: "Total Fields",
    statValue: "15",
    statDescription: "Active fields",
    trend: "up" as const,
    trendValue: "+2",
  },
  {
    statTitle: "Inventory Items",
    statValue: "42",
    statDescription: "In stock",
    trend: "down" as const,
    trendValue: "-3",
  },
  {
    statTitle: "Pending Debts",
    statValue: "$500",
    statDescription: "Due this month",
    trend: "up" as const,
    trendValue: "+1",
  },
  {
    statTitle: "Recent Purchases",
    statValue: "8",
    statDescription: "This week",
    trend: "up" as const,
    trendValue: "+1",
  },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-4">
      <ProtectedPage allowedRoles={["admin", "owner", "worker"]}>
        <OwnerDashboardContent/>
      </ProtectedPage>
      <ProtectedPage allowedRoles={["admin"]}>
        <AdminDashboardContent/>
      </ProtectedPage>
      <ProtectedPage allowedRoles={["worker"]}>
        <WorkerDashboardContent/>
      </ProtectedPage>
    </div>
  );
}

function DashboardStatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array(4)
        .fill(0)
        .map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <Skeleton className="h-4 w-[100px]" />
              </CardTitle>
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[60px]" />
              <Skeleton className="h-4 w-[120px] mt-2" />
            </CardContent>
          </Card>
        ))}
    </div>
  );
}
