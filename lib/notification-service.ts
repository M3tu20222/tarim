import type {
  NotificationCreateInput,
  NotificationType,
} from "@/types/notification-types";

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
        body: JSON.stringify(data),
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
        body: JSON.stringify({
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
      body: `${amount.toFixed(2)} ₺ tutarında ödemeniz alındı.`, // message -> body
      type: "PAYMENT_RECEIVED",
      receiverId,
      relatedEntityId: entityId,
      relatedEntityType: entityType,
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
      body: `${amount.toFixed(2)} ₺ tutarındaki ödemenizin son tarihi ${formattedDate}.`, // message -> body
      type: "PAYMENT_DUE",
      receiverId,
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
      body: `${itemName} stoğu ${currentStock} birime düştü.`, // message -> body
      type: "INVENTORY_LOW",
      receiverId,
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
      body: `${processName} süreci başarıyla tamamlandı.`, // message -> body
      type: "PROCESS_COMPLETED",
      receiverId,
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
      body: `Size "${taskName}" görevi atandı. Son tarih: ${formattedDate}.`, // message -> body
      type: "TASK_ASSIGNED",
      receiverId,
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
      body: `${fieldName} için ${formattedDate} tarihinde sulama planlandı.`, // message -> body
      type: "IRRIGATION_SCHEDULED",
      receiverId,
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
      body: `${fieldName} için ${formattedDate} tarihinde sulama tamamlandı.`, // message -> body
      type: "IRRIGATION_COMPLETED",
      receiverId,
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
      body: alertMessage, // message -> body
      type: "SYSTEM_ALERT",
      receiverId,
      relatedEntityId: entityId,
      relatedEntityType: entityType,
    });
  },
};

// Bu fonksiyon, zamanlanmış görevler (cron jobs) gibi sunucu tarafı işlemlerinde
// gönderilmeyi bekleyen bildirimleri işlemek için kullanılır.
export async function sendNotifications(): Promise<void> {
  try {
    // TODO: Veritabanından gönderilmeyi bekleyen bildirimleri al.
    // Örnek: const pendingNotifications = await prisma.notification.findMany({ where: { sent: false } });
    
    // TODO: Her bir bildirimi gönder ve durumunu güncelle.
    // for (const notification of pendingNotifications) {
    //   // Gönderme mantığı (örn: email, push notification)
    //   await prisma.notification.update({
    //     where: { id: notification.id },
    //     data: { sent: true, sentAt: new Date() },
    //   });
    // }

    console.log("Periodic notification check complete.");
  } catch (error) {
    console.error("Error in sendNotifications cron job:", error);
  }
}
