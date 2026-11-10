import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Product } from '../models/Product.js';
import { Supplier } from '../models/Supplier.js';
import { PurchaseOrder } from '../models/PurchaseOrder.js';
import { Warehouse } from '../models/Warehouse.js';
import { DemandHistory } from '../models/DemandHistory.js';
import { StockoutRisk } from '../models/StockoutRisk.js';
import { ForecastingService } from '../services/forecastingService.js';
import { StockoutService } from '../services/stockoutService.js';
import { ReorderingService } from '../services/reorderingService.js';
import { ApprovalService } from '../services/approvalService.js';
import { seedDatabase } from '../jobs/seed.js';

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${testName} - ${detail || ''}`);
    failedCount++;
  }
}

async function runTestSuite() {
  console.log('\n=======================================================');
  console.log('🧪 RUNNING WAREHOUSE AGENT AUTOMATED TEST SUITE');
  console.log('=======================================================\n');

  await seedDatabase();

  const admin = await User.findOne({ role: 'Admin' });
  const manager = await User.findOne({ role: 'Warehouse Manager' });
  const staff = await User.findOne({ role: 'Inventory Staff' });

  if (!admin || !manager || !staff) {
    throw new Error('Test setup failed: Seed users missing');
  }

  const adminPayload = { id: admin._id.toString(), email: admin.email, name: admin.name, role: admin.role };
  const managerPayload = { id: manager._id.toString(), email: manager.email, name: manager.name, role: manager.role };
  const staffPayload = { id: staff._id.toString(), email: staff.email, name: staff.name, role: staff.role };

  // TEST 1: Sufficient Inventory Should Not Generate Critical Stockout Alert
  console.log('\n[Suite 1: Inventory Risk Logic]');
  const healthyProduct = await Product.findOne({ sku: 'PKG-BOX-011' }); // 520 units in stock
  if (healthyProduct) {
    const risk = await StockoutService.evaluateProductRisk(healthyProduct);
    assert(
      risk.riskLevel === 'LOW',
      'Test 1: Sufficient inventory (520 units) generates LOW risk alert',
      `Got risk level: ${risk.riskLevel}`
    );
  }

  // TEST 2: Insufficient Inventory Generates CRITICAL Stockout Alert
  const lowProduct = await Product.findOne({ sku: 'PKG-MLR-001' }); // 12 units in stock, safety 30
  if (lowProduct) {
    const risk = await StockoutService.evaluateProductRisk(lowProduct);
    assert(
      risk.riskLevel === 'CRITICAL',
      'Test 2: Insufficient inventory below safety stock generates CRITICAL alert',
      `Got risk level: ${risk.riskLevel}`
    );
    assert(
      risk.riskExplanation.length > 20,
      'Test 2b: Stockout risk has informative, transparent explanation string',
      `Explanation: ${risk.riskExplanation}`
    );
  }

  // TEST 3: Forecasting uses actual historical demand records
  console.log('\n[Suite 2: Forecasting Engine]');
  if (lowProduct) {
    const forecast = await ForecastingService.generateForecast({
      productId: lowProduct._id.toString(),
      horizonDays: 30,
      method: 'SEASONAL',
    });
    assert(
      forecast.isBaselineFallback === false,
      'Test 3: Forecasting uses actual 45-day historical records (isBaselineFallback is false)'
    );
    assert(
      forecast.dailyPredictions.length === 30,
      'Test 3b: Forecast generates exact 30 daily predictions for 30-day horizon'
    );
  }

  // TEST 4: Seasonal adjustments affect predictions when relevant data exists
  if (lowProduct) {
    const seasonalForecast = await ForecastingService.generateForecast({
      productId: lowProduct._id.toString(),
      horizonDays: 7,
      method: 'SEASONAL',
    });
    const maForecast = await ForecastingService.generateForecast({
      productId: lowProduct._id.toString(),
      horizonDays: 7,
      method: 'MOVING_AVERAGE',
    });

    const isSeasonalAdjusted = seasonalForecast.dailyPredictions.some(
      (p, i) => p.predictedQuantity !== maForecast.dailyPredictions[i]?.predictedQuantity
    );
    assert(
      isSeasonalAdjusted,
      'Test 4: Seasonal forecasting applies day-of-week and seasonal weights distinct from flat moving average'
    );
  }

  // TEST 5: A purchase order must not be submitted before approval
  console.log('\n[Suite 3: Purchase Order Approval & Workflow Rules]');
  const pendingPO = await PurchaseOrder.findOne({ status: 'PENDING_APPROVAL' });
  if (pendingPO) {
    let unapprovedSubmissionBlocked = false;
    try {
      await ApprovalService.submitToSupplier(pendingPO._id.toString(), managerPayload);
    } catch (err: any) {
      unapprovedSubmissionBlocked = true;
    }
    assert(
      unapprovedSubmissionBlocked,
      'Test 5: Purchase Order in PENDING_APPROVAL cannot be submitted to supplier without prior approval'
    );
  }

  // TEST 6: An unauthorized user must not approve a purchase order
  if (pendingPO) {
    let unauthorizedApprovalBlocked = false;
    try {
      await ApprovalService.approveOrder(pendingPO._id.toString(), staffPayload);
    } catch (err: any) {
      unauthorizedApprovalBlocked = true;
    }
    assert(
      unauthorizedApprovalBlocked,
      'Test 6: Staff user cannot approve a Purchase Order (Requires Admin or Warehouse Manager)'
    );
  }

  // TEST 7: An unapproved supplier must not receive an order
  const unapprovedSupplier = await Supplier.findOne({ approved: false });
  if (unapprovedSupplier && lowProduct) {
    const testDraftPO = await PurchaseOrder.create({
      purchaseOrderNumber: 'PO-TEST-UNAPPROVED',
      supplierId: unapprovedSupplier._id,
      items: [
        {
          productId: lowProduct._id,
          sku: lowProduct.sku,
          name: lowProduct.name,
          quantity: 20,
          unitPrice: lowProduct.unitPrice,
          subtotal: 20 * lowProduct.unitPrice,
        },
      ],
      totalAmount: 20 * lowProduct.unitPrice,
      status: 'APPROVED', // Artificially marked approved to test supplier check
      createdBy: admin._id,
      expectedDeliveryDate: new Date(),
    });

    let unapprovedSupplierBlocked = false;
    try {
      await ApprovalService.submitToSupplier(testDraftPO._id.toString(), adminPayload);
    } catch (err: any) {
      unapprovedSupplierBlocked = true;
    }
    assert(
      unapprovedSupplierBlocked,
      'Test 7: Unapproved supplier rejected from receiving order dispatch'
    );
    await PurchaseOrder.deleteOne({ _id: testDraftPO._id });
  }

  // TEST 8: Duplicate purchase order drafts must be prevented
  console.log('\n[Suite 4: Automated Reordering & Duplicate Prevention]');
  const initialCount = await PurchaseOrder.countDocuments();
  // Trigger automated reorder generation twice in succession
  await ReorderingService.autoCreateDraftPurchaseOrders(admin._id.toString());
  const countAfterFirst = await PurchaseOrder.countDocuments();
  await ReorderingService.autoCreateDraftPurchaseOrders(admin._id.toString());
  const countAfterSecond = await PurchaseOrder.countDocuments();

  assert(
    countAfterFirst === countAfterSecond,
    'Test 8: Consecutive reorder sweeps prevent duplicate PO generation for the same items'
  );

  // TEST 9: Approved purchase orders should be eligible for supplier submission
  console.log('\n[Suite 5: Electronic Supplier Integration Layer]');
  const approvedPO = await PurchaseOrder.findOne({ status: 'APPROVED' });
  if (approvedPO) {
    const result = await ApprovalService.submitToSupplier(approvedPO._id.toString(), managerPayload);
    assert(
      result.purchaseOrder.status === 'SUBMITTED',
      'Test 9: Approved PO transitions cleanly to SUBMITTED status upon supplier transmission'
    );
    assert(
      result.submissionResult.externalReference.startsWith('SUP-ACK-'),
      'Test 9b: Supplier mock adapter returns valid external reference and confirmation ID'
    );
  }

  console.log('\n=======================================================');
  console.log(`🏁 TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('=======================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTestSuite()
  .then(async () => {
    await disconnectDB();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('Test execution error:', err);
    await disconnectDB();
    process.exit(1);
  });
