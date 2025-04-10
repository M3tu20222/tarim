"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  Edit,
  Trash,
  MoreHorizontal,
  Bell,
  CheckCircle,
  AlertTriangle,
  CreditCard,
  X,
  CalendarIcon,
  Filter,
  ArrowUpDown,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatCurrency } from "@/lib/utils";
import type { DebtStatus } from "@prisma/client";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Debt tipini tanımlayalım
export interface Debt {
  id: string;
  amount: number;
  dueDate: string;
  status: DebtStatus;
  description?: string;
  reason?: string;
  paymentDate?: string;
  reminderSent: boolean;
  lastReminderDate?: string;
  creditor: {
    id: string;
    name: string;
  };
  debtor: {
    id: string;
    name: string;
  };
  paymentHistory: {
    id: string;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    notes?: string;
  }[];
}

export interface DebtListProps {
  debts: Debt[];
}

// Filtreleme ve sıralama için tip tanımları
type FilterOptions = {
  status: DebtStatus[] | null;
  personId: string | null;
  minAmount: number | null;
  maxAmount: number | null;
  startDate: Date | null;
  endDate: Date | null;
  reason: string | null;
};

type SortOption = {
  field: "dueDate" | "amount" | "status";
  direction: "asc" | "desc";
};

// Kullanıcı tipi
interface User {
  id: string;
  name: string;
  role?: string;
}

export default function DebtList({ debts: initialDebts }: DebtListProps) {
  const [debts, setDebts] = useState<Debt[]>(initialDebts);
  const [filteredDebts, setFilteredDebts] = useState<Debt[]>(initialDebts);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtreleme ve sıralama state'leri
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    status: null,
    personId: null,
    minAmount: null,
    maxAmount: null,
    startDate: null,
    endDate: null,
    reason: null,
  });
  const [sortOption, setSortOption] = useState<SortOption>({
    field: "dueDate",
    direction: "asc",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  // Kullanıcıları getir
  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        // Sahip kullanıcıları getir
        const response = await fetch("/api/users/owners");
        if (response.ok) {
          const data = await response.json();
          setUsers(data);
        } else {
          console.error("Failed to fetch users");
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []);

  // Filtreleme ve sıralama işlemleri
  useEffect(() => {
    let result = [...initialDebts];

    // Filtreleme
    if (filterOptions.status && filterOptions.status.length > 0) {
      result = result.filter((debt) =>
        filterOptions.status!.includes(debt.status)
      );
    }

    if (filterOptions.personId) {
      result = result.filter(
        (debt) =>
          debt.creditor.id === filterOptions.personId ||
          debt.debtor.id === filterOptions.personId
      );
    }

    if (filterOptions.minAmount !== null) {
      result = result.filter((debt) => debt.amount >= filterOptions.minAmount!);
    }

    if (filterOptions.maxAmount !== null) {
      result = result.filter((debt) => debt.amount <= filterOptions.maxAmount!);
    }

    if (filterOptions.startDate) {
      result = result.filter(
        (debt) => new Date(debt.dueDate) >= filterOptions.startDate!
      );
    }

    if (filterOptions.endDate) {
      result = result.filter(
        (debt) => new Date(debt.dueDate) <= filterOptions.endDate!
      );
    }

    if (filterOptions.reason) {
      result = result.filter((debt) => debt.reason === filterOptions.reason);
    }

    // Sıralama
    result.sort((a, b) => {
      if (sortOption.field === "dueDate") {
        return sortOption.direction === "asc"
          ? new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
          : new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
      } else if (sortOption.field === "amount") {
        return sortOption.direction === "asc"
          ? a.amount - b.amount
          : b.amount - a.amount;
      } else if (sortOption.field === "status") {
        const statusOrder = {
          OVERDUE: 0,
          PENDING: 1,
          PARTIALLY_PAID: 2,
          PAID: 3,
          CANCELLED: 4,
        };
        const aOrder = statusOrder[a.status as keyof typeof statusOrder];
        const bOrder = statusOrder[b.status as keyof typeof statusOrder];
        return sortOption.direction === "asc"
          ? aOrder - bOrder
          : bOrder - aOrder;
      }
      return 0;
    });

    setFilteredDebts(result);

    // Aktif filtre sayısını hesapla
    let count = 0;
    if (filterOptions.status && filterOptions.status.length > 0) count++;
    if (filterOptions.personId) count++;
    if (filterOptions.minAmount !== null) count++;
    if (filterOptions.maxAmount !== null) count++;
    if (filterOptions.startDate) count++;
    if (filterOptions.endDate) count++;
    if (filterOptions.reason) count++;
    setActiveFiltersCount(count);
  }, [initialDebts, filterOptions, sortOption]);

  // Filtreleri temizle
  const clearFilters = () => {
    setFilterOptions({
      status: null,
      personId: null,
      minAmount: null,
      maxAmount: null,
      startDate: null,
      endDate: null,
      reason: null,
    });
    setShowFilters(false);
  };

  // Durum rengini belirle
  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "bg-green-500/10 text-green-500 border-green-500";
      case "OVERDUE":
        return "bg-red-500/10 text-red-500 border-red-500";
      case "CANCELLED":
        return "bg-gray-500/10 text-gray-500 border-gray-500";
      case "PARTIALLY_PAID":
        return "bg-blue-500/10 text-blue-500 border-blue-500";
      default:
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500";
    }
  };

  // Durum metnini belirle
  const getStatusText = (status: string) => {
    switch (status) {
      case "PAID":
        return "Ödendi";
      case "OVERDUE":
        return "Gecikti";
      case "CANCELLED":
        return "İptal Edildi";
      case "PARTIALLY_PAID":
        return "Kısmen Ödendi";
      default:
        return "Bekliyor";
    }
  };

  // Borç nedenini belirle
  const getReasonText = (reason?: string) => {
    if (!reason) return "Belirtilmemiş";

    switch (reason) {
      case "PURCHASE":
        return "Alış";
      case "LOAN":
        return "Kredi";
      case "SERVICE":
        return "Hizmet";
      case "EQUIPMENT":
        return "Ekipman";
      default:
        return "Diğer";
    }
  };

  // Borç silme
  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/debts/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Borç silinirken bir hata oluştu");
      }

      toast({
        title: "Başarılı",
        description: "Borç başarıyla silindi.",
      });

      router.refresh();
    } catch (error: any) {
      console.error("Error deleting debt:", error);
      toast({
        title: "Hata",
        description: error.message || "Borç silinirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  // Hatırlatma gönder
  const sendReminder = async (id: string) => {
    try {
      const response = await fetch("/api/debts/reminders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          debtIds: [id],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Hatırlatma gönderilirken bir hata oluştu"
        );
      }

      toast({
        title: "Başarılı",
        description: "Hatırlatma başarıyla gönderildi.",
      });

      router.refresh();
    } catch (error: any) {
      console.error("Error sending reminder:", error);
      toast({
        title: "Hata",
        description:
          error.message || "Hatırlatma gönderilirken bir hata oluştu.",
      });
    }
  };

  // Borcu ödenmiş olarak işaretle
  const markAsPaid = async (id: string) => {
    try {
      const response = await fetch(`/api/debts/${id}/pay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: debts.find((debt) => debt.id === id)?.amount || 0,
          paymentMethod: "CASH",
          paymentDate: new Date().toISOString(),
          notes: "Otomatik ödeme",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error ||
            "Borç ödenmiş olarak işaretlenirken bir hata oluştu"
        );
      }

      toast({
        title: "Başarılı",
        description: "Borç ödenmiş olarak işaretlendi.",
      });

      router.refresh();
    } catch (error: any) {
      console.error("Error marking debt as paid:", error);
      toast({
        title: "Hata",
        description:
          error.message ||
          "Borç ödenmiş olarak işaretlenirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  // Filtreleme ve sıralama UI'ı
  const renderFilterUI = () => {
    if (!showFilters) return null;

    return (
      <div className="mb-6 space-y-4 rounded-lg border p-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Filtreler</h3>
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-2 h-4 w-4" />
            Temizle
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Durum filtresi */}
          <div>
            <label className="text-sm font-medium">Durum</label>
            <Select
              value={filterOptions.status?.join(",") || ""}
              onValueChange={(value) => {
                if (value === "" || value === "ALL") {
                  setFilterOptions({ ...filterOptions, status: null });
                } else {
                  setFilterOptions({
                    ...filterOptions,
                    status: value.split(",") as DebtStatus[],
                  });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tüm durumlar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tüm durumlar</SelectItem>
                <SelectItem value="PENDING">Bekliyor</SelectItem>
                <SelectItem value="PARTIALLY_PAID">Kısmen Ödendi</SelectItem>
                <SelectItem value="PAID">Ödendi</SelectItem>
                <SelectItem value="OVERDUE">Gecikti</SelectItem>
                <SelectItem value="CANCELLED">İptal Edildi</SelectItem>
                <SelectItem value="PENDING,PARTIALLY_PAID,OVERDUE">
                  Ödenmemiş
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Kişi filtresi - Dropdown olarak değiştirildi */}
          <div>
            <label className="text-sm font-medium">Kişi</label>
            <Select
              value={filterOptions.personId || ""}
              onValueChange={(value) => {
                if (value === "" || value === "ALL") {
                  setFilterOptions({ ...filterOptions, personId: null });
                } else {
                  setFilterOptions({ ...filterOptions, personId: value });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tüm kişiler" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tüm kişiler</SelectItem>
                {loadingUsers ? (
                  <SelectItem value="loading" disabled>
                    Yükleniyor...
                  </SelectItem>
                ) : (
                  users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Tutar aralığı */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tutar Aralığı</label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={filterOptions.minAmount || ""}
                onChange={(e) =>
                  setFilterOptions({
                    ...filterOptions,
                    minAmount: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
              <Input
                type="number"
                placeholder="Max"
                value={filterOptions.maxAmount || ""}
                onChange={(e) =>
                  setFilterOptions({
                    ...filterOptions,
                    maxAmount: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </div>
          </div>

          {/* Vade tarihi aralığı */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Vade Tarihi Aralığı</label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    {filterOptions.startDate ? (
                      format(filterOptions.startDate, "PPP", { locale: tr })
                    ) : (
                      <span>Başlangıç</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filterOptions.startDate ?? undefined} // undefined yerine null kullanmak daha doğru olabilir ama Calendar'ın prop'u Date | undefined bekliyor olabilir, kontrol etmek lazım. Şimdilik ?? undefined bırakalım.
                    onSelect={(date) => // date undefined ise null ata
                      setFilterOptions({ ...filterOptions, startDate: date ?? null })
                    }
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    {filterOptions.endDate ? (
                      format(filterOptions.endDate, "PPP", { locale: tr })
                    ) : (
                      <span>Bitiş</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filterOptions.endDate ?? undefined} // undefined yerine null kullanmak daha doğru olabilir ama Calendar'ın prop'u Date | undefined bekliyor olabilir, kontrol etmek lazım. Şimdilik ?? undefined bırakalım.
                    onSelect={(date) => // date undefined ise null ata
                      setFilterOptions({ ...filterOptions, endDate: date ?? null })
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Borç nedeni */}
          <div>
            <label className="text-sm font-medium">Borç Nedeni</label>
            <Select
              value={filterOptions.reason || ""}
              onValueChange={(value) => {
                if (value === "" || value === "ALL") {
                  setFilterOptions({ ...filterOptions, reason: null });
                } else {
                  setFilterOptions({ ...filterOptions, reason: value });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tüm nedenler" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tüm nedenler</SelectItem>
                <SelectItem value="PURCHASE">Alış</SelectItem>
                <SelectItem value="LOAN">Kredi</SelectItem>
                <SelectItem value="SERVICE">Hizmet</SelectItem>
                <SelectItem value="EQUIPMENT">Ekipman</SelectItem>
                <SelectItem value="OTHER">Diğer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    );
  };

  if (filteredDebts.length === 0 && initialDebts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border rounded-lg">
        <h3 className="text-xl font-semibold mb-2">Henüz borç bulunmuyor</h3>
        <p className="text-muted-foreground mb-4">
          Borç kayıtlarınızı takip etmek için yeni bir borç ekleyin.
        </p>
        <Button asChild>
          <Link href="/dashboard/owner/debts/new">Yeni Borç Oluştur</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Filtreleme ve sıralama kontrolleri */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filtrele
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2 px-1 rounded-full">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                Sırala
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Sıralama</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuCheckboxItem
                  checked={
                    sortOption.field === "dueDate" &&
                    sortOption.direction === "asc"
                  }
                  onCheckedChange={() =>
                    setSortOption({ field: "dueDate", direction: "asc" })
                  }
                >
                  Vade Tarihi (Önce Yakın)
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={
                    sortOption.field === "dueDate" &&
                    sortOption.direction === "desc"
                  }
                  onCheckedChange={() =>
                    setSortOption({ field: "dueDate", direction: "desc" })
                  }
                >
                  Vade Tarihi (Önce Uzak)
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={
                    sortOption.field === "amount" &&
                    sortOption.direction === "asc"
                  }
                  onCheckedChange={() =>
                    setSortOption({ field: "amount", direction: "asc" })
                  }
                >
                  Tutar (Küçükten Büyüğe)
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={
                    sortOption.field === "amount" &&
                    sortOption.direction === "desc"
                  }
                  onCheckedChange={() =>
                    setSortOption({ field: "amount", direction: "desc" })
                  }
                >
                  Tutar (Büyükten Küçüğe)
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={
                    sortOption.field === "status" &&
                    sortOption.direction === "asc"
                  }
                  onCheckedChange={() =>
                    setSortOption({ field: "status", direction: "asc" })
                  }
                >
                  Durum (Önce Geciken)
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={
                    sortOption.field === "status" &&
                    sortOption.direction === "desc"
                  }
                  onCheckedChange={() =>
                    setSortOption({ field: "status", direction: "desc" })
                  }
                >
                  Durum (Önce Ödenen)
                </DropdownMenuCheckboxItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {activeFiltersCount > 0 && (
          <div className="text-sm text-muted-foreground">
            {filteredDebts.length} sonuç bulundu
          </div>
        )}
      </div>

      {/* Filtre UI */}
      {renderFilterUI()}

      {filteredDebts.length === 0 && initialDebts.length > 0 ? (
        <div className="flex flex-col items-center justify-center p-8 border rounded-lg">
          <h3 className="text-xl font-semibold mb-2">
            Filtrelere uygun borç bulunamadı
          </h3>
          <p className="text-muted-foreground mb-4">
            Lütfen filtreleri değiştirin veya temizleyin.
          </p>
          <Button variant="outline" onClick={clearFilters}>
            Filtreleri Temizle
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDebts.map((debt) => (
            <Card
              key={debt.id}
              className={debt.status === "OVERDUE" ? "border-red-500" : ""}
            >
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    {formatCurrency(debt.amount)}
                    <Badge
                      variant="outline"
                      className={getStatusColor(debt.status)}
                    >
                      {getStatusText(debt.status)}
                    </Badge>
                  </CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/owner/debts/${debt.id}`}>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Detaylar
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/owner/debts/${debt.id}/edit`}>
                          <Edit className="mr-2 h-4 w-4" />
                          Düzenle
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => sendReminder(debt.id)}>
                        <Bell className="mr-2 h-4 w-4" />
                        Hatırlatma Gönder
                      </DropdownMenuItem>
                      {debt.status !== "PAID" && (
                        <DropdownMenuItem onClick={() => markAsPaid(debt.id)}>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Ödenmiş Olarak İşaretle
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => setDeleteId(debt.id)}
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        Sil
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardDescription>
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between">
                      <span>Alacaklı:</span>
                      <span className="font-medium">{debt.creditor.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Borçlu:</span>
                      <span className="font-medium">{debt.debtor.name}</span>
                    </div>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Vade Tarihi:</span>
                    <span
                      className={
                        debt.status === "OVERDUE"
                          ? "text-red-500 font-medium"
                          : ""
                      }
                    >
                      {format(new Date(debt.dueDate), "PPP", { locale: tr })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Borç Nedeni:</span>
                    <span>{getReasonText(debt.reason)}</span>
                  </div>
                  {debt.description && (
                    <div className="mt-2 text-sm">
                      <p className="text-muted-foreground mb-1">Açıklama:</p>
                      <p>{debt.description}</p>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <div className="flex items-center text-sm text-muted-foreground">
                  {debt.status === "OVERDUE" && (
                    <div className="flex items-center text-red-500">
                      <AlertTriangle className="mr-1 h-4 w-4" />
                      <span>Vadesi Geçmiş</span>
                    </div>
                  )}
                  {debt.reminderSent && (
                    <div className="flex items-center">
                      <Bell className="mr-1 h-4 w-4" />
                      <span>Hatırlatma Gönderildi</span>
                    </div>
                  )}
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/owner/debts/${debt.id}`}>
                    Detaylar
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Silme onay dialogu */}
      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Borcu silmek istediğinize emin misiniz?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. Bu borç kalıcı olarak silinecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Siliniyor..." : "Sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
