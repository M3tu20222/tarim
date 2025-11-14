/**
 * Migration Script: Migrate existing data to use CropPeriods
 *
 * Bu script:
 * 1. Eski Process kayıtlarında cropPeriodId'yi atama (null ise)
 * 2. Eski FieldExpense kayıtlarında cropPeriodId'yi atama
 * 3. Eski IrrigationLog kayıtlarında cropPeriodId'yi atama
 * 4. Eski IrrigationFieldExpense kayıtlarında cropPeriodId'yi atama
 *
 * Çalıştırma:
 * npx ts-node scripts/migrate-to-crop-periods.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface MigrationStats {
  processesTotal: number;
  processesMigrated: number;
  processesSkipped: number;
  fieldExpensesTotal: number;
  fieldExpensesMigrated: number;
  fieldExpensesSkipped: number;
  irrigationLogsTotal: number;
  irrigationLogsMigrated: number;
  irrigationLogsSkipped: number;
  irrigationFieldExpensesTotal: number;
  irrigationFieldExpensesMigrated: number;
  irrigationFieldExpensesSkipped: number;
}

const stats: MigrationStats = {
  processesTotal: 0,
  processesMigrated: 0,
  processesSkipped: 0,
  fieldExpensesTotal: 0,
  fieldExpensesMigrated: 0,
  fieldExpensesSkipped: 0,
  irrigationLogsTotal: 0,
  irrigationLogsMigrated: 0,
  irrigationLogsSkipped: 0,
  irrigationFieldExpensesTotal: 0,
  irrigationFieldExpensesMigrated: 0,
  irrigationFieldExpensesSkipped: 0
};

/**
 * Bir tarih aralığında olan ve belirtilen field'a ait aktif CropPeriod'u bul
 */
async function findMatchingCropPeriod(
  fieldId: string | null,
  date: Date | null,
  seasonId: string | null
) {
  if (!fieldId || !seasonId || !date) {
    return null;
  }

  const period = await prisma.cropPeriod.findFirst({
    where: {
      fieldId,
      seasonId,
      startDate: {
        lte: date
      },
      status: {
        in: ['PREPARATION', 'SEEDING', 'IRRIGATION', 'FERTILIZING', 'HARVESTING']
      }
    },
    orderBy: { startDate: 'desc' }
  });

  return period;
}

/**
 * Process kayıtlarını migrate et
 */
async function migrateProcesses() {
  console.log('\n📋 Migrating Process records...');

  const processes = await prisma.process.findMany({
    where: {
      cropPeriodId: null
    },
    include: {
      field: {
        select: { id: true, name: true }
      },
      season: {
        select: { id: true, name: true }
      }
    }
  });

  stats.processesTotal = processes.length;

  if (processes.length === 0) {
    console.log('✅ Tüm Process kayıtları zaten cropPeriodId ile ilişkilendirilmiş');
    return;
  }

  for (const process of processes) {
    try {
      const matchingPeriod = await findMatchingCropPeriod(
        process.fieldId,
        process.date,
        process.seasonId
      );

      if (matchingPeriod) {
        await prisma.process.update({
          where: { id: process.id },
          data: { cropPeriodId: matchingPeriod.id }
        });
        stats.processesMigrated++;
        console.log(`✅ Process ${process.id} → CropPeriod ${matchingPeriod.id}`);
      } else {
        stats.processesSkipped++;
        console.log(`⏭️  Process ${process.id} - Matching CropPeriod not found`);
      }
    } catch (error) {
      stats.processesSkipped++;
      console.error(`❌ Process ${process.id} migration failed:`, error);
    }
  }
}

/**
 * FieldExpense kayıtlarını migrate et
 */
async function migrateFieldExpenses() {
  console.log('\n📋 Migrating FieldExpense records...');

  const expenses = await prisma.fieldExpense.findMany({
    where: {
      cropPeriodId: null
    },
    include: {
      field: {
        select: { id: true, name: true }
      },
      season: {
        select: { id: true, name: true }
      }
    }
  });

  stats.fieldExpensesTotal = expenses.length;

  if (expenses.length === 0) {
    console.log('✅ Tüm FieldExpense kayıtları zaten cropPeriodId ile ilişkilendirilmiş');
    return;
  }

  for (const expense of expenses) {
    try {
      const matchingPeriod = await findMatchingCropPeriod(
        expense.fieldId,
        expense.expenseDate,
        expense.seasonId
      );

      if (matchingPeriod) {
        await prisma.fieldExpense.update({
          where: { id: expense.id },
          data: { cropPeriodId: matchingPeriod.id }
        });
        stats.fieldExpensesMigrated++;
        console.log(`✅ FieldExpense ${expense.id} → CropPeriod ${matchingPeriod.id}`);
      } else {
        stats.fieldExpensesSkipped++;
        console.log(`⏭️  FieldExpense ${expense.id} - Matching CropPeriod not found`);
      }
    } catch (error) {
      stats.fieldExpensesSkipped++;
      console.error(`❌ FieldExpense ${expense.id} migration failed:`, error);
    }
  }
}

/**
 * IrrigationLog kayıtlarını migrate et
 */
async function migrateIrrigationLogs() {
  console.log('\n📋 Migrating IrrigationLog records...');

  const irrigationLogs = await prisma.irrigationLog.findMany({
    where: {
      cropPeriodId: null
    },
    include: {
      season: {
        select: { id: true, name: true }
      },
      fieldUsages: {
        select: {
          fieldId: true
        },
        take: 1
      }
    }
  });

  stats.irrigationLogsTotal = irrigationLogs.length;

  if (irrigationLogs.length === 0) {
    console.log('✅ Tüm IrrigationLog kayıtları zaten cropPeriodId ile ilişkilendirilmiş');
    return;
  }

  for (const log of irrigationLogs) {
    try {
      // Sulama kaydının ilk field'ını al
      const fieldId = log.fieldUsages[0]?.fieldId;

      if (!fieldId) {
        stats.irrigationLogsSkipped++;
        console.log(`⏭️  IrrigationLog ${log.id} - No field usage found`);
        continue;
      }

      const matchingPeriod = await findMatchingCropPeriod(
        fieldId,
        log.startDateTime,
        log.seasonId
      );

      if (matchingPeriod) {
        await prisma.irrigationLog.update({
          where: { id: log.id },
          data: { cropPeriodId: matchingPeriod.id }
        });
        stats.irrigationLogsMigrated++;
        console.log(`✅ IrrigationLog ${log.id} → CropPeriod ${matchingPeriod.id}`);
      } else {
        stats.irrigationLogsSkipped++;
        console.log(`⏭️  IrrigationLog ${log.id} - Matching CropPeriod not found`);
      }
    } catch (error) {
      stats.irrigationLogsSkipped++;
      console.error(`❌ IrrigationLog ${log.id} migration failed:`, error);
    }
  }
}

/**
 * IrrigationFieldExpense kayıtlarını migrate et
 */
async function migrateIrrigationFieldExpenses() {
  console.log('\n📋 Migrating IrrigationFieldExpense records...');

  const expenses = await prisma.irrigationFieldExpense.findMany({
    include: {
      field: {
        select: { id: true, name: true }
      },
      season: {
        select: { id: true, name: true }
      }
    }
  });

  // cropPeriodId olan ve olmayan kayıtları ayır
  const expensesToMigrate = expenses.filter(e => !e.cropPeriodId);

  stats.irrigationFieldExpensesTotal = expensesToMigrate.length;

  if (expensesToMigrate.length === 0) {
    console.log('✅ Tüm IrrigationFieldExpense kayıtları zaten cropPeriodId ile ilişkilendirilmiş');
    return;
  }

  for (const expense of expensesToMigrate) {
    try {
      const matchingPeriod = await findMatchingCropPeriod(
        expense.fieldId,
        expense.expenseDate,
        expense.seasonId
      );

      if (matchingPeriod) {
        await prisma.irrigationFieldExpense.update({
          where: { id: expense.id },
          data: { cropPeriodId: matchingPeriod.id }
        });
        stats.irrigationFieldExpensesMigrated++;
        console.log(`✅ IrrigationFieldExpense ${expense.id} → CropPeriod ${matchingPeriod.id}`);
      } else {
        stats.irrigationFieldExpensesSkipped++;
        console.log(`⏭️  IrrigationFieldExpense ${expense.id} - Matching CropPeriod not found`);
      }
    } catch (error) {
      stats.irrigationFieldExpensesSkipped++;
      console.error(`❌ IrrigationFieldExpense ${expense.id} migration failed:`, error);
    }
  }
}

/**
 * Migration'ı çalıştır
 */
async function runMigration() {
  console.log('🚀 Starting CropPeriod Migration...\n');
  console.log('⚠️  WARNING: This operation will modify your database.');
  console.log('Make sure you have a backup before proceeding.\n');

  try {
    await migrateProcesses();
    await migrateFieldExpenses();
    await migrateIrrigationLogs();
    await migrateIrrigationFieldExpenses();

    console.log('\n\n📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));

    console.log('\nProcess Records:');
    console.log(`  Total: ${stats.processesTotal}`);
    console.log(`  Migrated: ${stats.processesMigrated} ✅`);
    console.log(`  Skipped: ${stats.processesSkipped} ⏭️`);

    console.log('\nFieldExpense Records:');
    console.log(`  Total: ${stats.fieldExpensesTotal}`);
    console.log(`  Migrated: ${stats.fieldExpensesMigrated} ✅`);
    console.log(`  Skipped: ${stats.fieldExpensesSkipped} ⏭️`);

    console.log('\nIrrigationLog Records:');
    console.log(`  Total: ${stats.irrigationLogsTotal}`);
    console.log(`  Migrated: ${stats.irrigationLogsMigrated} ✅`);
    console.log(`  Skipped: ${stats.irrigationLogsSkipped} ⏭️`);

    console.log('\nIrrigationFieldExpense Records:');
    console.log(`  Total: ${stats.irrigationFieldExpensesTotal}`);
    console.log(`  Migrated: ${stats.irrigationFieldExpensesMigrated} ✅`);
    console.log(`  Skipped: ${stats.irrigationFieldExpensesSkipped} ⏭️`);

    console.log('\n' + '='.repeat(60));

    const totalMigrated =
      stats.processesMigrated +
      stats.fieldExpensesMigrated +
      stats.irrigationLogsMigrated +
      stats.irrigationFieldExpensesMigrated;

    const totalSkipped =
      stats.processesSkipped +
      stats.fieldExpensesSkipped +
      stats.irrigationLogsSkipped +
      stats.irrigationFieldExpensesSkipped;

    console.log(`\n✅ TOTAL MIGRATED: ${totalMigrated}`);
    console.log(`⏭️  TOTAL SKIPPED: ${totalSkipped}`);

    if (totalSkipped > 0) {
      console.log('\n⚠️  Some records were skipped. Check logs for details.');
    }

    console.log('\n🎉 Migration completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();
