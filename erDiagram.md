User [icon: user, color: blue] {
  id String pk
  name String
  email String uk
  password String
  role Role
  status Status
  createdAt DateTime
  updatedAt DateTime
  notificationPreferencesId String? fk
}

Season [icon: calendar, color: orange] {
  id String pk
  name String
  startDate DateTime
  endDate DateTime
  description String?
  isActive Boolean
  createdAt DateTime
  updatedAt DateTime
  creatorId String fk
}

Field [icon: field, color: green] {
  id String pk
  name String
  location String
  size Float
  coordinates String?
  status String // FieldStatus enum olmalı ama şemada String görünüyor
  createdAt DateTime
  updatedAt DateTime
  seasonId String? fk
}

FieldOwnership [icon: link, color: gray] {
  id String pk
  createdAt DateTime
  updatedAt DateTime
  percentage Float
  fieldId String fk
  userId String fk
}

FieldWorkerAssignment [icon: link, color: gray] {
  id String pk
  createdAt DateTime
  updatedAt DateTime
  fieldId String fk
  userId String fk
}

FieldWell [icon: link, color: gray] {
  id String pk
  fieldId String fk
  wellId String fk
  createdAt DateTime
}

Well [icon: water, color: blue] {
  id String pk
  name String
  depth Float
  capacity Float
  status String // WellStatus enum olmalı ama şemada String görünüyor
  createdAt DateTime
  updatedAt DateTime
}

Crop [icon: plant, color: green] {
  id String pk
  name String
  plantedDate DateTime
  harvestDate DateTime?
  status CropStatus
  notes String?
  createdAt DateTime
  updatedAt DateTime
  seasonId String? fk
  fieldId String fk
}

ProcessingLog [icon: file-alt, color: lightblue] {
  id String pk
  date DateTime
  processType ProcessType
  equipment String?
  duration Float
  notes String?
  createdAt DateTime
  updatedAt DateTime
  fieldId String fk
}

Inventory [icon: box, color: brown] {
  id String pk
  name String
  category InventoryCategory
  totalQuantity Float
  unit Unit
  purchaseDate DateTime?
  expiryDate DateTime?
  status InventoryStatus
  costPrice Float?
  notes String?
  createdAt DateTime
  updatedAt DateTime
}

InventoryOwnership [icon: link, color: gray] {
  id String pk
  inventoryId String fk
  userId String fk
  shareQuantity Float
  createdAt DateTime
  updatedAt DateTime
}

Purchase [icon: shopping-cart, color: purple] {
  id String pk
  product String
  category ProductCategory
  quantity Float
  unit Unit
  unitPrice Float
  totalCost Float
  paymentMethod PaymentMethod
  dueDate DateTime?
  description String?
  createdAt DateTime
  isTemplate Boolean
  templateName String?
  approvalStatus ApprovalStatus
  approvalRequired Boolean
  approvalThreshold Float
  seasonId String? fk
}

PurchaseApproval [icon: check-square, color: green] {
  id String pk
  purchaseId String fk
  approverId String fk
  status ApprovalStatus
  comment String?
  approvedAt DateTime?
  createdAt DateTime
  updatedAt DateTime
}

PurchaseContributor [icon: users, color: blue] {
  id String pk
  purchaseId String fk
  userId String fk
  sharePercentage Float
  contribution Float
  expectedContribution Float
  actualContribution Float
  remainingAmount Float?
  hasPaid Boolean
  paymentDate DateTime?
  isCreditor Boolean
  createdAt DateTime
  updatedAt DateTime
}

PaymentHistory [icon: credit-card, color: green] {
  id String pk
  amount Float
  paymentDate DateTime
  paymentMethod PaymentMethod
  notes String?
  createdAt DateTime
  debtId String? fk
  contributorId String? fk
  payerId String fk
  receiverId String fk
}

InventoryTransaction [icon: exchange-alt, color: orange] {
  id String pk
  type TransactionType
  quantity Float
  date DateTime
  notes String?
  createdAt DateTime
  seasonId String? fk
  inventoryId String fk
  purchaseId String? fk
  userId String fk
}

Debt [icon: money-bill-wave, color: gold] {
  id String pk
  amount Float
  dueDate DateTime
  status DebtStatus
  description String?
  createdAt DateTime
  paymentDate DateTime?
  reminderSent Boolean
  lastReminderDate DateTime?
  reason String?
  creditorId String fk
  debtorId String fk
  invoiceId String? fk
  purchaseId String? fk
}

Invoice [icon: receipt, color: orange] {
  id String pk
  number String uk
  amount Float
  issueDate DateTime
  dueDate DateTime
  status InvoiceStatus
  description String?
  createdAt DateTime
  updatedAt DateTime
  purchaserId String fk
  purchaseId String? fk
}

InventoryUsage [icon: check, color: green] {
  id String pk
  inventoryId String fk
  usedQuantity Float
  usageType UsageType
  usedById String fk
  fieldId String? fk
  processId String? fk
  createdAt DateTime
}

Process [icon: cogs, color: darkblue] {
  id String pk
  type ProcessType
  fieldId String? fk
  workerId String fk
  date DateTime
  description String?
  totalArea Float
  processedArea Float
  processedPercentage Float
  seasonId String? fk
  createdAt DateTime
  updatedAt DateTime
}

Notification [icon: bell, color: red] {
  id String pk
  title String
  message String
  type NotificationType
  priority NotificationPriority
  isRead Boolean
  isArchived Boolean
  link String?
  expiresAt DateTime?
  targetRoles Role[] // List type representation might need adjustment
  createdAt DateTime
  updatedAt DateTime
  receiverId String fk
  senderId String? fk
  processId String? fk
  debtId String? fk
  purchaseId String? fk
  inventoryId String? fk
  irrigationId String? fk
  fieldId String? fk
  seasonId String? fk
  cropId String? fk
  wellId String? fk
  processingLogId String? fk
  invoiceId String? fk
  inventoryUsageId String? fk
  transactionId String? fk
  paymentId String? fk
  contributorId String? fk
  approvalId String? fk
  equipmentId String? fk
  equipmentUsageId String? fk
  processCostId String? fk
  fieldExpenseId String? fk
  ownerExpenseId String? fk
}

NotificationPreference [icon: user-cog, color: blue] {
  id String pk
  userId String fk uk
  emailNotifications Boolean
  pushNotifications Boolean
  inAppNotifications Boolean
  dailyDigest Boolean
  notifyOnDebtReminders Boolean
  notifyOnPayments Boolean
  notifyOnProcessUpdates Boolean
  notifyOnInventoryAlerts Boolean
  notifyOnApprovals Boolean
  notifyOnIrrigation Boolean
  createdAt DateTime
  updatedAt DateTime
}

Equipment [icon: tools, color: gray] {
  id String pk
  name String
  type EquipmentType
  fuelConsumptionPerDecare Float
  description String?
  status EquipmentStatus
  createdAt DateTime
  updatedAt DateTime
}

EquipmentOwnership [icon: link, color: gray] {
  id String pk
  equipmentId String fk
  userId String fk
  ownershipPercentage Float
  createdAt DateTime
  updatedAt DateTime
}

EquipmentCapability [icon: link, color: gray] {
  id String pk
  equipmentId String fk
  inventoryCategory InventoryCategory
  canUse Boolean
  createdAt DateTime
  updatedAt DateTime
}

EquipmentUsage [icon: link, color: gray] {
  id String pk
  processId String fk
  equipmentId String fk
  userId String fk
  areaProcessed Float
  processedPercentage Float
  fuelConsumed Float
  unit Unit
  createdAt DateTime
  updatedAt DateTime
}

ProcessCost [icon: dollar-sign, color: green] {
  id String pk
  processId String fk
  laborCost Float
  equipmentCost Float
  inventoryCost Float
  fuelCost Float
  totalCost Float
  createdAt DateTime
  updatedAt DateTime
  fieldId String fk
}

FieldExpense [icon: dollar-sign, color: green] {
  id String pk
  fieldId String fk
  seasonId String fk
  processCostId String fk
  totalCost Float
  periodStart DateTime
  periodEnd DateTime
  createdAt DateTime
  updatedAt DateTime
}

FieldOwnerExpense [icon: dollar-sign, color: green] {
  id String pk
  fieldOwnershipId String fk
  processCostId String fk
  userId String fk
  amount Float
  percentage Float
  periodStart DateTime
  periodEnd DateTime
  createdAt DateTime
  updatedAt DateTime
}

IrrigationLog [icon: watering-can, color: blue] {
  id String pk
  startDateTime DateTime
  duration Float
  wellId String fk
  notes String?
  status String // Enum olmalı?
  createdBy String fk
  createdAt DateTime
  updatedAt DateTime
  seasonId String? fk
}

IrrigationFieldUsage [icon: link, color: gray] {
  id String pk
  irrigationLogId String fk
  fieldId String fk
  percentage Float
  createdAt DateTime
}

IrrigationOwnerUsage [icon: link, color: gray] {
  id String pk
  irrigationFieldUsageId String fk
  ownerId String fk
  ownershipPercentage Float
  usagePercentage Float
  createdAt DateTime
}

IrrigationOwnerSummary [icon: file-invoice-dollar, color: green] {
  id String pk
  irrigationLogId String fk
  ownerId String fk
  totalIrrigatedArea Float
  totalAllocatedDuration Float
  createdAt DateTime
}

IrrigationInventoryUsage [icon: link, color: gray] {
  id String pk
  irrigationLogId String fk
  inventoryId String fk
  quantity Float
  unitPrice Float
  totalCost Float
  createdAt DateTime
}

IrrigationInventoryOwnerUsage [icon: link, color: gray] {
  id String pk
  irrigationInventoryUsageId String fk
  ownerId String fk
  percentage Float
  quantity Float
  cost Float
  createdAt DateTime
}

WellBillingPeriod [icon: file-invoice, color: orange] {
  id String pk
  wellId String fk
  startDate DateTime
  endDate DateTime
  totalAmount Float
  totalUsage Float?
  status String // Enum olmalı?
  createdAt DateTime
}

WellBillingIrrigationUsage [icon: link, color: gray] {
  id String pk
  wellBillingPeriodId String fk
  irrigationLogId String fk
  duration Float
  percentage Float
  amount Float
  createdAt DateTime
}


// Relationships
Season.creatorId > User.id
Field.seasonId > Season.id
FieldOwnership.fieldId > Field.id
FieldOwnership.userId > User.id
FieldWorkerAssignment.fieldId > Field.id
FieldWorkerAssignment.userId > User.id
FieldWell.fieldId > Field.id
FieldWell.wellId > Well.id
Crop.seasonId > Season.id
Crop.fieldId > Field.id
ProcessingLog.fieldId > Field.id
InventoryOwnership.inventoryId > Inventory.id
InventoryOwnership.userId > User.id
Purchase.seasonId > Season.id
PurchaseApproval.purchaseId > Purchase.id
PurchaseApproval.approverId > User.id
PurchaseContributor.purchaseId > Purchase.id
PurchaseContributor.userId > User.id
PaymentHistory.debtId > Debt.id
PaymentHistory.contributorId > PurchaseContributor.id
PaymentHistory.payerId > User.id
PaymentHistory.receiverId > User.id
InventoryTransaction.seasonId > Season.id
InventoryTransaction.inventoryId > Inventory.id
InventoryTransaction.purchaseId > Purchase.id
InventoryTransaction.userId > User.id
Debt.creditorId > User.id
Debt.debtorId > User.id
Debt.invoiceId > Invoice.id
Debt.purchaseId > Purchase.id
Invoice.purchaserId > User.id
Invoice.purchaseId > Purchase.id
InventoryUsage.inventoryId > Inventory.id
InventoryUsage.usedById > User.id
InventoryUsage.fieldId > Field.id
InventoryUsage.processId > Process.id
Process.fieldId > Field.id
Process.workerId > User.id
Process.seasonId > Season.id
Notification.receiverId > User.id
Notification.senderId > User.id
Notification.processId > Process.id
Notification.debtId > Debt.id
Notification.purchaseId > Purchase.id
Notification.inventoryId > Inventory.id
Notification.irrigationId > IrrigationLog.id
Notification.fieldId > Field.id
Notification.seasonId > Season.id
Notification.cropId > Crop.id
Notification.wellId > Well.id
Notification.processingLogId > ProcessingLog.id
Notification.invoiceId > Invoice.id
Notification.inventoryUsageId > InventoryUsage.id
Notification.transactionId > InventoryTransaction.id
Notification.paymentId > PaymentHistory.id
Notification.contributorId > PurchaseContributor.id
Notification.approvalId > PurchaseApproval.id
Notification.equipmentId > Equipment.id
Notification.equipmentUsageId > EquipmentUsage.id
Notification.processCostId > ProcessCost.id
Notification.fieldExpenseId > FieldExpense.id
Notification.ownerExpenseId > FieldOwnerExpense.id
NotificationPreference.userId > User.id
EquipmentOwnership.equipmentId > Equipment.id
EquipmentOwnership.userId > User.id
EquipmentCapability.equipmentId > Equipment.id
EquipmentUsage.processId > Process.id
EquipmentUsage.equipmentId > Equipment.id
EquipmentUsage.userId > User.id
ProcessCost.processId > Process.id
ProcessCost.fieldId > Field.id
FieldExpense.fieldId > Field.id
FieldExpense.seasonId > Season.id
FieldExpense.processCostId > ProcessCost.id
FieldOwnerExpense.fieldOwnershipId > FieldOwnership.id
FieldOwnerExpense.processCostId > ProcessCost.id
FieldOwnerExpense.userId > User.id
IrrigationLog.wellId > Well.id
IrrigationLog.createdBy > User.id
IrrigationLog.seasonId > Season.id
IrrigationFieldUsage.irrigationLogId > IrrigationLog.id
IrrigationFieldUsage.fieldId > Field.id
IrrigationOwnerUsage.irrigationFieldUsageId > IrrigationFieldUsage.id
IrrigationOwnerUsage.ownerId > User.id
IrrigationOwnerSummary.irrigationLogId > IrrigationLog.id
IrrigationOwnerSummary.ownerId > User.id
IrrigationInventoryUsage.irrigationLogId > IrrigationLog.id
IrrigationInventoryUsage.inventoryId > Inventory.id
IrrigationInventoryOwnerUsage.irrigationInventoryUsageId > IrrigationInventoryUsage.id
IrrigationInventoryOwnerUsage.ownerId > User.id
WellBillingPeriod.wellId > Well.id
WellBillingIrrigationUsage.wellBillingPeriodId > WellBillingPeriod.id
WellBillingIrrigationUsage.irrigationLogId > IrrigationLog.id

// Note: Many-to-many relationships like Field <-> User (workers) are represented
// via join tables (FieldWorkerAssignment) and one-to-many relationships (>) above.
// The <> syntax from the example isn't directly used as Prisma defines explicit join tables.
