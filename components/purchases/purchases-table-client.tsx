"use client";

import { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PurchaseActions } from "./purchase-actions";
import { PurchaseDetailsModal } from "./purchase-details-modal";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PurchaseContributor {
  id: string;
  isCreditor: boolean;
  contribution: number;
  user: {
    id: string;
    name: string;
  };
}

interface PurchaseWithRelations {
  id: string;
  product: string;
  quantity: number;
  unitPrice: number;
  unit: string | null;
  totalCost: number;
  paymentMethod: string;
  createdAt: Date;
  contributors: PurchaseContributor[];
  debts: {
    id: string;
    status?: string;
    creditor: {
      id: string;
      name: string;
    };
    debtor: {
      id: string;
      name: string;
    };
  }[];
}

interface PurchasesTableClientProps {
  purchases: PurchaseWithRelations[];
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function PurchasesTableClient({ purchases }: PurchasesTableClientProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Handle view details
  const handleViewDetails = (purchaseId: string) => {
    setSelectedPurchaseId(purchaseId);
    setModalOpen(true);
  };

  // Calculate pagination
  const totalItems = purchases.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedPurchases = purchases.slice(startIndex, endIndex);

  // Handle page size change
  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    setCurrentPage(1); // Reset to first page when changing page size
  };

  // Navigation handlers
  const goToFirstPage = () => setCurrentPage(1);
  const goToPreviousPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const goToNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const goToLastPage = () => setCurrentPage(totalPages);

  return (
    <div className="space-y-4">
      <div className="rounded-md border overflow-x-auto [&_table]:overflow-visible">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ürün</TableHead>
              <TableHead>Miktar</TableHead>
              <TableHead>Birim</TableHead>
              <TableHead>Toplam Maliyet</TableHead>
              <TableHead>Ödeme Yöntemi</TableHead>
              <TableHead>Katkıda Bulunanlar</TableHead>
              <TableHead>Tarih</TableHead>
              <TableHead className="text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedPurchases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  Alış bulunamadı.
                </TableCell>
              </TableRow>
            ) : (
              paginatedPurchases.map((purchase) => (
                <TableRow key={purchase.id}>
                  <TableCell className="font-medium">
                    {purchase.product}
                  </TableCell>
                  <TableCell>
                    {purchase.quantity} @ {formatCurrency(purchase.unitPrice)}
                  </TableCell>
                  <TableCell>
                    {purchase.unit ? formatUnit(purchase.unit) : "Belirtilmemiş"}
                  </TableCell>
                  <TableCell>{formatCurrency(purchase.totalCost)}</TableCell>
                  <TableCell>
                    <PaymentMethodBadge method={purchase.paymentMethod} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {purchase.contributors.map((contributor) => (
                        <div
                          key={contributor.id}
                          className="text-xs flex items-center gap-1"
                        >
                          <span>{contributor.user.name}</span>
                          {contributor.isCreditor && (
                            <Badge variant="outline" className="text-xs py-0 h-4">
                              Alacaklı
                            </Badge>
                          )}
                          {contributor.contribution > 0 && (
                            <span className="text-muted-foreground">
                              ({formatCurrency(contributor.contribution)})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(purchase.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <PurchaseActions purchase={purchase} onViewDetails={handleViewDetails} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {totalItems > 0 && (
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Sayfa başına:</span>
            <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={pageSize.toString()} />
              </SelectTrigger>
              <SelectContent side="top">
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="ml-2">
              Toplam {totalItems} kayıttan {startIndex + 1}-{Math.min(endIndex, totalItems)} arası gösteriliyor
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={goToFirstPage}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
              <span className="sr-only">İlk sayfa</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Önceki sayfa</span>
            </Button>
            <div className="flex items-center gap-1 px-2">
              <span className="text-sm font-medium">
                Sayfa {currentPage} / {totalPages}
              </span>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Sonraki sayfa</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={goToLastPage}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
              <span className="sr-only">Son sayfa</span>
            </Button>
          </div>
        </div>
      )}

      {/* Purchase Details Modal */}
      <PurchaseDetailsModal
        purchaseId={selectedPurchaseId}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}

function PaymentMethodBadge({ method }: { method: string }) {
  const methodMap: Record<
    string,
    { label: string; variant: "default" | "outline" | "secondary" }
  > = {
    CASH: { label: "Nakit", variant: "default" },
    CREDIT_CARD: { label: "Kredi Kartı", variant: "secondary" },
    CREDIT: { label: "Kredi", variant: "outline" },
  };

  const { label, variant } = methodMap[method] || {
    label: method,
    variant: "outline",
  };

  return <Badge variant={variant}>{label}</Badge>;
}

// Birim formatlamak için yardımcı fonksiyon
function formatUnit(unit: string): string {
  const unitMap: Record<string, string> = {
    KG: "Kilogram",
    TON: "Ton",
    LITRE: "Litre",
    ADET: "Adet",
    CUVAL: "Çuval",
    BIDON: "Bidon",
    PAKET: "Paket",
    METRE: "Metre",
    METREKARE: "Metrekare",
    DIGER: "Diğer",
  };

  return unitMap[unit] || unit;
}
