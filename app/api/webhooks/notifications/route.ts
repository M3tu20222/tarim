import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NotificationService } from "@/lib/notification-service";

// Webhook doğrulama için sır
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    // Güvenlik doğrulaması
    const signature = request.headers.get("x-webhook-signature");
    if (!WEBHOOK_SECRET || !signature || signature !== WEBHOOK_SECRET) {
      console.error("Webhook signature geçersiz");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const { event, payload } = data;

    // Etkinlik tipine göre işlemler
    switch (event) {
      case "payment_due":
        await handlePaymentDue(payload);
        break;
      case "irrigation_scheduled":
        await handleIrrigationScheduled(payload);
        break;
      case "inventory_low":
        await handleInventoryLow(payload);
        break;
      case "equipment_maintenance":
        await handleEquipmentMaintenance(payload);
        break;
      case "task_assigned":
        await handleTaskAssigned(payload);
        break;
      default:
        console.warn(`Bilinmeyen webhook etkinliği: ${event}`);
        return NextResponse.json({ error: "Unknown event" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook işleme hatası:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}

// Webhook işleyicileri
async function handlePaymentDue(payload: any) {
  const { ownerId, paymentType, amount, dueDate, paymentId } = payload;

  if (!ownerId || !paymentType || !amount || !dueDate || !paymentId) {
    throw new Error("Geçersiz ödeme bildirimi yükü");
  }

  await NotificationService.sendPaymentReminderNotification(
    ownerId,
    amount,
    dueDate,
    paymentId
  );
}

async function handleIrrigationScheduled(payload: any) {
  const { ownerId, fieldName, startDate, endDate, irrigationId } = payload;

  if (!ownerId || !fieldName || !startDate || !endDate || !irrigationId) {
    throw new Error("Geçersiz sulama bildirimi yükü");
  }

  // Sahibine bildirim gönder
  await NotificationService.sendIrrigationScheduledNotification(
    ownerId,
    fieldName,
    new Date(startDate),
    irrigationId
  );

  // Arazide çalışan işçilere de bildirim göndermek için
  const fieldWorkers = await prisma.fieldWorkerAssignment.findMany({ // fieldAssignment -> fieldWorkerAssignment
    where: { fieldId: payload.fieldId },
    select: { userId: true },
  });

  for (const worker of fieldWorkers) {
    await NotificationService.sendIrrigationScheduledNotification(
      worker.userId,
      fieldName,
      new Date(startDate),
      irrigationId
    );
  }
}

async function handleInventoryLow(payload: any) {
  const { ownerId, itemName, currentQuantity, minimumQuantity, inventoryId } =
    payload;

  if (
    !ownerId ||
    !itemName ||
    currentQuantity === undefined ||
    !minimumQuantity ||
    !inventoryId
  ) {
    throw new Error("Geçersiz envanter bildirimi yükü");
  }

  await NotificationService.sendInventoryLowNotification(
    ownerId,
    itemName,
    currentQuantity,
    inventoryId
  );
}

async function handleEquipmentMaintenance(payload: any) {
  const { ownerId, equipmentName, maintenanceDate, equipmentId } = payload;

  if (!ownerId || !equipmentName || !maintenanceDate || !equipmentId) {
    throw new Error("Geçersiz ekipman bakım bildirimi yükü");
  }

  await NotificationService.sendSystemAlertNotification(
    ownerId,
    `Ekipman Bakım Uyarısı: ${equipmentName}, Tarih: ${maintenanceDate}`,
    equipmentId,
    "EQUIPMENT"
  );
}

async function handleTaskAssigned(payload: any) {
  const { userId, taskName, taskId, dueDate } = payload;

  if (!userId || !taskName || !taskId) {
    throw new Error("Geçersiz görev bildirimi yükü");
  }

  if (dueDate) {
    await NotificationService.sendTaskAssignedNotification(
      userId,
      taskName,
      new Date(dueDate),
      taskId
    );
  }
  // dueDate yoksa bildirim gönderilmez
}
