import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSideSession } from "@/lib/session";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; seasonId: string }> }
) {
  try {
    const { id: fieldId, seasonId } = await params;
    const session = await getServerSideSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Tarla ve sezon bilgilerini al
    const field = await prisma.field.findUnique({
      where: { id: fieldId },
      include: {
        owners: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!field) {
      return NextResponse.json({ error: "Tarla bulunamadı" }, { status: 404 });
    }

    const season = await prisma.season.findUnique({
      where: { id: seasonId },
    });

    if (!season) {
      return NextResponse.json({ error: "Sezon bulunamadı" }, { status: 404 });
    }

    // Process maliyetlerini al
    const processCosts = await prisma.processCost.findMany({
      where: {
        fieldId: fieldId,
        process: {
          seasonId: seasonId,
        },
      },
      include: {
        process: true,
      },
    });

    // IRRIGATION maliyetlerini al - YENİ ENTEGRASYON!
    const irrigationCosts = await prisma.irrigationCost.findMany({
      where: {
        fieldId: fieldId,
        irrigationLog: {
          seasonId: seasonId,
        },
      },
      include: {
        irrigationLog: true,
      },
    });

    // Field expenses al
    const fieldExpenses = await prisma.fieldExpense.findMany({
      where: {
        fieldId: fieldId,
        seasonId: seasonId,
      },
    });

    // Irrigation field expenses al
    const irrigationFieldExpenses = await prisma.irrigationFieldExpense.findMany({
      where: {
        fieldId: fieldId,
        seasonId: seasonId,
      },
    });

    // Maliyet hesaplamaları
    let plantingCosts = {
      seedCost: 0,
      plantingLabor: 0,
      plantingEquipment: 0,
      plantingFuel: 0,
      subtotal: 0,
    };

    let maintenanceCosts = {
      fertilizerCost: 0,
      pesticideCost: 0,
      maintenanceLabor: 0,
      maintenanceEquipment: 0,
      maintenanceFuel: 0,
      subtotal: 0,
    };

    let harvestCosts = {
      harvesterRental: 0,
      harvesterFuel: 0,
      harvesterOperator: 0,
      transportation: 0,
      storage: 0,
      subtotal: 0,
    };

    // Process maliyetlerinden hesapla
    for (const cost of processCosts) {
      switch (cost.process.type) {
        case "SEEDING":
          plantingCosts.seedCost += cost.inventoryCost;
          plantingCosts.plantingLabor += cost.laborCost;
          plantingCosts.plantingEquipment += cost.equipmentCost;
          plantingCosts.plantingFuel += cost.fuelCost;
          break;
        case "FERTILIZING":
        case "PESTICIDE":
          maintenanceCosts.fertilizerCost += cost.inventoryCost;
          maintenanceCosts.maintenanceLabor += cost.laborCost;
          maintenanceCosts.maintenanceEquipment += cost.equipmentCost;
          maintenanceCosts.maintenanceFuel += cost.fuelCost;
          break;
        case "HARVESTING":
          harvestCosts.harvesterRental += cost.equipmentCost;
          harvestCosts.harvesterFuel += cost.fuelCost;
          harvestCosts.harvesterOperator += cost.laborCost;
          break;
      }
    }

    // IRRIGATION maliyetlerini hesapla - GERÇEK VERİ!
    const irrigationCostsTotal = {
      electricityCost: irrigationCosts.reduce((sum, cost) => sum + cost.electricityCost, 0),
      irrigationLabor: irrigationCosts.reduce((sum, cost) => sum + cost.laborCost, 0),
      irrigationEquipment: irrigationCosts.reduce((sum, cost) => sum + cost.equipmentCost, 0),
      waterFee: irrigationCosts.reduce((sum, cost) => sum + cost.waterFee, 0),
      subtotal: irrigationCosts.reduce((sum, cost) => sum + cost.totalCost, 0),
    };

    // Subtotal'ları hesapla
    plantingCosts.subtotal = plantingCosts.seedCost + plantingCosts.plantingLabor +
                            plantingCosts.plantingEquipment + plantingCosts.plantingFuel;

    maintenanceCosts.subtotal = maintenanceCosts.fertilizerCost + maintenanceCosts.pesticideCost +
                              maintenanceCosts.maintenanceLabor + maintenanceCosts.maintenanceEquipment +
                              maintenanceCosts.maintenanceFuel;

    harvestCosts.subtotal = harvestCosts.harvesterRental + harvestCosts.harvesterFuel +
                           harvestCosts.harvesterOperator + harvestCosts.transportation +
                           harvestCosts.storage;

    // Vergi hesaplamaları (placeholder)
    const taxes = {
      incomeTax: 500,
      vat: 300,
      socialSecurity: 200,
      other: 100,
      subtotal: 1100,
    };

    const totalCost = plantingCosts.subtotal + maintenanceCosts.subtotal +
                     irrigationCostsTotal.subtotal + harvestCosts.subtotal + taxes.subtotal;

    const costPerDecare = totalCost / field.size;

    // Revenue hesaplamaları (placeholder - gerçek hasat verisi olmalı)
    const revenue = {
      totalSalesRevenue: 15000,
      subsidies: 1000,
      insurancePayments: 500,
      totalRevenue: 16500,
      revenuePerDecare: 16500 / field.size,
    };

    // Kar/Zarar hesaplamaları
    const grossProfit = revenue.totalRevenue - totalCost;
    const grossProfitPerDecare = grossProfit / field.size;
    const profitMargin = (grossProfit / revenue.totalRevenue) * 100;

    const profitLoss = {
      grossProfit,
      grossProfitPerDecare,
      profitMargin,
      yieldPerDecare: 1000, // kg per decare - placeholder
      costPerKg: totalCost / (1000 * field.size),
      revenuePerKg: revenue.totalRevenue / (1000 * field.size),
      profitPerKg: grossProfit / (1000 * field.size),
    };

    // Benchmark hesaplamaları (placeholder)
    const benchmarks = {
      avgCostPerDecareInRegion: 1200,
      avgProfitPerDecareInRegion: 800,
      performanceRating: grossProfitPerDecare > 800 ? 'EXCELLENT' :
                        grossProfitPerDecare > 500 ? 'GOOD' :
                        grossProfitPerDecare > 200 ? 'AVERAGE' :
                        grossProfitPerDecare > 0 ? 'BELOW_AVERAGE' : 'POOR' as const,
    };

    const reportData = {
      field: {
        id: field.id,
        name: field.name,
        size: field.size,
        location: field.location,
      },
      season: {
        id: season.id,
        name: season.name,
        startDate: season.startDate,
        endDate: season.endDate,
      },
      costs: {
        plantingCosts,
        maintenanceCosts,
        irrigationCosts: irrigationCostsTotal, // GERÇEK VERİ!
        harvestCosts,
        taxes,
        totalCost,
        costPerDecare,
      },
      revenue,
      profitLoss,
      benchmarks,
    };

    return NextResponse.json(reportData);

  } catch (error) {
    console.error("Profit-loss report error:", error);
    return NextResponse.json(
      { error: "Rapor oluşturulurken hata oluştu" },
      { status: 500 }
    );
  }
}