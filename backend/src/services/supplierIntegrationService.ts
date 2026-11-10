import { ISupplier } from '../models/Supplier.js';
import { IPurchaseOrder } from '../models/PurchaseOrder.js';
import { ENV } from '../config/env.js';

export interface SupplierOrderSubmissionResult {
  success: boolean;
  externalReference: string;
  supplierConfirmationId: string;
  estimatedFulfillmentDate: Date;
  statusMessage: string;
  simulatedError?: string;
}

export interface ISupplierAdapter {
  submitOrder(
    supplier: ISupplier,
    purchaseOrder: IPurchaseOrder
  ): Promise<SupplierOrderSubmissionResult>;
}

/**
 * MockSupplierAdapter simulates an external supplier ERP / EDI / REST order placement system.
 * Designed to mirror enterprise B2B payload exchanges, generating confirmation codes,
 * lead-time acknowledgment, and handling mock edge cases.
 */
export class MockSupplierAdapter implements ISupplierAdapter {
  public async submitOrder(
    supplier: ISupplier,
    purchaseOrder: IPurchaseOrder
  ): Promise<SupplierOrderSubmissionResult> {
    // Artificial latency simulating external HTTPS / EDI roundtrip
    await new Promise((resolve) => setTimeout(resolve, ENV.SIMULATE_SUPPLIER_DELAY_MS));

    // Verify supplier eligibility
    if (!supplier.approved) {
      return {
        success: false,
        externalReference: '',
        supplierConfirmationId: '',
        estimatedFulfillmentDate: new Date(),
        statusMessage: `Submission Rejected: Supplier ${supplier.name} is not on the authorized pre-approved roster.`,
        simulatedError: 'SUPPLIER_UNAPPROVED',
      };
    }

    if (!supplier.active) {
      return {
        success: false,
        externalReference: '',
        supplierConfirmationId: '',
        estimatedFulfillmentDate: new Date(),
        statusMessage: `Submission Failed: Supplier account ${supplier.name} is inactive in vendor directory.`,
        simulatedError: 'SUPPLIER_INACTIVE',
      };
    }

    const timestamp = Date.now().toString(36).toUpperCase();
    const randomHex = Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .toUpperCase()
      .padStart(6, '0');
    const externalRef = `SUP-ACK-${timestamp}-${randomHex}`;
    const confirmationId = `CONF-${Math.floor(100000 + Math.random() * 900000)}`;

    const fulfillmentDays = supplier.leadTimeDays || 5;
    const estimatedFulfillmentDate = new Date();
    estimatedFulfillmentDate.setDate(estimatedFulfillmentDate.getDate() + fulfillmentDays);

    return {
      success: true,
      externalReference: externalRef,
      supplierConfirmationId: confirmationId,
      estimatedFulfillmentDate,
      statusMessage: `Order accepted by ${supplier.name}. Electronic confirmation #${confirmationId} issued. Delivery expected within ${fulfillmentDays} business days.`,
    };
  }
}

export class SupplierIntegrationService {
  private static adapter: ISupplierAdapter = new MockSupplierAdapter();

  public static setAdapter(adapter: ISupplierAdapter) {
    this.adapter = adapter;
  }

  public static async dispatchOrderToSupplier(
    supplier: ISupplier,
    purchaseOrder: IPurchaseOrder
  ): Promise<SupplierOrderSubmissionResult> {
    console.log(
      `[SupplierIntegration] Dispatching PO ${purchaseOrder.purchaseOrderNumber} to supplier: ${supplier.name}`
    );
    return await this.adapter.submitOrder(supplier, purchaseOrder);
  }
}
