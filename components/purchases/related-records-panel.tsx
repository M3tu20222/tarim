import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export function RelatedRecordsPanel({ purchaseId }: { purchaseId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState("debts");

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/purchases/${purchaseId}/full-details`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("İlişkili kayıtlar yüklenemedi.");
        }
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Bir hata oluştu");
        setLoading(false);
      });
  }, [purchaseId]);

  if (loading) {
    return <Card className="mb-4"><CardHeader><CardTitle>İlişkili Kayıtlar</CardTitle></CardHeader><CardContent>Yükleniyor...</CardContent></Card>;
  }
  if (error) {
    return <Alert variant="destructive" className="mb-4"><AlertTitle>Hata</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  }
  if (!data) {
    return null;
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>İlişkili Kayıtlar</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList>
            <TabsTrigger value="debts">Borçlar</TabsTrigger>
            <TabsTrigger value="inventory">Envanter</TabsTrigger>
            <TabsTrigger value="processes">İşlemler</TabsTrigger>
            <TabsTrigger value="irrigation">Sulama</TabsTrigger>
            <TabsTrigger value="approvals">Onaylar</TabsTrigger>
          </TabsList>
          <TabsContent value="debts">
            {data.debts && data.debts.length > 0 ? (
              <ul className="list-disc ml-6">
                {data.debts.map((debt: any) => (
                  <li key={debt.id}>
                    Borç ID: {debt.id} - Tutar: {debt.amount || "-"}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-muted-foreground">Kayıt yok.</div>
            )}
          </TabsContent>
          <TabsContent value="inventory">
            {data.inventoryTransactions && data.inventoryTransactions.length > 0 ? (
              <ul className="list-disc ml-6">
                {data.inventoryTransactions.map((trx: any) => (
                  <li key={trx.id}>
                    Envanter: {trx.inventory?.name || "-"} (ID: {trx.inventoryId})
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-muted-foreground">Kayıt yok.</div>
            )}
          </TabsContent>
          <TabsContent value="processes">
            {data.season && data.season.processes && data.season.processes.length > 0 ? (
              <ul className="list-disc ml-6">
                {(data.season.processes
                  .filter((proc: any) => {
                    // contributors: [{ user: { id, name } }]
                    if (!data.contributors || data.contributors.length === 0) return false;
                    // process'in sahibi/ilgili kullanıcısı proc.userId veya proc.ownerId olabilir
                    const contributorIds = data.contributors.map((c: any) => c.user?.id || c.userId);
                    return contributorIds.includes(proc.userId) || contributorIds.includes(proc.ownerId);
                  })
                  .map((proc: any) => {
                    const processTypeLabels: Record<string, string> = {
                      PLOWING: "Sürme (Toprağın işlenmesi)",
                      SEEDING: "Ekim (Tohum ekimi)",
                      FERTILIZING: "Gübreleme (Gübre uygulaması)",
                      PESTICIDE: "İlaçlama (Zirai mücadele)",
                      HARVESTING: "Hasat (Ürün toplama)",
                      OTHER: "Diğer (Belirtiniz)",
                    };
                    const label = proc.type ? processTypeLabels[proc.type] || proc.type : proc.id;
                    const fieldName = proc.field?.name || proc.fieldName || "-";
                    const dateStr = proc.date ? new Date(proc.date).toLocaleDateString() : "-";
                    const desc = proc.description ? ` | Açıklama: ${proc.description}` : "";
                    return (
                      <li key={proc.id}>
                        İşlem: {label} | Tarla: {fieldName} | Tarih: {dateStr}{desc}
                      </li>
                    );
                  })
                )}
              </ul>
            ) : (
              <div className="text-muted-foreground">Kayıt yok.</div>
            )}
          </TabsContent>
          <TabsContent value="irrigation">
            {data.season && data.season.irrigationLogs && data.season.irrigationLogs.length > 0 ? (
              <ul className="list-disc ml-6">
                {data.season.irrigationLogs.map((log: any) => (
                  <li key={log.id}>
                    Sulama Tarihi: {log.date ? new Date(log.date).toLocaleDateString() : log.id}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-muted-foreground">Kayıt yok.</div>
            )}
          </TabsContent>
          <TabsContent value="approvals">
            {data.approvals && data.approvals.length > 0 ? (
              <ul className="list-disc ml-6">
                {data.approvals.map((approval: any) => (
                  <li key={approval.id}>
                    {approval.status} - {approval.approver?.name || approval.approverId}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-muted-foreground">Kayıt yok.</div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
