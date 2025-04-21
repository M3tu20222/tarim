// Fatura durumu
export enum BillStatus {
  PENDING = "PENDING", // Beklemede
  PARTIALLY_PAID = "PARTIALLY_PAID", // Kısmen ödenmiş
  PAID = "PAID", // Ödenmiş
  OVERDUE = "OVERDUE", // Vadesi geçmiş
  CANCELLED = "CANCELLED", // İptal edilmiş
}

// Fatura dönemi
export interface BillingPeriod {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Kuyu faturası
export interface WellBill {
  id: string;
  wellId: string;
  well?: {
    id: string;
    name: string;
  };
  billingPeriodId: string;
  billingPeriod?: BillingPeriod;
  totalAmount: number;
  totalHours: number;
  invoiceNumber?: string;
  invoiceDate?: Date;
  status: BillStatus;
  createdAt: Date;
  updatedAt: Date;
  ownerBills?: OwnerBill[];
  payments?: BillPayment[];
}

// Tarla sahibi fatura payı
export interface OwnerBill {
  id: string;
  userId: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  wellBillId: string;
  wellBill?: WellBill;
  billingPeriodId: string;
  billingPeriod?: BillingPeriod;
  amount: number;
  totalHours: number;
  status: BillStatus;
  createdAt: Date;
  updatedAt: Date;
  fieldUsages?: FieldBillUsage[];
  payments?: BillPayment[];
}

// Tarla fatura kullanımı
export interface FieldBillUsage {
  id: string;
  ownerBillId: string;
  fieldId: string;
  field?: {
    id: string;
    name: string;
    location: string;
  };
  hours: number;
  amount: number;
  percentage: number;
  createdAt: Date;
}

// Fatura ödeme
export interface BillPayment {
  id: string;
  wellBillId?: string;
  ownerBillId?: string;
  userId: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  amount: number;
  paymentDate: Date;
  method: string;
  notes?: string;
  createdAt: Date;
}

// Sulama kuyu kullanımı
export interface IrrigationWellUsage {
  id: string;
  irrigationLogId: string;
  wellId: string;
  well?: {
    id: string;
    name: string;
  };
  duration: number;
  createdAt: Date;
}

// Fatura dönemi oluşturma formu
export interface BillingPeriodFormData {
  name: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
}

// Kuyu faturası oluşturma formu
export interface WellBillFormData {
  wellId: string;
  billingPeriodId: string;
  totalAmount: number;
  invoiceNumber?: string;
  invoiceDate?: Date;
}

// Fatura ödeme formu
export interface BillPaymentFormData {
  amount: number;
  paymentDate: Date;
  method: string;
  notes?: string;
}
