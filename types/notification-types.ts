export type NotificationType =
  | "TASK_ASSIGNED"
  | "PAYMENT_DUE"
  | "PAYMENT_RECEIVED"
  | "IRRIGATION_SCHEDULED"
  | "INVENTORY_LOW"
  | "PROCESS_COMPLETED"
  | "DEBT_REMINDER"
  | "EQUIPMENT_MAINTENANCE"
  | "FIELD_STATUS_CHANGE"
  | "SEASON_UPDATE";

export type NotificationPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type NotificationStatus = "UNREAD" | "READ" | "ARCHIVED";

export type NotificationMethod = "EMAIL" | "IN_APP" | "SMS" | "ALL";

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  title: string;
  bodyTemplate: string;
  defaultPriority: NotificationPriority;
  defaultMethods: NotificationMethod[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  priority: NotificationPriority;
  status: NotificationStatus;
  methods: NotificationMethod[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  readAt?: Date;
}

export type NotificationCreateInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  priority?: NotificationPriority;
  methods?: NotificationMethod[];
  metadata?: Record<string, any>;
};

export type NotificationUpdateInput = {
  status?: NotificationStatus;
  readAt?: Date;
};

export type NotificationTemplateCreateInput = {
  type: NotificationType;
  title: string;
  bodyTemplate: string;
  defaultPriority?: NotificationPriority;
  defaultMethods?: NotificationMethod[];
};

export type NotificationSummary = {
  unreadCount: number;
  recentNotifications: Notification[];
};
