"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";

interface ProcessUpdateFormProps {
  process: any;
  userId: string;
}

export function ProcessUpdateForm({ process, userId }: ProcessUpdateFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(process.processedPercentage);
  const [notes, setNotes] = useState(process.description || "");
  const [isCompleted, setIsCompleted] = useState(process.processedPercentage === 100);

  const handleProgressChange = (value: number[]) => {
    const newProgress = value[0];
    setProgress(newProgress);
    setIsCompleted(newProgress === 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/worker/processes/${process.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          processedPercentage: progress,
          description: notes,
          userId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "İşlem güncellendi",
          description: isCompleted 
            ? "İşlem başarıyla tamamlandı olarak işaretlendi." 
            : "İşlem ilerleme durumu güncellendi.",
          variant: "default",
        });
        router.refresh();
      } else {
        toast({
          title: "Hata",
          description: data.error || "İşlem güncellenirken bir hata oluştu.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Hata",
        description: "İşlem güncellenirken bir hata oluştu.",
        variant: "destructive",
      });
      console.error("İşlem güncelleme hatası:", error);
    } finally {
      setLoading(false);
    }
  };

  // Bugünün tarihini al
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Process tarihini al
  const processDate = new Date(process.date);
  processDate.setHours(0, 0, 0, 0);
  
  // İleri tarihli mi kontrol et
  const isUpcoming = processDate > today;

  return (
    <Card>
      <CardHeader>
        <CardTitle>İşlem Güncelle</CardTitle>
        <CardDescription>
          İşlem ilerleme durumunu ve notlarını güncelleyin
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="progress">İlerleme Durumu ({progress}%)</Label>
            <Slider
              id="progress"
              disabled={isUpcoming || loading}
              value={[progress]}
              min={0}
              max={100}
              step={5}
              onValueChange={handleProgressChange}
              className="py-4"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notlar</Label>
            <Textarea
              id="notes"
              placeholder="İşlem hakkında notlar..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isUpcoming || loading}
              rows={4}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            type="submit" 
            disabled={isUpcoming || loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Güncelleniyor...
              </>
            ) : isCompleted ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Tamamlandı Olarak İşaretle
              </>
            ) : (
              "İlerlemeyi Güncelle"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
