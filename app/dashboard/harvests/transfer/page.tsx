"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  Loader2,
  ArrowRight,
  CheckCircle,
  XCircle,
  MapPin,
  Calendar,
  Package,
  AlertTriangle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Field {
  id: string;
  name: string;
  location: string;
  size: number;
  season?: {
    id: string;
    name: string;
  };
  crops: {
    id: string;
    name: string;
    cropType: string;
    status: string;
  }[];
}

interface Season {
  id: string;
  name: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
}

interface TransferResult {
  fieldId: string;
  fieldName: string;
  previousSeason?: string;
  newSeason: string;
  cropsTransferred: number;
  status: "success" | "error";
  error?: string;
}

export default function HarvestTransferPage() {
  const [harvestedFields, setHarvestedFields] = useState<Field[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [targetSeasonId, setTargetSeasonId] = useState("");
  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);
  const [transferResults, setTransferResults] = useState<TransferResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetchHarvestedFields();
    fetchSeasons();
  }, []);

  const fetchHarvestedFields = async () => {
    try {
      const response = await fetch("/api/fields?includeOwnerships=true&fetchAll=true");
      if (!response.ok) throw new Error("Tarlalar yüklenemedi");

      const data = await response.json();
      const fields = data.data || [];

      // Hasat edilmiş tarlaları filtrele
      const harvestedFields = fields.filter((field: any) => {
        return field.crops && field.crops.length > 0 &&
               field.crops.every((crop: any) => crop.status === "HARVESTED");
      });

      setHarvestedFields(harvestedFields);
    } catch (error) {
      console.error("Error fetching harvested fields:", error);
      toast({
        title: "Hata",
        description: "Hasat edilmiş tarlalar yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  const fetchSeasons = async () => {
    try {
      const response = await fetch("/api/seasons?fetchAll=true");
      if (!response.ok) throw new Error("Sezonlar yüklenemedi");

      const data = await response.json();
      setSeasons(data.data || []);
    } catch (error) {
      console.error("Error fetching seasons:", error);
      toast({
        title: "Hata",
        description: "Sezonlar yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFieldSelection = (fieldId: string, checked: boolean) => {
    if (checked) {
      setSelectedFields(prev => [...prev, fieldId]);
    } else {
      setSelectedFields(prev => prev.filter(id => id !== fieldId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFields(harvestedFields.map(field => field.id));
    } else {
      setSelectedFields([]);
    }
  };

  const handleTransfer = async () => {
    if (!targetSeasonId || selectedFields.length === 0) {
      toast({
        title: "Hata",
        description: "Hedef sezon ve en az bir tarla seçmelisiniz.",
        variant: "destructive",
      });
      return;
    }

    setTransferring(true);
    try {
      const response = await fetch("/api/harvests/transfer-to-season", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetSeasonId,
          fieldIds: selectedFields,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Transfer işlemi başarısız oldu");
      }

      const data = await response.json();
      setTransferResults(data.data.results);
      setShowResults(true);

      toast({
        title: "Başarılı",
        description: data.message,
      });

      // Sonuçları gösterdikten sonra tarla listesini yenile
      fetchHarvestedFields();
      setSelectedFields([]);
      setTargetSeasonId("");

    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTransferring(false);
    }
  };

  const getCropTypeLabel = (cropType: string) => {
    const types: { [key: string]: string } = {
      CORN: "Mısır",
      WHEAT: "Buğday",
      BEAN: "Fasulye",
      CHICKPEA: "Nohut",
      CUMIN: "Kimyon",
      CANOLA: "Kanola",
      OATS: "Yulaf",
      BARLEY: "Arpa",
      SUNFLOWER: "Ayçiçeği",
      COTTON: "Pamuk",
      SUGAR_BEET: "Şeker Pancarı",
      POTATO: "Patates",
      TOMATO: "Domates",
      ONION: "Soğan",
      OTHER: "Diğer",
    };
    return types[cropType] || cropType;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Yükleniyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Sezon Aktarımı</h1>
          <p className="text-muted-foreground">
            Hasat edilmiş tarlaları yeni sezona aktarın
          </p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          Geri Dön
        </Button>
      </div>

      {/* Transfer Results */}
      {showResults && transferResults.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Transfer Sonuçları
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {transferResults.map((result, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    result.status === "success"
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {result.status === "success" ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <p className="font-medium">{result.fieldName}</p>
                      {result.status === "success" ? (
                        <p className="text-sm text-muted-foreground">
                          {result.cropsTransferred} ekin yeni sezona aktarıldı
                        </p>
                      ) : (
                        <p className="text-sm text-red-600">{result.error}</p>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={result.status === "success" ? "default" : "destructive"}
                  >
                    {result.status === "success" ? "Başarılı" : "Hatalı"}
                  </Badge>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Button
                variant="outline"
                onClick={() => setShowResults(false)}
              >
                Sonuçları Gizle
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {harvestedFields.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Hasat Edilmiş Tarla Bulunamadı</h3>
            <p className="text-muted-foreground text-center">
              Yeni sezona aktarılabilecek hasat edilmiş tarla bulunmuyor.
              Önce tarlaların hasadını tamamlayın.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tarla Seçimi */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Hasat Edilmiş Tarlalar</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="select-all"
                      checked={selectedFields.length === harvestedFields.length}
                      onCheckedChange={handleSelectAll}
                    />
                    <label htmlFor="select-all" className="text-sm font-medium">
                      Tümünü Seç
                    </label>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {harvestedFields.length} hasat edilmiş tarla bulundu
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {harvestedFields.map((field) => (
                    <div
                      key={field.id}
                      className={`border rounded-lg p-4 transition-colors ${
                        selectedFields.includes(field.id)
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            id={field.id}
                            checked={selectedFields.includes(field.id)}
                            onCheckedChange={(checked) =>
                              handleFieldSelection(field.id, checked as boolean)
                            }
                          />
                          <div className="flex-1">
                            <h3 className="font-semibold">{field.name}</h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {field.location}
                              </div>
                              <span>{field.size} dönüm</span>
                            </div>

                            {field.season && (
                              <div className="flex items-center gap-1 mt-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <Badge variant="outline">
                                  Mevcut: {field.season.name}
                                </Badge>
                              </div>
                            )}

                            <div className="flex flex-wrap gap-1 mt-2">
                              {field.crops.map((crop) => (
                                <Badge
                                  key={crop.id}
                                  variant="outline"
                                  className="bg-green-50 text-green-700 border-green-200"
                                >
                                  {crop.name} ({getCropTypeLabel(crop.cropType)})
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transfer Ayarları */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Transfer Ayarları</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Hedef Sezon</label>
                  <Select value={targetSeasonId} onValueChange={setTargetSeasonId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sezon seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {seasons.map((season) => (
                        <SelectItem key={season.id} value={season.id}>
                          {season.name}
                          {season.isActive && " (Aktif)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Transfer İşlemi Hakkında</p>
                      <ul className="text-xs space-y-1">
                        <li>• Seçilen tarlalar hedef sezona aktarılacak</li>
                        <li>• Her tarla için yeni ekin kayıtları oluşturulacak</li>
                        <li>• Eski ekin kayıtları "Hasat Edildi" durumunda kalacak</li>
                        <li>• Bu işlem geri alınamaz</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="text-sm text-muted-foreground mb-4">
                    <p>Seçilen: {selectedFields.length} tarla</p>
                    {targetSeasonId && (
                      <p>
                        Hedef: {seasons.find(s => s.id === targetSeasonId)?.name}
                      </p>
                    )}
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        className="w-full"
                        disabled={!targetSeasonId || selectedFields.length === 0 || transferring}
                      >
                        {transferring ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Aktarılıyor...
                          </>
                        ) : (
                          <>
                            <ArrowRight className="mr-2 h-4 w-4" />
                            Transfer Et
                          </>
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Sezon Aktarımını Onayla</AlertDialogTitle>
                        <AlertDialogDescription>
                          {selectedFields.length} tarla {seasons.find(s => s.id === targetSeasonId)?.name} sezonuna aktarılacak.
                          Bu işlem geri alınamaz. Devam etmek istediğinize emin misiniz?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleTransfer}>
                          Onayla ve Aktar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}