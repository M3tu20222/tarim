import {
  NotificationCreateInput,
  NotificationType,
  NotificationPriority,
  NotificationMethod,
} from "@/types/notification-types";

export class NotificationService {
  private static instance: NotificationService;
  private apiUrl: string = process.env.NEXT_PUBLIC_API_URL || "";

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Yeni bildirim oluştur
  public async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    options: {
      link?: string;
      priority?: NotificationPriority;
      methods?: NotificationMethod[];
      metadata?: Record<string, any>;
    } = {}
  ): Promise<any> {
    try {
      const notification: NotificationCreateInput = {
        userId,
        type,
        title,
        body,
        link: options.link,
        priority: options.priority,
        methods: options.methods,
        metadata: options.metadata,
      };

      const response = await fetch(`${this.apiUrl}/api/notifications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify(notification),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to create notification: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  }

  // Görev bildirimi gönder
  public async sendTaskAssignedNotification(
    userId: string,
    taskName: string,
    taskId: string,
    dueDate?: Date
  ): Promise<any> {
    const title = "Yeni Görev Atandı";
    const body = `Size "${taskName}" görevi atandı. ${dueDate ? `Bitiş Tarihi: ${dueDate.toLocaleDateString("tr-TR")}` : ""}`;

    return this.createNotification(userId, "TASK_ASSIGNED", title, body, {
      link: `/dashboard/worker/tasks/${taskId}`,
      priority: "MEDIUM",
      methods: ["IN_APP", "EMAIL"],
      metadata: { taskId, dueDate: dueDate?.toISOString() },
    });
  }

  // Ödeme bildirimi gönder
  public async sendPaymentDueNotification(
    userId: string,
    paymentType: string,
    amount: number,
    dueDate: Date,
    paymentId: string
  ): Promise<any> {
    const title = "Ödeme Hatırlatması";
    const body = `${paymentType} için ${amount.toLocaleString("tr-TR")} ₺ tutarında ödemeniz bulunmaktadır. Son Ödeme Tarihi: ${dueDate.toLocaleDateString("tr-TR")}`;

    return this.createNotification(userId, "PAYMENT_DUE", title, body, {
      link: `/dashboard/owner/payments/${paymentId}`,
      priority: "HIGH",
      methods: ["IN_APP", "EMAIL", "SMS"],
      metadata: { paymentId, amount, dueDate: dueDate.toISOString() },
    });
  }

  // Sulama bildirimi gönder
  public async sendIrrigationScheduledNotification(
    userId: string,
    fieldName: string,
    startDate: Date,
    endDate: Date,
    irrigationId: string
  ): Promise<any> {
    const title = "Sulama Planlandı";
    const body = `"${fieldName}" arazisinde ${startDate.toLocaleDateString("tr-TR")} - ${endDate.toLocaleDateString("tr-TR")} tarihleri arasında sulama planlandı.`;

    return this.createNotification(
      userId,
      "IRRIGATION_SCHEDULED",
      title,
      body,
      {
        link: `/dashboard/owner/irrigation/${irrigationId}`,
        priority: "MEDIUM",
        methods: ["IN_APP", "EMAIL"],
        metadata: {
          irrigationId,
          fieldName,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      }
    );
  }

  // Ekipman bakım bildirimi gönder
  public async sendEquipmentMaintenanceNotification(
    userId: string,
    equipmentName: string,
    maintenanceDate: Date,
    equipmentId: string
  ): Promise<any> {
    const title = "Ekipman Bakımı Gerekiyor";
    const body = `"${equipmentName}" ekipmanının ${maintenanceDate.toLocaleDateString("tr-TR")} tarihinde bakımı yapılması gerekiyor.`;

    return this.createNotification(
      userId,
      "EQUIPMENT_MAINTENANCE",
      title,
      body,
      {
        link: `/dashboard/owner/equipment/${equipmentId}`,
        priority: "MEDIUM",
        methods: ["IN_APP", "EMAIL"],
        metadata: {
          equipmentId,
          maintenanceDate: maintenanceDate.toISOString(),
        },
      }
    );
  }

  // Envanter azalma bildirimi gönder
  public async sendInventoryLowNotification(
    userId: string,
    itemName: string,
    currentQuantity: number,
    minimumQuantity: number,
    inventoryId: string
  ): Promise<any> {
    const title = "Envanter Uyarısı";
    const body = `"${itemName}" stok seviyesi kritik: Mevcut: ${currentQuantity}, Minimum: ${minimumQuantity}`;

    return this.createNotification(userId, "INVENTORY_LOW", title, body, {
      link: `/dashboard/owner/inventory/${inventoryId}`,
      priority: "HIGH",
      methods: ["IN_APP", "EMAIL"],
      metadata: { inventoryId, currentQuantity, minimumQuantity },
    });
  }
}

export const notificationService = NotificationService.getInstance();
