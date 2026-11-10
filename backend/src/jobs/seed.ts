import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Warehouse } from '../models/Warehouse.js';
import { Supplier } from '../models/Supplier.js';
import { Product } from '../models/Product.js';
import { InventoryMovement } from '../models/InventoryMovement.js';
import { DemandHistory } from '../models/DemandHistory.js';
import { PurchaseOrder } from '../models/PurchaseOrder.js';
import { ApprovalLog } from '../models/ApprovalLog.js';
import { Notification } from '../models/Notification.js';
import { StockoutRisk } from '../models/StockoutRisk.js';
import { Forecast } from '../models/Forecast.js';
import { StockoutService } from '../services/stockoutService.js';
import { ForecastingService } from '../services/forecastingService.js';
import { subDays, addDays } from 'date-fns';

export async function seedDatabase() {
  console.log('--- Starting Warehouse Database Seeding ---');
  await connectDB();

  // Clear existing data
  console.log('Clearing existing collections...');
  await Promise.all([
    User.deleteMany({}),
    Warehouse.deleteMany({}),
    Supplier.deleteMany({}),
    Product.deleteMany({}),
    InventoryMovement.deleteMany({}),
    DemandHistory.deleteMany({}),
    PurchaseOrder.deleteMany({}),
    ApprovalLog.deleteMany({}),
    Notification.deleteMany({}),
    StockoutRisk.deleteMany({}),
    Forecast.deleteMany({}),
  ]);

  // 1. Seed Users
  console.log('Seeding demo users across roles...');
  const users = await User.create([
    {
      name: 'Elena Rostova (Admin)',
      email: 'admin@warehouse.local',
      password: 'AdminPass123!',
      role: 'Admin',
      department: 'Executive Supply Chain',
    },
    {
      name: 'Marcus Vance (Manager)',
      email: 'manager@warehouse.local',
      password: 'ManagerPass123!',
      role: 'Warehouse Manager',
      department: 'Warehouse Fulfillment Operations',
    },
    {
      name: 'Sarah Chen (Staff)',
      email: 'staff@warehouse.local',
      password: 'StaffPass123!',
      role: 'Inventory Staff',
      department: 'Receiving & Staging',
    },
  ]);

  const [adminUser, managerUser, staffUser] = users;

  // 2. Seed 3 Warehouses
  console.log('Seeding 3 regional warehouses...');
  const warehouses = await Warehouse.create([
    {
      name: 'Midwest Central Distribution Center',
      code: 'WH-CHI-01',
      location: 'Chicago, IL',
      capacity: 50000,
      active: true,
    },
    {
      name: 'Pacific Northwest Logistics Hub',
      code: 'WH-SEA-02',
      location: 'Seattle, WA',
      capacity: 35000,
      active: true,
    },
    {
      name: 'Southeast Automated Cross-Dock',
      code: 'WH-ATL-03',
      location: 'Atlanta, GA',
      capacity: 45000,
      active: true,
    },
  ]);

  const [wh1, wh2, wh3] = warehouses;

  // 3. Seed 5 Suppliers
  console.log('Seeding 5 industrial suppliers...');
  const suppliers = await Supplier.create([
    {
      name: 'Apex Industrial Technologies',
      email: 'orders@apexindustrial.com',
      phone: '+1 (555) 234-8901',
      address: '1420 Manufacturing Pkwy, Cleveland, OH',
      approved: true,
      active: true,
      leadTimeDays: 4,
      reliabilityScore: 96,
      supportedCategories: ['Industrial Hardware', 'Bearings & Motion', 'Hydraulics'],
      rating: 4.9,
      notes: 'Tier 1 strategic vendor. Consistently delivers within 4 days with 99% order accuracy.',
    },
    {
      name: 'Global Packaging Solutions LLC',
      email: 'b2b@globalpackcorp.com',
      phone: '+1 (555) 432-1100',
      address: '880 Logistics Blvd, Dallas, TX',
      approved: true,
      active: true,
      leadTimeDays: 3,
      reliabilityScore: 94,
      supportedCategories: ['Packaging & Shipping', 'Material Handling'],
      rating: 4.8,
      notes: 'Primary supplier for corrugated cartons, heavy-duty strapping, and thermal stretch film.',
    },
    {
      name: 'Precision Dynamics Sensors',
      email: 'procurement@precisiondyn.com',
      phone: '+1 (555) 678-4321',
      address: '320 Tech Way, San Jose, CA',
      approved: true,
      active: true,
      leadTimeDays: 7,
      reliabilityScore: 91,
      supportedCategories: ['Electronics & Sensors', 'Automation & Robotics'],
      rating: 4.6,
      notes: 'High-precision photoelectric and barcode vision sensors with moderate lead times.',
    },
    {
      name: 'Vanguard Safety & PPE Supplies',
      email: 'dispatch@vanguardsafety.com',
      phone: '+1 (555) 890-5678',
      address: '500 Harbor Drive, Baltimore, MD',
      approved: true,
      active: true,
      leadTimeDays: 2,
      reliabilityScore: 98,
      supportedCategories: ['Safety & PPE', 'Sanitation & Maintenance'],
      rating: 4.9,
      notes: 'Rapid local courier dispatch. High priority safety compliance partner.',
    },
    {
      name: 'Kodiak Heavy Duty Fasteners',
      email: 'sales@kodiakfasteners.com',
      phone: '+1 (555) 765-4321',
      address: '912 Steel Road, Pittsburgh, PA',
      approved: false, // Testing unapproved supplier scenario
      active: true,
      leadTimeDays: 6,
      reliabilityScore: 78,
      supportedCategories: ['Industrial Hardware'],
      rating: 3.8,
      notes: 'Pending quality management audit. Not yet authorized for automated purchase orders.',
    },
  ]);

  const [supApex, supPack, supSensors, supSafety, supKodiak] = suppliers;

  // 4. Seed 20 Realistic Warehouse Products
  console.log('Seeding 20 realistic warehouse products...');
  const productsData = [
    // CRITICAL STOCKOUT RISKS (Very low stock, high daily demand)
    {
      name: 'Heavy Duty Poly Bubble Mailers (10.5x16 in)',
      sku: 'PKG-MLR-001',
      description: 'Water-resistant self-sealing padded envelopes for ecommerce distribution.',
      category: 'Packaging & Shipping',
      currentStock: 12,
      minimumStock: 40,
      reorderPoint: 70,
      safetyStock: 30,
      unitPrice: 0.85,
      warehouseId: wh1._id,
      supplierIds: [supPack._id],
      averageDailyDemand: 18,
      leadTimeDays: 3,
      unitOfMeasure: 'Cases (100ct)',
    },
    {
      name: 'Nitrile Industrial Exam Gloves (Large, 5mil)',
      sku: 'PPE-GLV-002',
      description: 'Textured grip powder-free chemical resistant nitrile gloves.',
      category: 'Safety & PPE',
      currentStock: 8,
      minimumStock: 25,
      reorderPoint: 50,
      safetyStock: 20,
      unitPrice: 14.5,
      warehouseId: wh1._id,
      supplierIds: [supSafety._id],
      averageDailyDemand: 9,
      leadTimeDays: 2,
      unitOfMeasure: 'Boxes (100ct)',
    },
    {
      name: 'High-Torque Flange Ball Bearing (6205-2RS)',
      sku: 'BRG-6205-003',
      description: 'Double rubber sealed deep groove industrial electric motor bearing.',
      category: 'Bearings & Motion',
      currentStock: 5,
      minimumStock: 15,
      reorderPoint: 35,
      safetyStock: 15,
      unitPrice: 28.0,
      warehouseId: wh2._id,
      supplierIds: [supApex._id],
      averageDailyDemand: 6,
      leadTimeDays: 4,
      unitOfMeasure: 'Units',
    },

    // HIGH STOCKOUT RISKS (Stock below or near reorder point)
    {
      name: 'Thermal Transfer Shipping Labels 4x6 (Roll of 1000)',
      sku: 'PKG-LBL-004',
      description: 'Fanfold direct thermal barcode printable shipping labels.',
      category: 'Packaging & Shipping',
      currentStock: 35,
      minimumStock: 25,
      reorderPoint: 60,
      safetyStock: 20,
      unitPrice: 18.25,
      warehouseId: wh1._id,
      supplierIds: [supPack._id],
      averageDailyDemand: 8,
      leadTimeDays: 3,
      unitOfMeasure: 'Rolls',
    },
    {
      name: 'Photoelectric Retroreflective Sensor (10m range)',
      sku: 'AUT-SEN-005',
      description: 'Optical conveyor detection sensor with adjustable sensitivity.',
      category: 'Electronics & Sensors',
      currentStock: 14,
      minimumStock: 10,
      reorderPoint: 25,
      safetyStock: 10,
      unitPrice: 85.0,
      warehouseId: wh3._id,
      supplierIds: [supSensors._id],
      averageDailyDemand: 3,
      leadTimeDays: 7,
      unitOfMeasure: 'Units',
    },
    {
      name: 'Reinforced Kraft Paper Water-Activated Tape',
      sku: 'PKG-TPE-006',
      description: 'Filament-reinforced heavy-duty carton sealing gummed tape.',
      category: 'Packaging & Shipping',
      currentStock: 28,
      minimumStock: 20,
      reorderPoint: 45,
      safetyStock: 15,
      unitPrice: 12.0,
      warehouseId: wh2._id,
      supplierIds: [supPack._id],
      averageDailyDemand: 6,
      leadTimeDays: 3,
      unitOfMeasure: 'Rolls',
    },
    {
      name: 'Hydraulic High-Pressure Hose Assembly (3/8" x 72")',
      sku: 'HYD-HSE-007',
      description: 'Wire braid synthetic rubber hydraulic line rated to 4000 PSI.',
      category: 'Hydraulics',
      currentStock: 11,
      minimumStock: 10,
      reorderPoint: 22,
      safetyStock: 8,
      unitPrice: 46.5,
      warehouseId: wh1._id,
      supplierIds: [supApex._id],
      averageDailyDemand: 2.5,
      leadTimeDays: 4,
      unitOfMeasure: 'Units',
    },

    // MODERATE / MEDIUM RISKS
    {
      name: 'ANSI Class 2 High-Visibility Safety Vest (Zipper)',
      sku: 'PPE-VST-008',
      description: 'Breathable neon yellow mesh with 2-inch silver reflective strips.',
      category: 'Safety & PPE',
      currentStock: 65,
      minimumStock: 30,
      reorderPoint: 55,
      safetyStock: 20,
      unitPrice: 9.75,
      warehouseId: wh3._id,
      supplierIds: [supSafety._id],
      averageDailyDemand: 5,
      leadTimeDays: 2,
      unitOfMeasure: 'Units',
    },
    {
      name: 'Heavy Duty Hand Stretch Wrap Film (80 Gauge 18x1500)',
      sku: 'PKG-STW-009',
      description: 'Cast puncture-resistant palletizing cling wrap.',
      category: 'Packaging & Shipping',
      currentStock: 75,
      minimumStock: 40,
      reorderPoint: 70,
      safetyStock: 30,
      unitPrice: 22.0,
      warehouseId: wh1._id,
      supplierIds: [supPack._id],
      averageDailyDemand: 7,
      leadTimeDays: 3,
      unitOfMeasure: 'Rolls',
    },
    {
      name: 'Stainless Steel Socket Cap Screws M8x30mm (100pk)',
      sku: 'FST-SCR-010',
      description: 'Corrosion resistant 304 stainless steel Allen head machine bolts.',
      category: 'Industrial Hardware',
      currentStock: 48,
      minimumStock: 25,
      reorderPoint: 45,
      safetyStock: 20,
      unitPrice: 16.0,
      warehouseId: wh2._id,
      supplierIds: [supApex._id],
      averageDailyDemand: 4,
      leadTimeDays: 4,
      unitOfMeasure: 'Packs',
    },

    // HEALTHY / OPTIMAL INVENTORY
    {
      name: 'Corrugated Shipping Box 12x12x12 (ECT-32)',
      sku: 'PKG-BOX-011',
      description: 'Standard single wall cubic corrugated shipping cartons.',
      category: 'Packaging & Shipping',
      currentStock: 520,
      minimumStock: 100,
      reorderPoint: 200,
      safetyStock: 80,
      unitPrice: 1.45,
      warehouseId: wh1._id,
      supplierIds: [supPack._id],
      averageDailyDemand: 15,
      leadTimeDays: 3,
      unitOfMeasure: 'Bundles (25ct)',
    },
    {
      name: 'Industrial Heavy Duty Hand Truck / Dolly (800 lb)',
      sku: 'MHL-TRK-012',
      description: 'Tubular steel convertible hand truck with pneumatic tires.',
      category: 'Material Handling',
      currentStock: 32,
      minimumStock: 10,
      reorderPoint: 15,
      safetyStock: 8,
      unitPrice: 145.0,
      warehouseId: wh1._id,
      supplierIds: [supPack._id],
      averageDailyDemand: 0.8,
      leadTimeDays: 3,
      unitOfMeasure: 'Units',
    },
    {
      name: 'Optical Barcode Scan Engine (1D/2D QR Engine)',
      sku: 'AUT-BCS-013',
      description: 'Embedded imaging sensor with high-density barcode reading.',
      category: 'Electronics & Sensors',
      currentStock: 85,
      minimumStock: 20,
      reorderPoint: 35,
      safetyStock: 15,
      unitPrice: 110.0,
      warehouseId: wh3._id,
      supplierIds: [supSensors._id],
      averageDailyDemand: 1.5,
      leadTimeDays: 7,
      unitOfMeasure: 'Units',
    },
    {
      name: 'OSHA Approved First Aid & Burn Kit (25-Person)',
      sku: 'PPE-AID-014',
      description: 'Wall-mountable emergency medical response station kit.',
      category: 'Safety & PPE',
      currentStock: 45,
      minimumStock: 15,
      reorderPoint: 25,
      safetyStock: 10,
      unitPrice: 38.0,
      warehouseId: wh2._id,
      supplierIds: [supSafety._id],
      averageDailyDemand: 0.5,
      leadTimeDays: 2,
      unitOfMeasure: 'Kits',
    },
    {
      name: 'Conveyor Roller Bearing Sprocket #40 (17 Tooth)',
      sku: 'BRG-SPR-015',
      description: 'Precision hardened steel chain drive roller sprocket.',
      category: 'Bearings & Motion',
      currentStock: 110,
      minimumStock: 30,
      reorderPoint: 50,
      safetyStock: 25,
      unitPrice: 34.0,
      warehouseId: wh1._id,
      supplierIds: [supApex._id],
      averageDailyDemand: 2.2,
      leadTimeDays: 4,
      unitOfMeasure: 'Units',
    },
    {
      name: 'Biodegradable Packing Peanuts (14 cu ft Bag)',
      sku: 'PKG-PNT-016',
      description: 'Organic cornstarch based antistatic loose fill void packaging.',
      category: 'Packaging & Shipping',
      currentStock: 180,
      minimumStock: 50,
      reorderPoint: 90,
      safetyStock: 40,
      unitPrice: 24.5,
      warehouseId: wh2._id,
      supplierIds: [supPack._id],
      averageDailyDemand: 4.5,
      leadTimeDays: 3,
      unitOfMeasure: 'Bags',
    },
    {
      name: 'Industrial Floor Cleaning Degreaser (5 Gal Drum)',
      sku: 'SAN-DEG-017',
      description: 'High alkalinity non-flammable warehouse concrete floor cleaner.',
      category: 'Sanitation & Maintenance',
      currentStock: 60,
      minimumStock: 15,
      reorderPoint: 30,
      safetyStock: 12,
      unitPrice: 52.0,
      warehouseId: wh3._id,
      supplierIds: [supSafety._id],
      averageDailyDemand: 1.1,
      leadTimeDays: 2,
      unitOfMeasure: 'Drums',
    },
    {
      name: 'Heavy Duty Linear Rail Guide & Carriage (1000mm)',
      sku: 'AUT-LIN-018',
      description: 'Pre-drilled alloy steel CNC automation linear motion guide.',
      category: 'Automation & Robotics',
      currentStock: 40,
      minimumStock: 12,
      reorderPoint: 20,
      safetyStock: 10,
      unitPrice: 195.0,
      warehouseId: wh2._id,
      supplierIds: [supSensors._id],
      averageDailyDemand: 0.9,
      leadTimeDays: 7,
      unitOfMeasure: 'Assemblies',
    },
    {
      name: 'Polypropylene Poly Strapping (1/2" x 9000ft)',
      sku: 'PKG-STR-019',
      description: 'Heavy duty machine and manual grade box binding strap coil.',
      category: 'Packaging & Shipping',
      currentStock: 88,
      minimumStock: 25,
      reorderPoint: 45,
      safetyStock: 20,
      unitPrice: 42.0,
      warehouseId: wh1._id,
      supplierIds: [supPack._id],
      averageDailyDemand: 2.0,
      leadTimeDays: 3,
      unitOfMeasure: 'Coils',
    },
    {
      name: 'Hydraulic Cylinder Seal Repair Rebuild Kit',
      sku: 'HYD-KIT-020',
      description: 'Complete O-ring, wiper, and rod seal replacement kit.',
      category: 'Hydraulics',
      currentStock: 55,
      minimumStock: 15,
      reorderPoint: 25,
      safetyStock: 10,
      unitPrice: 32.5,
      warehouseId: wh3._id,
      supplierIds: [supApex._id],
      averageDailyDemand: 1.2,
      leadTimeDays: 4,
      unitOfMeasure: 'Kits',
    },
  ];

  const createdProducts = await Product.create(productsData);
  console.log(`Created ${createdProducts.length} warehouse products.`);

  // 5. Seed 45 Days of Historical Demand Data for each product with seasonal multipliers
  console.log('Generating 45 days of rich historical demand curves for each product...');
  const demandRecords: any[] = [];
  const movements: any[] = [];
  const today = new Date();

  for (const product of createdProducts) {
    const baseDemand = product.averageDailyDemand;

    for (let dayOffset = 45; dayOffset >= 1; dayOffset--) {
      const recordDate = subDays(today, dayOffset);
      const dow = recordDate.getUTCDay();

      // Weekday surges (Mon & Thu higher, Sat/Sun lower)
      let dayMultiplier = 1.0;
      if (dow === 1) dayMultiplier = 1.35; // Monday ecommerce surge
      if (dow === 2) dayMultiplier = 1.15;
      if (dow === 4) dayMultiplier = 1.25; // Thursday restocking surge
      if (dow === 0 || dow === 6) dayMultiplier = 0.65; // Weekend slowdown

      // Seasonal wave factor (sinusoidal cyclical pattern)
      const seasonalWave = 1.0 + 0.2 * Math.sin((45 - dayOffset) / 5);
      const randomNoise = 0.85 + Math.random() * 0.3; // 15% random variation

      const calculatedQty = Math.max(
        1,
        Math.round(baseDemand * dayMultiplier * seasonalWave * randomNoise)
      );

      demandRecords.push({
        productId: product._id,
        date: recordDate,
        quantitySold: calculatedQty,
        seasonalFactor: Math.round(seasonalWave * 100) / 100,
        dayOfWeek: dow,
        month: recordDate.getUTCMonth() + 1,
        notes: `Simulated sales order demand telemetry (Day ${dow})`,
      });

      // Sample outbound inventory movement for recent days
      if (dayOffset <= 7) {
        movements.push({
          productId: product._id,
          warehouseId: product.warehouseId,
          movementType: 'OUTBOUND',
          quantity: calculatedQty,
          previousStock: product.currentStock + calculatedQty,
          newStock: product.currentStock,
          reference: `ORD-OUT-${formatDateRef(recordDate)}-${product.sku.substring(0, 7)}`,
          timestamp: recordDate,
          performedBy: staffUser._id,
          notes: 'Customer dispatch shipment',
        });
      }
    }
  }

  await DemandHistory.insertMany(demandRecords);
  await InventoryMovement.insertMany(movements);
  console.log(`Inserted ${demandRecords.length} historical demand rows.`);

  // 6. Seed Sample Purchase Orders in Various Workflow States
  console.log('Seeding sample purchase orders across all workflow states...');
  const criticalProd = createdProducts[0]; // Bubble Mailers
  const highProd = createdProducts[4]; // Optical Sensor
  const bearingProd = createdProducts[2]; // Bearings

  const samplePOs = [
    {
      purchaseOrderNumber: 'PO-2026-00001',
      supplierId: supPack._id,
      items: [
        {
          productId: criticalProd._id,
          sku: criticalProd.sku,
          name: criticalProd.name,
          quantity: 120,
          unitPrice: criticalProd.unitPrice,
          subtotal: 102.0,
        },
      ],
      totalAmount: 102.0,
      status: 'PENDING_APPROVAL',
      createdBy: staffUser._id,
      expectedDeliveryDate: addDays(today, supPack.leadTimeDays),
      notes: 'Urgent restocking for packaging inventory approaching critical stockout.',
      isAutoRecommended: true,
    },
    {
      purchaseOrderNumber: 'PO-2026-00002',
      supplierId: supSensors._id,
      items: [
        {
          productId: highProd._id,
          sku: highProd.sku,
          name: highProd.name,
          quantity: 25,
          unitPrice: highProd.unitPrice,
          subtotal: 2125.0,
        },
      ],
      totalAmount: 2125.0,
      status: 'APPROVED',
      createdBy: staffUser._id,
      approvedBy: managerUser._id,
      approvedAt: subDays(today, 1),
      expectedDeliveryDate: addDays(today, supSensors.leadTimeDays),
      notes: 'Approved by Warehouse Manager. Ready to be dispatched to supplier.',
      isAutoRecommended: true,
    },
    {
      purchaseOrderNumber: 'PO-2026-00003',
      supplierId: supApex._id,
      items: [
        {
          productId: bearingProd._id,
          sku: bearingProd.sku,
          name: bearingProd.name,
          quantity: 40,
          unitPrice: bearingProd.unitPrice,
          subtotal: 1120.0,
        },
      ],
      totalAmount: 1120.0,
      status: 'SUBMITTED',
      createdBy: staffUser._id,
      approvedBy: managerUser._id,
      approvedAt: subDays(today, 3),
      submittedAt: subDays(today, 2),
      supplierSubmissionRef: 'SUP-ACK-M4B7-9941AF',
      supplierStatus: 'Order acknowledged by Apex Industrial Technologies. In transit.',
      expectedDeliveryDate: addDays(today, 2),
      notes: 'Dispatched to supplier. Expected in 2 business days.',
      isAutoRecommended: true,
    },
    {
      purchaseOrderNumber: 'PO-2026-00004',
      supplierId: supSafety._id,
      items: [
        {
          productId: createdProducts[1]._id,
          sku: createdProducts[1].sku,
          name: createdProducts[1].name,
          quantity: 60,
          unitPrice: createdProducts[1].unitPrice,
          subtotal: 870.0,
        },
      ],
      totalAmount: 870.0,
      status: 'RECEIVED',
      createdBy: staffUser._id,
      approvedBy: adminUser._id,
      approvedAt: subDays(today, 6),
      submittedAt: subDays(today, 5),
      expectedDeliveryDate: subDays(today, 2),
      supplierSubmissionRef: 'SUP-ACK-K8Y2-7711BC',
      supplierStatus: 'Fulfillment completed and delivered.',
      notes: 'Full shipment received and staged into storage rack 4B.',
      isAutoRecommended: false,
    },
  ];

  const createdPOs = await PurchaseOrder.create(samplePOs);

  // Approval logs for sample POs
  for (const po of createdPOs) {
    await ApprovalLog.create({
      purchaseOrderId: po._id,
      action: 'CREATED',
      performedBy: po.createdBy,
      comments: 'Initial PO generation',
      newStatus: 'DRAFT',
      timestamp: subDays(today, 4),
    });

    if (po.status === 'PENDING_APPROVAL') {
      await ApprovalLog.create({
        purchaseOrderId: po._id,
        action: 'SUBMITTED_FOR_APPROVAL',
        performedBy: po.createdBy,
        comments: 'Sent to manager for approval',
        previousStatus: 'DRAFT',
        newStatus: 'PENDING_APPROVAL',
        timestamp: subDays(today, 2),
      });
    }

    if (po.approvedBy) {
      await ApprovalLog.create({
        purchaseOrderId: po._id,
        action: 'APPROVED',
        performedBy: po.approvedBy,
        comments: 'Authorized by manager',
        previousStatus: 'PENDING_APPROVAL',
        newStatus: 'APPROVED',
        timestamp: po.approvedAt || subDays(today, 1),
      });
    }

    if (po.status === 'SUBMITTED') {
      await ApprovalLog.create({
        purchaseOrderId: po._id,
        action: 'SUBMITTED_TO_SUPPLIER',
        performedBy: po.approvedBy || adminUser._id,
        comments: `Submitted to supplier. Confirmation Ref: ${po.supplierSubmissionRef}`,
        previousStatus: 'APPROVED',
        newStatus: 'SUBMITTED',
        timestamp: po.submittedAt || today,
      });
    }
  }

  // 7. Compute Initial Forecasts and Stockout Risk Models
  console.log('Executing initial automated forecasting and stockout risk analysis...');
  for (const prod of createdProducts) {
    await ForecastingService.generateForecast({
      productId: prod._id.toString(),
      horizonDays: 30,
      method: 'SEASONAL',
    });
  }

  await StockoutService.evaluateAllProducts();

  // 8. Create sample in-app notifications
  await Notification.create([
    {
      title: 'CRITICAL Stockout Alert: Nitrile Gloves',
      message: 'Nitrile Gloves inventory (8 boxes) is critically below safety stock. Depletion expected within 24 hours.',
      type: 'ALERT',
      link: '/stockout',
    },
    {
      title: 'Action Required: PO-2026-00001 Awaiting Approval',
      message: 'Urgent restocking order for Poly Bubble Mailers awaiting manager authorization.',
      type: 'WARNING',
      link: `/purchase-orders/${createdPOs[0]._id}`,
    },
    {
      title: 'Supplier Acknowledgment: PO-2026-00003',
      message: 'Apex Industrial has confirmed electronic order dispatch. Delivery tracking active.',
      type: 'SUCCESS',
      link: `/purchase-orders/${createdPOs[2]._id}`,
    },
  ]);

  console.log('--- Database Seeding Completed Successfully! ---');
  console.log('Sample Demo Credentials for Development:');
  console.log('1. Admin: admin@warehouse.local / AdminPass123!');
  console.log('2. Warehouse Manager: manager@warehouse.local / ManagerPass123!');
  console.log('3. Inventory Staff: staff@warehouse.local / StaffPass123!');
}

function formatDateRef(d: Date): string {
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${month}${day}`;
}

// Allow direct CLI execution: tsx src/jobs/seed.ts
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase()
    .then(async () => {
      await disconnectDB();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('Seeding error:', err);
      await disconnectDB();
      process.exit(1);
    });
}
