import { useState, useEffect, useMemo } from "react";
import { Trash, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Yerel tiplerimizi tanımlıyoruz (Prisma dokunmadan)
type InventoryCategory = "SEED" | "FERTILIZER" | "PESTICIDE" | "FUEL" | "OTHER";

type InventoryType = {
  id: string;
  name: string;
  unit: Unit;
  category: InventoryCategory;
  totalQuantity: number; // Toplam miktar
  totalStock?: number | null; // Kalan stok (opsiyonel, null olabilir)
  ownerships: Array<{
    id: string;
    userId: string;
    inventoryId: string;
    shareQuantity: number;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
};

type Unit = "KG" | "TON" | "LITRE" | "ADET" | "CUVAL" | "BIDON" | "PAKET" | "METRE" | "METREKARE" | "DECARE" | "DONUM" | "HECTARE" | "DIGER";

const unitTranslations: Record<Unit, string> = {
  KG: "kg",
  TON: "ton",
  LITRE: "litre",
  ADET: "adet",
  CUVAL: "çuval",
  BIDON: "bidon",
  PAKET: "paket",
  METRE: "metre",
  METREKARE: "m²",
  DECARE: "dekar",
  DONUM: "dönüm",
  HECTARE: "hektar",
  DIGER: "diğer"
};

const unitOptions: { value: Unit; label: string }[] = Object.entries(unitTranslations).map(([value, label]) => ({
  value: value as Unit,
  label,
}));

const round = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

// Owner allocation item: bir owner için bir stok seçimi
type OwnerAllocationItem = {
  inventoryId: string;
  amount: number;
};

interface InventoryGroupProps {
  group: {
    id: string;
    category: InventoryCategory;
    totalQuantity: number;
    unit: Unit;
    allocations: Record<string, OwnerAllocationItem[]>; // ownerId -> [{inventoryId, amount}]
  };
  inventoryTypes: InventoryType[];
  selectedEquipment: any;
  activeEquipmentCategories: InventoryCategory[];
  owners: { id: string; userId: string; name: string; percentage: number }[];
  onChange: (groupId: string, updatedFields: Partial<InventoryGroupProps['group']>) => void;
  onRemove: (groupId: string) => void;
}

export function InventoryGroup({
  group,
  inventoryTypes,
  selectedEquipment,
  activeEquipmentCategories,
  owners,
  onChange,
  onRemove
}: InventoryGroupProps) {
  // Envanter tiplerini filtrele
  const filteredInventoryTypes = useMemo(() => {
    return inventoryTypes.filter(type =>
      type.category === group.category
    );
  }, [inventoryTypes, group.category]);

  // Owner bazlı dağıtım hesapla
  const ownerDistribution = useMemo(() => {
    const totalPercentage = owners.reduce((sum, owner) => sum + owner.percentage, 0);
    let remaining = group.totalQuantity;
    const distribution = [];

    for (let i = 0; i < owners.length; i++) {
      const owner = owners[i];
      let allocated = 0;

      if (i < owners.length - 1) {
        allocated = group.totalQuantity * (owner.percentage / totalPercentage);
        allocated = round(allocated);
        remaining -= allocated;
      } else {
        allocated = round(remaining);
      }

      distribution.push({
        ownerId: owner.userId,
        ownerName: owner.name,
        percentage: owner.percentage,
        quantityShare: allocated,
      });
    }

    return distribution;
  }, [owners, group.totalQuantity]);

  // Allocation ekleme
  const addAllocationRow = (ownerId: string) => {
    const currentAllocations = group.allocations[ownerId] || [];
    const ownerData = ownerDistribution.find(d => d.ownerId === ownerId);
    if (!ownerData) return;

    const currentTotal = round(currentAllocations.reduce((s, a) => s + (a.amount || 0), 0));
    const remaining = round(ownerData.quantityShare - currentTotal);

    // Owner'ın bu kategorideki stokları
    const ownerInventories = inventoryTypes.filter(inv =>
      inv.category === group.category &&
      inv.ownerships?.some(o => o.userId === ownerId) &&
      (inv.totalStock ?? inv.totalQuantity) > 0
    );

    const defaultInvId = ownerInventories[0]?.id || "";
    const newItem: OwnerAllocationItem = {
      inventoryId: defaultInvId,
      amount: remaining > 0 ? remaining : 0.01
    };

    const newAllocations = {
      ...group.allocations,
      [ownerId]: [...currentAllocations, newItem]
    };

    onChange(group.id, { allocations: newAllocations });
  };

  // Allocation güncelleme
  const updateAllocation = (ownerId: string, rowIdx: number, key: "inventoryId" | "amount", value: string) => {
    const currentAllocations = group.allocations[ownerId] || [];
    const arr = [...currentAllocations];
    if (!arr[rowIdx]) return;

    if (key === "inventoryId") {
      arr[rowIdx].inventoryId = value;
    } else {
      const num = parseFloat(value);
      arr[rowIdx].amount = isNaN(num) ? 0 : num;
    }

    const newAllocations = {
      ...group.allocations,
      [ownerId]: arr
    };

    onChange(group.id, { allocations: newAllocations });
  };

  // Allocation silme
  const removeAllocation = (ownerId: string, rowIdx: number) => {
    const currentAllocations = group.allocations[ownerId] || [];
    const arr = [...currentAllocations];
    if (rowIdx < 0 || rowIdx >= arr.length) return;
    arr.splice(rowIdx, 1);

    const newAllocations = {
      ...group.allocations,
      [ownerId]: arr
    };

    onChange(group.id, { allocations: newAllocations });
  };

  return (
    <div className="border rounded-lg p-4 mb-4 bg-gray-900">
      {/* Toplam Miktar */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Kategori
          </label>
          <input
            type="text"
            value={group.category}
            disabled
            className="w-full p-2 border rounded bg-gray-700 text-gray-300"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Toplam Miktar
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={group.totalQuantity}
            onChange={(e) => onChange(group.id, { totalQuantity: Number(e.target.value) })}
            className="w-full p-2 border rounded bg-gray-800 text-white"
            aria-label="Toplam miktar"
          />
        </div>

        {/* Birim Seçimi */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Birim
          </label>
          <select
            value={group.unit}
            onChange={(e) => onChange(group.id, { unit: e.target.value as Unit })}
            className="w-full p-2 border rounded bg-gray-800 text-white"
            aria-label="Birim seçin"
          >
            {unitOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Silme Butonu */}
      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={() => onRemove(group.id)}
          className="text-red-500 hover:text-red-700 flex items-center gap-2"
          aria-label="Grubu sil"
        >
          <Trash className="h-5 w-5" />
          <span>Grubu Sil</span>
        </button>
      </div>

      {/* Otomatik Dağıtım Tablosu - Irrigation Style! */}
      <div className="mt-4">
        <h4 className="text-md font-medium mb-2">Otomatik Dağıtım ve Stok Seçimi</h4>
        <div className="border rounded-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Sahip</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Düşülecek Miktar</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Kullanılacak Stok</th>
              </tr>
            </thead>
            <tbody className="bg-transparent divide-y divide-gray-700">
              {ownerDistribution.map(dist => {
                const ownerId = dist.ownerId;
                const currentAllocations = group.allocations[ownerId] || [];

                // Bu owner için uygun stoklar
                const ownerInventories = inventoryTypes.filter(inv =>
                  inv.category === group.category &&
                  inv.ownerships?.some(o => o.userId === ownerId) &&
                  (inv.totalStock ?? inv.totalQuantity) > 0
                );

                const ownerRequiredAmount = dist.quantityShare;
                const currentTotalAllocated = round(currentAllocations.reduce((s, a) => s + (a.amount || 0), 0));
                const remaining = round(ownerRequiredAmount - currentTotalAllocated);

                const isSingleRow = currentAllocations.length === 1;

                return (
                  <tr key={ownerId}>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-green-400">
                      <div className="flex items-center gap-2">
                        <span>{dist.ownerName}</span>
                        {ownerInventories.length === 0 && (
                          <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-300">
                            Bu kişinin bu kategoride stoğu yok!
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-300">
                      {ownerRequiredAmount.toFixed(2)} {unitTranslations[group.unit]}
                      {currentTotalAllocated !== ownerRequiredAmount && (
                        <div className="text-xs mt-1">
                          <span className={currentTotalAllocated > ownerRequiredAmount ? "text-red-600" : "text-amber-600"}>
                            Dağıtılan: {currentTotalAllocated.toFixed(2)} • Kalan: {Math.max(0, remaining).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <div className="space-y-2">
                        {currentAllocations.length === 0 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addAllocationRow(ownerId)}
                            disabled={ownerInventories.length === 0}
                          >
                            <Plus className="h-4 w-4 mr-1" /> Stok Ekle
                          </Button>
                        )}
                        {currentAllocations.map((row, rowIdx) => {
                          const selectedInv = inventoryTypes.find(inv => inv.id === row.inventoryId);
                          const ownerShare = selectedInv?.ownerships?.find(o => o.userId === ownerId)?.shareQuantity ?? 0;
                          const availableStock = selectedInv ? (selectedInv.totalStock ?? selectedInv.totalQuantity) : 0;

                          // Tek satırsa otomatik miktar set et
                          const autoAmount = isSingleRow ? ownerRequiredAmount : (row.amount ?? 0);

                          return (
                            <div key={`${ownerId}-${rowIdx}`} className="flex items-center gap-2">
                              <Select
                                onValueChange={(value) => updateAllocation(ownerId, rowIdx, "inventoryId", value)}
                                value={row.inventoryId}
                              >
                                <SelectTrigger className="w-72">
                                  <SelectValue placeholder="Stok Seçin" />
                                </SelectTrigger>
                                <SelectContent>
                                  {ownerInventories.map(inv => {
                                    const stock = inv.totalStock ?? inv.totalQuantity;
                                    return (
                                      <SelectItem key={inv.id} value={inv.id}>
                                        {inv.name} - Mevcut: {stock.toFixed(2)} {unitTranslations[inv.unit]}
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>

                              {/* Tek satırda miktar input'unu gizle, çoklu satırda göster */}
                              {isSingleRow ? (
                                <span className="text-sm text-gray-400">
                                  {ownerRequiredAmount.toFixed(2)} {unitTranslations[group.unit]}
                                </span>
                              ) : (
                                <Input
                                  type="number"
                                  step="0.01"
                                  className="w-28"
                                  value={row.amount ?? 0}
                                  onChange={(e) => updateAllocation(ownerId, rowIdx, "amount", e.target.value)}
                                />
                              )}

                              <span className={`text-xs ${autoAmount > availableStock ? "text-red-600" : "text-gray-400"}`}>
                                Stok: {availableStock.toFixed(2)}
                              </span>

                              {/* Tek satırda sil butonu gösterme; çokluysa göster */}
                              {!isSingleRow && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeAllocation(ownerId, rowIdx)}
                                  className="text-red-500"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          );
                        })}
                        {currentAllocations.length > 0 && (
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addAllocationRow(ownerId)}
                              disabled={ownerInventories.length === 0}
                            >
                              <Plus className="h-4 w-4 mr-1" /> Stok Ekle
                            </Button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
