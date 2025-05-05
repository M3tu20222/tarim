"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { Droplet } from "lucide-react";

interface WorkerSettingsProps {
  worker: {
    id: string;
    name: string;
    email: string;
  };
  wells: {
    id: string;
    name: string;
    depth: number;
    capacity: number;
  }[];
  assignedWell: {
    id: string;
    name: string;
  } | null;
}

export function WorkerSettings({
  worker,
  wells,
  assignedWell,
}: WorkerSettingsProps) {
  const router = useRouter();
  const [selectedWellId, setSelectedWellId] = useState<string>(
    assignedWell?.id || ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      const response = await fetch("/api/worker/well-assignment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workerId: worker.id,
          wellId: selectedWellId || null, // If empty string, send null to remove assignment
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error || "Kuyu ataması yapılırken bir hata oluştu"
        );
      }

      toast({
        title: "Başarılı",
        description: selectedWellId
          ? "Kuyu ataması başarıyla güncellendi"
          : "Kuyu ataması kaldırıldı",
      });

      router.refresh();
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message || "Kuyu ataması yapılırken bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kuyu Ataması</CardTitle>
        <CardDescription>
          Çalışacağınız kuyuyu seçin. Bu kuyu ile ilişkili tarlalara erişim
          sağlayacaksınız.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="well">Kuyu Seçimi</Label>
          <Select value={selectedWellId} onValueChange={setSelectedWellId}>
            <SelectTrigger id="well">
              <SelectValue placeholder="Kuyu seçin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no-well">Kuyu atanmamış</SelectItem>
              {wells.map((well) => (
                <SelectItem key={well.id} value={well.id}>
                  {well.name} ({well.depth}m, {well.capacity} lt/dk)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {assignedWell && (
          <div className="bg-blue-50 p-4 rounded-md">
            <div className="flex items-center">
              <Droplet className="h-5 w-5 text-blue-500 mr-2" />
              <div>
                <p className="text-sm font-medium text-blue-800">
                  Mevcut Kuyu Ataması
                </p>
                <p className="text-sm text-blue-700">{assignedWell.name}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Kaydediliyor..." : "Kaydet"}
        </Button>
      </CardFooter>
    </Card>
  );
}
