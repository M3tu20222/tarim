import type { Notification, NotificationType, Prisma } from "@prisma/client";

type NotificationCreateInput = Prisma.NotificationCreateInput;

// Bildirim gönderme servisi
export const NotificationService = {
  // Tekil bildirim gönder
  async sendNotification(data: NotificationCreateInput): Promise<boolean> {
    try {
      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        message: JSON.stringify(data),
      });

      return response.ok;
    } catch (error) {
      console.error("Error sending notification:", error);
      return false;
    }
  },

  // Toplu bildirim gönder
  async sendBulkNotifications(
    title: string,
    message: string,
    type: NotificationType,
    userIds?: string[],
    userRole?: string,
    relatedEntityId?: string,
    relatedEntityType?: string
  ): Promise<boolean> {
    try {
      const response = await fetch("/api/notifications", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        message: JSON.stringify({
          notifications: {
            title,
            message,
            type,
            relatedEntityId,
            relatedEntityType,
          },
          userIds,
          userRole,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error("Error sending bulk notifications:", error);
      return false;
    }
  },

  // Ödeme yapıldığında bildirim gönder
  async sendPaymentNotification(
    receiverId: string,
    amount: number,
    entityId: string,
    entityType = "PAYMENT"
  ): Promise<boolean> {
    return this.sendNotification({
      title: "Ödeme Alındı",
      message: `${amount.toFixed(2)} ₺ tutarında ödemeniz alındı.`,
      type: "PAYMENT_RECEIVED",
      receiver: { connect: { id: receiverId } },
    });
  },

  // Ödeme hatırlatması gönder
  async sendPaymentReminderNotification(
    receiverId: string,
    amount: number,
    dueDate: Date,
    entityId: string,
    entityType = "DEBT"
  ): Promise<boolean> {
    const formattedDate = new Date(dueDate).toLocaleDateString("tr-TR");

    return this.sendNotification({
      title: "Ödeme Hatırlatması",
      message: `${amount.toFixed(2)} ₺ tutarındaki ödemenizin son tarihi ${formattedDate}.`, // message -> body
      type: "PAYMENT_DUE",
      receiver: { connect: { id: receiverId } },
      relatedEntityId: entityId,
      relatedEntityType: entityType,
    });
  },

  // Envanter düşük bildirimi gönder
  async sendInventoryLowNotification(
    receiverId: string,
    itemName: string,
    currentStock: number,
    inventoryId: string
  ): Promise<boolean> {
    return this.sendNotification({
      title: "Düşük Envanter Uyarısı",
      message: `${itemName} stoğu ${currentStock} birime düştü.`, // message -> body
      type: "INVENTORY_LOW",
      receiver: { connect: { id: receiverId } },
      relatedEntityId: inventoryId,
      relatedEntityType: "INVENTORY",
    });
  },

  // Süreç tamamlandı bildirimi gönder
  async sendProcessCompletedNotification(
    receiverId: string,
    processName: string,
    processId: string
  ): Promise<boolean> {
    return this.sendNotification({
      title: "Süreç Tamamlandı",
      message: `${processName} süreci başarıyla tamamlandı.`, // message -> body
      type: "PROCESS_COMPLETED",
      receiver: { connect: { id: receiverId } },
      relatedEntityId: processId,
      relatedEntityType: "PROCESS",
    });
  },

  // Görev atanması bildirimi gönder
  async sendTaskAssignedNotification(
    receiverId: string,
    taskName: string,
    dueDate: Date,
    taskId: string,
    entityType = "TASK"
  ): Promise<boolean> {
    const formattedDate = new Date(dueDate).toLocaleDateString("tr-TR");

    return this.sendNotification({
      title: "Yeni Görev Atandı",
      message: `Size "${taskName}" görevi atandı. Son tarih: ${formattedDate}.`, // message -> body
      type: "TASK_ASSIGNED",
      receiver: { connect: { id: receiverId } },
      relatedEntityId: taskId,
      relatedEntityType: entityType,
    });
  },

  // Sulama planlandı bildirimi gönder
  async sendIrrigationScheduledNotification(
    receiverId: string,
    fieldName: string,
    scheduledDate: Date,
    irrigationId: string
  ): Promise<boolean> {
    const formattedDate = new Date(scheduledDate).toLocaleDateString("tr-TR");

    return this.sendNotification({
      title: "Sulama Planlandı",
      message: `${fieldName} için ${formattedDate} tarihinde sulama planlandı.`, // message -> body
      type: "IRRIGATION_SCHEDULED",
      receiver: { connect: { id: receiverId } },
      relatedEntityId: irrigationId,
      relatedEntityType: "IRRIGATION",
    });
  },

  // Sulama tamamlandı bildirimi gönder
  async sendIrrigationCompletedNotification(
    receiverId: string,
    fieldName: string,
    completionDate: Date,
    irrigationId: string
  ): Promise<boolean> {
    const formattedDate = new Date(completionDate).toLocaleDateString("tr-TR");

    return this.sendNotification({
      title: "Sulama Tamamlandı",
      message: `${fieldName} için ${formattedDate} tarihinde sulama tamamlandı.`, // message -> body
      type: "IRRIGATION_COMPLETED",
      receiver: { connect: { id: receiverId } },
      relatedEntityId: irrigationId,
      relatedEntityType: "IRRIGATION",
    });
  },

  // Sistem uyarısı gönder
  async sendSystemAlertNotification(
    receiverId: string,
    alertMessage: string,
    entityId?: string,
    entityType?: string
  ): Promise<boolean> {
    return this.sendNotification({
      title: "Sistem Uyarısı",
      message: alertMessage, // message -> body
      type: "SYSTEM_ALERT",
      receiver: { connect: { id: receiverId } },
      relatedEntityId: entityId,
      relatedEntityType: entityType,
    });
  },
};
