// Prisma modelleriniz için tip tanımlamaları
export type FieldAssignment = {
  id: string;
  userId: string;
  fieldId: string;
  assignedAt: Date; // Sadece assignedAt var, createdAt ve updatedAt yok
};

export type Field = {
  id: string;
  name: string;
  location: string;
  size: number;
  coordinates?: string | null;
  status: "ACTIVE" | "FALLOW" | "HARVESTED";
  ownerId: string;
  workerAssignments?: FieldAssignment[];
  // Diğer alanlar...
};

export type FieldUpdateInput = {
  name?: string;
  location?: string;
  size?: number;
  coordinates?: string | null;
  status?: "ACTIVE" | "FALLOW" | "HARVESTED";
  ownerId?: string;
};

export interface InventoryCategoryType {
  id: string;
  name: string;
  description?: string;
}

