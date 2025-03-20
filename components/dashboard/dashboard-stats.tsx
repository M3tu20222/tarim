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
  label: string;
  value: string | number;
  description: string;
  trend: "up" | "down";
  trendValue: string | number;
  icon?: string;
  className?: string;
}

export function DashboardStats({
  label,
  value,
  description,
  trend,
  trendValue,
  icon,
  className,
}: DashboardStatsProps) {
  return (
    <Card className={cn("shadow-sm", className)}>
      <CardHeader className="pb-0">
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <CardDescription>{description}</CardDescription>
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
