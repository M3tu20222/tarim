// components/dashboard/dashboard-stats.tsx
"use client"; // Client Component oldugunu belirt

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
  statTitle: string; // Duzeltildi
  statValue: string | number; // Duzeltildi
  statDescription: string; // Duzeltildi
  trend: "up" | "down";
  trendValue: string | number;
  className?: string;
}

export function DashboardStats({
  statTitle, // Duzeltildi
  statValue, // Duzeltildi
  statDescription, // Duzeltildi
  trend,
  trendValue,
  className,
}: DashboardStatsProps) {
  return (
    <Card className={cn("shadow-sm", className)}>
      <CardHeader className="pb-0">
        <CardTitle>{statTitle}</CardTitle> {/* Duzeltildi */}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{statValue}</div> {/* Duzeltildi */}
        <CardDescription>{statDescription}</CardDescription> {/* Duzeltildi */}
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
