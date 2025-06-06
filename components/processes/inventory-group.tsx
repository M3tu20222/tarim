import { useState, useEffect, useMemo } from "react";
import { Trash } from "lucide-react";

// Yerel tiplerimizi tanımlıyoruz (Prisma dokunmadan)
type InventoryCategory = "SEED" | "FERTILIZER" | "PESTICIDE" | "FUEL" | "OTHER";

type InventoryType = {
  id: string;
  name: string;
  unit: Unit;
  category: InventoryCategory;
  ownerships: Array<{ // Eklenen ownerships özelliği
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

interface InventoryGroupProps {
  group: {
    id: string;
    category: InventoryCategory;
    totalQuantity: number;
    unit: Unit;
    allocations: Array<{ // ProcessForm'dan gelen allocations
      ownerId: string;
      name: string;
      percentage: number;
      allocatedQuantity: number;
      inventoryTypeId?: string;
    }>;
  };
  inventoryTypes: InventoryType[];
  selectedEquipment: any;
  activeEquipmentCategories: InventoryCategory[];
  owners: { id: string; userId: string; name: string; percentage: number }[];
  // selectedInventoryOwnerships prop'u artık kullanılmayacak
  onChange: (groupId: string, updatedFields: Partial<InventoryGroupProps['group']>) => void; // Yeni imza
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
  const [unitMismatch, setUnitMismatch] = useState<Record<string, boolean>>({}); // Bu state hala kullanılabilir

  // Envanter tiplerini filtrele
  const filteredInventoryTypes = useMemo(() => {
    return inventoryTypes.filter(type => 
      !selectedEquipment || 
      activeEquipmentCategories.includes(type.category) ||
      type.category === "FUEL"
    );
  }, [inventoryTypes, selectedEquipment, activeEquipmentCategories]);


  // Toplam miktar veya sahip yüzdeleri değişince dağıtımı hesapla ve ProcessForm'a bildir
  useEffect(() => {
    if (group.totalQuantity > 0 && owners.length > 0) {
      const totalPercentage = owners.reduce((sum, owner) => sum + owner.percentage, 0);
      let remaining = group.totalQuantity;
      const newAllocations = [];

      for (let i = 0; i < owners.length; i++) {
        const owner = owners[i];
        let allocated = 0;
        
        if (i < owners.length - 1) {
          allocated = group.totalQuantity * (owner.percentage / totalPercentage);
          allocated = Math.floor(allocated * 100) / 100;
          remaining -= allocated;
        } else {
          allocated = remaining;
        }

        const existingAllocation = group.allocations.find(a => a.ownerId === owner.id);

        newAllocations.push({
          ownerId: owner.id,
          name: owner.name,
          percentage: owner.percentage,
          allocatedQuantity: allocated,
          inventoryTypeId: existingAllocation?.inventoryTypeId || ''
        });
      }

      // Mevcut allocations ile yeni allocations'ı karşılaştır
      const areAllocationsEqual = JSON.stringify(newAllocations) === JSON.stringify(group.allocations);

      if (!areAllocationsEqual) {
        onChange(group.id, { allocations: newAllocations });
      }
    } else if (group.allocations.length > 0) {
      // Miktar 0 veya sahip yoksa allocations'ı temizle, sadece eğer zaten boş değilse
      if (group.allocations.length > 0) {
        onChange(group.id, { allocations: [] });
      }
    }
  }, [group.totalQuantity, owners, group.id, onChange, group.allocations]);

  // Sahip envanter tipi değiştiğinde birim kontrolü yap ve ProcessForm'a bildir
  const handleOwnerInventoryChange = (ownerId: string, inventoryTypeId: string) => {
    const selectedType = inventoryTypes.find(t => t.id === inventoryTypeId);
    const newAllocations = group.allocations.map(allocation => {
      if (allocation.ownerId === ownerId) {
        // Birim kontrolü yap
        if (selectedType && selectedType.unit !== group.unit) {
          setUnitMismatch(prev => ({ ...prev, [ownerId]: true }));
        } else {
          setUnitMismatch(prev => ({ ...prev, [ownerId]: false }));
        }
        
        return { ...allocation, inventoryTypeId };
      }
      return allocation;
    });
    // Değişikliği ProcessForm'a bildir
    onChange(group.id, { allocations: newAllocations });
  };

  return (
    <div className="border rounded-lg p-4 mb-4 bg-gray-900">
      {/* Toplam Miktar */}
      <div className="mb-4">
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

      {/* Silme Butonu */}
      <div className="flex justify-end mb-4">
        <button 
          type="button"
          onClick={() => onRemove(group.id)}
          className="text-red-500 hover:text-red-700"
          aria-label="Grubu sil"
        >
          <Trash className="h-5 w-5" />
        </button>
      </div>

      {/* Dağıtım Tablosu */}
      <div className="mt-4">
        <h3 className="font-medium mb-2">Dağıtım ({unitTranslations[group.unit]})</h3>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-800">
              <th className="p-2 text-left">Sahip</th>
              <th className="p-2 text-left">Pay (%)</th>
              <th className="p-2 text-left">Miktar</th>
              <th className="p-2 text-left">Envanter Tipi</th>
            </tr>
          </thead>
          <tbody>
            {group.allocations.map(allocation => { // group.allocations kullan
              // Sahibin sahip olduğu ve grup kategorisiyle eşleşen envanter tiplerini filtrele
              const ownerInventoryTypes = inventoryTypes.filter(type => 
                type.category === group.category &&
                type.ownerships.some(io => 
                  io.userId === allocation.ownerId
                )
              );
              
              return (
                <tr key={allocation.ownerId} className="border-t border-gray-700">
                  <td className="p-2">{allocation.name}</td>
                  <td className="p-2">{allocation.percentage}%</td>
                  <td className="p-2">
                    {allocation.allocatedQuantity.toFixed(2)}
                  </td>
                  <td className="p-2">
                    <select
                      value={allocation.inventoryTypeId || ''}
                      onChange={(e) => handleOwnerInventoryChange(allocation.ownerId, e.target.value)}
                      className="w-full p-1 border rounded bg-gray-800 text-white"
                      aria-label={`${allocation.name} için envanter tipi seçin`}
                    >
                      <option value="">Seçiniz</option>
                      {ownerInventoryTypes.length > 0 ? (
                        ownerInventoryTypes.map(type => (
                          <option key={type.id} value={type.id}>
                            {type.name} ({unitTranslations[type.unit]})
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>
                          Bu sahip için uygun envanter bulunamadı
                        </option>
                      )}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
