"use client";

import { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

interface Well {
  id: string;
  name: string;
  depth: number;
  capacity: number;
  status: string;
}

interface WorkerSettingsProps {
  userId: string;
}

export function WorkerSettings({ userId }: WorkerSettingsProps) {
  const router = useRouter();
  const [wells, setWells] = useState<Well[]>([]);
  const [selectedWellId, setSelectedWellId] = useState<string>("");
  const [currentAssignment, setCurrentAssignment] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Fetch wells and current assignment
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch wells
        const wellsResponse = await fetch("/api/wells");
        const wellsData = await wellsResponse.json();
        console.log("Wells data:", wellsData); // Debug için log ekleyelim

        if (Array.isArray(wellsData)) {
          // Eğer doğrudan dizi dönüyorsa
          setWells(wellsData);
        } else if (wellsData.data && Array.isArray(wellsData.data)) {
          // Eğer data property'si içinde dizi dönüyorsa
          setWells(wellsData.data);
        } else {
          console.error("Unexpected wells data format:", wellsData);
          setWells([]);
        }

        // Fetch current assignment
        const assignmentResponse = await fetch(
          `/api/worker/well-assignment?workerId=${userId}`
        );
        const assignmentData = await assignmentResponse.json();
        console.log("Assignment data:", assignmentData); // Debug için log ekleyelim

        if (assignmentData.data) {
          setCurrentAssignment(assignmentData.data);
          setSelectedWellId(assignmentData.data.wellId);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Hata",
          description: "Veriler yüklenirken bir hata oluştu.",
          variant: "destructive",
        });
      } finally {
        setInitialLoading(false);
      }
    };

    fetchData();
  }, [userId, toast]);

  const handleSave = async () => {
    if (!selectedWellId) {
      toast({
        title: "Hata",
        description: "Lütfen bir kuyu seçin.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/worker/well-assignment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workerId: userId,
          wellId: selectedWellId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error || "Kuyu ataması yapılırken bir hata oluştu."
        );
      }

      const data = await response.json();
      setCurrentAssignment(data.data);

      toast({
        title: "Başarılı",
        description: "Kuyu ataması başarıyla güncellendi.",
      });

      router.refresh();
    } catch (error: any) {
      console.error("Error saving well assignment:", error);
      toast({
        title: "Hata",
        description:
          error.message || "Kuyu ataması yapılırken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>İşçi Ayarları</CardTitle>
        <CardDescription>
          Çalışma ayarlarınızı buradan yapabilirsiniz.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="well">Atanmış Kuyu</Label>
          <Select value={selectedWellId} onValueChange={setSelectedWellId}>
            <SelectTrigger>
              <SelectValue placeholder="Kuyu Seçin" />
            </SelectTrigger>
            <SelectContent>
              {wells.map((well) => (
                <SelectItem key={well.id} value={well.id}>
                  {well.name} ({well.depth} metre, {well.capacity} m³/saat)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {currentAssignment && (
            <p className="text-sm text-muted-foreground mt-2">
              Şu anda{" "}
              <span className="font-medium">{currentAssignment.well.name}</span>{" "}
              kuyusuna atanmışsınız.
            </p>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={loading || selectedWellId === currentAssignment?.wellId}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Kaydet
        </Button>
      </CardFooter>
    </Card>
  );
}
