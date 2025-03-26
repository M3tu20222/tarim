// components/dashboard/weather-widget.tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface WeatherWidgetProps {
  location?: string;
  temperature?: number;
  condition?: string;
}

export function WeatherWidget({
  location = "Konum Belirsiz",
  temperature = 25,
  condition = "Güneşli",
}: WeatherWidgetProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hava Durumu</CardTitle>
        <CardDescription>{location}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-bold">{temperature}°C</div>
        <div className="text-sm text-muted-foreground">{condition}</div>
      </CardContent>
    </Card>
  );
}
