// Import Prisma enums and re-export them for consistent use
import {
  NotificationType as PrismaNotificationType,
  NotificationPriority as PrismaNotificationPriority,
} from "@prisma/client";

export type NotificationType = PrismaNotificationType;
export type NotificationPriority = PrismaNotificationPriority;

// Define NotificationStatus based on frontend usage
export type NotificationStatus = "UNREAD" | "READ" | "ARCHIVED";

// Define NotificationMethod based on frontend usage (assuming these are needed)
export type NotificationMethod = "EMAIL" | "IN_APP" | "SMS" | "ALL";

// Define the Notification interface expected by the frontend and API mapping
export interface Notification {
  id: string;
  userId: string; // Mapped from receiverId
  type: NotificationType; // Uses Prisma enum
  title: string;
  body: string; // Mapped from message
  link?: string;
  priority: NotificationPriority; // Uses Prisma enum
  status: NotificationStatus; // Derived from isRead/isArchived
  methods: NotificationMethod[]; // Added, default empty array in API
  metadata?: Record<string, any>; // Added, default undefined in API
  createdAt: Date;
  updatedAt: Date;
  readAt?: Date; // Added, derived in API
}

// Define the NotificationSummary type expected by the frontend and API
export type NotificationSummary = {
  unreadCount: number;
  recentNotifications: Notification[];
};

// Keep other potentially useful types if needed, or remove if unused
// (Keeping NotificationCreateInput and NotificationUpdateInput for now,
// but they might need adjustment based on actual API usage)

export type NotificationCreateInput = {
  receiverId: string; // Changed from userId to match service usage
  type: NotificationType;
  title: string;
  body: string; // Should map to message in API
  link?: string;
  priority?: NotificationPriority;
  methods?: NotificationMethod[];
  metadata?: Record<string, any>;
  relatedEntityId?: string; // Added missing field
  relatedEntityType?: string; // Added missing field
};

export type NotificationUpdateInput = {
  status?: NotificationStatus; // This might need mapping to isRead/isArchived in the API
  readAt?: Date;
};

// Example of keeping other types if they are used elsewhere
export interface NotificationFilters {
  type?: NotificationType;
  isRead?: boolean; // Note: Frontend uses status, API might need mapping
  startDate?: Date;
  endDate?: Date;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>; // Uses Prisma enum
}

export type NotificationListType =
  | "received"
  | "sent"
  | "system"
  | NotificationType; // Uses Prisma enum

// Removed NotificationTemplate as it wasn't in the latest file content
// Removed NotificationResponse as the main Notification interface serves this purpose now
