import { prisma } from "@/lib/prisma";
import { formatDate, formatCurrency } from "@/lib/utils";
import { ShoppingCart, CreditCard, Bell } from "lucide-react";
import { Purchase, Debt, Notification } from "@prisma/client";

// Aktivite tiplerini tanımla
type PurchaseActivity = Purchase & {
  contributors: Array<{
    user: { name: string };
  }>;
};

type DebtActivity = Debt & {
  creditor: { name: string };
  debtor: { name: string };
};

type NotificationActivity = Notification & {
  receiver: { name: string };
  sender: { name: string };
};

type Activity =
  | { type: "purchase"; date: Date; data: PurchaseActivity }
  | { type: "debt"; date: Date; data: DebtActivity }
  | { type: "notification"; date: Date; data: NotificationActivity };

export async function RecentActivity() {
  // Son 10 aktiviteyi getir (alışlar, borçlar, bildirimler)
  const recentPurchases = await prisma.purchase.findMany({
    take: 5,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      contributors: {
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  const recentDebts = await prisma.debt.findMany({
    take: 5,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      creditor: {
        select: {
          name: true,
        },
      },
      debtor: {
        select: {
          name: true,
        },
      },
    },
  });

  const recentNotifications = await prisma.notification.findMany({
    take: 5,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      receiver: {
        select: {
          name: true,
        },
      },
      sender: {
        select: {
          name: true,
        },
      },
    },
  });

  // Tüm aktiviteleri birleştir ve tarihe göre sırala
  const allActivities: Activity[] = [
    ...recentPurchases.map((purchase) => ({
      type: "purchase" as const,
      date: purchase.createdAt,
      data: purchase as PurchaseActivity,
    })),
    ...recentDebts.map((debt) => ({
      type: "debt" as const,
      date: debt.createdAt,
      data: debt as DebtActivity,
    })),
    ...recentNotifications.map((notification) => ({
      type: "notification" as const,
      date: notification.createdAt,
      data: notification as NotificationActivity,
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 10);

  if (allActivities.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        Henüz aktivite bulunmuyor.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {allActivities.map((activity, index) => {
        if (activity.type === "purchase") {
          const purchase = activity.data;
          return (
            <div
              key={`purchase-${purchase.id}`}
              className="flex items-start gap-4"
            >
              <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900">
                <ShoppingCart className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">
                  {purchase.product} alındı
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(purchase.totalCost)} -{" "}
                  {formatDate(purchase.createdAt)}
                </p>
              </div>
            </div>
          );
        }

        if (activity.type === "debt") {
          const debt = activity.data;
          return (
            <div key={`debt-${debt.id}`} className="flex items-start gap-4">
              <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900">
                <CreditCard className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">
                  {debt.debtor.name} → {debt.creditor.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(debt.amount)} - {formatDate(debt.createdAt)}
                </p>
              </div>
            </div>
          );
        }

        if (activity.type === "notification") {
          const notification = activity.data;
          return (
            <div
              key={`notification-${notification.id}`}
              className="flex items-start gap-4"
            >
              <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900">
                <Bell className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">
                  {notification.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {notification.message.length > 50
                    ? notification.message.substring(0, 50) + "..."
                    : notification.message}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(notification.createdAt)}
                </p>
              </div>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
