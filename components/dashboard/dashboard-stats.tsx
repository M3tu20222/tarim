// components/dashboard/dashboard-stats.tsx
"use client"; // Client Component olduğunu belirt

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DashboardStatsProps {
  statTitle: string; // Düzeltildi
  statValue: string | number; // Düzeltildi
  statDescription: string; // Düzeltildi
  trend: "up" | "down";
  trendValue: string | number;
  icon?: string;
  className?: string;
}

export function DashboardStats({
  statTitle, // Düzeltildi
  statValue, // Düzeltildi
  statDescription, // Düzeltildi
  trend,
  trendValue,
  icon,
  className,
}: DashboardStatsProps) {
  return (
    <Card className={cn("shadow-sm", className)}>
      <CardHeader className="pb-0">
        <CardTitle>{statTitle}</CardTitle> {/* Düzeltildi */}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{statValue}</div> {/* Düzeltildi */}
        <CardDescription>{statDescription}</CardDescription> {/* Düzeltildi */}
      </CardContent>
      <CardFooter>
        <Badge
          variant={trend === "up" ? "default" : "destructive"}
          className={cn(
            trend === "up"
              ? "bg-green-600/20 text-green-600"
              : "bg-red-600/20 text-red-600"
          )}
        >
          {trend === "up" ? "+" : "-"}
          {trendValue}
        </Badge>
      </CardFooter>
    </Card>
  );
}
