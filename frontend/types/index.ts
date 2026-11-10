export type UserRole = 'Admin' | 'Warehouse Manager' | 'Inventory Staff';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
}

export interface Warehouse {
  _id: string;
  name: string;
  code: string;
  location: string;
  capacity: number;
  active: boolean;
}

export interface Supplier {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  approved: boolean;
  active: boolean;
  leadTimeDays: number;
  reliabilityScore: number;
  supportedCategories: string[];
  rating: number;
  notes?: string;
}

export interface Product {
  _id: string;
  name: string;
  sku: string;
  description: string;
  category: string;
  currentStock: number;
  minimumStock: number;
  reorderPoint: number;
  safetyStock: number;
  unitPrice: number;
  warehouseId?: Warehouse | string;
  supplierIds?: Supplier[] | string[];
  averageDailyDemand: number;
  leadTimeDays: number;
  status: 'In Stock' | 'Low Stock' | 'Critical Stockout Risk';
  unitOfMeasure: string;
  stockoutRisk?: StockoutRisk;
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface StockoutRisk {
  _id: string;
  productId: Product | string;
  currentStock: number;
  averageDailyDemand: number;
  leadTimeDays: number;
  safetyStock: number;
  reorderPoint: number;
  estimatedStockoutDate: string;
  daysUntilStockout: number;
  riskLevel: RiskLevel;
  recommendedReorderQuantity: number;
  riskExplanation: string;
  replenishmentDeadline: string;
  calculatedAt: string;
}

export interface DailyPrediction {
  date: string;
  predictedQuantity: number;
  seasonalFactor: number;
  dayOfWeek: number;
}

export interface Forecast {
  _id: string;
  productId: Product | string;
  forecastDate: string;
  horizonDays: 7 | 30 | 90;
  method: 'MOVING_AVERAGE' | 'SEASONAL';
  baselineDemand: number;
  seasonalAdjustment: number;
  predictedDemand: number;
  historicalWindowDays: number;
  confidenceScore: number;
  isBaselineFallback: boolean;
  dailyPredictions: DailyPrediction[];
}

export type POStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUBMITTED'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'CANCELLED';

export interface POItem {
  productId: Product | string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface ApprovalLog {
  _id: string;
  purchaseOrderId: string;
  action: string;
  performedBy: User;
  comments?: string;
  previousStatus?: string;
  newStatus?: string;
  timestamp: string;
  metadata?: any;
}

export interface PurchaseOrder {
  _id: string;
  purchaseOrderNumber: string;
  supplierId: Supplier;
  items: POItem[];
  totalAmount: number;
  status: POStatus;
  createdBy: User;
  approvedBy?: User;
  approvedAt?: string;
  rejectedBy?: User;
  rejectedAt?: string;
  rejectionReason?: string;
  submittedAt?: string;
  supplierSubmissionRef?: string;
  supplierStatus?: string;
  expectedDeliveryDate: string;
  notes?: string;
  isAutoRecommended: boolean;
  createdAt: string;
  updatedAt: string;
  auditLogs?: ApprovalLog[];
}

export interface InventoryMovement {
  _id: string;
  productId: Product;
  warehouseId: Warehouse;
  movementType: 'INBOUND' | 'OUTBOUND' | 'ADJUSTMENT' | 'RETURN';
  quantity: number;
  previousStock: number;
  newStock: number;
  timestamp: string;
  reference: string;
  notes?: string;
  performedBy?: User;
}

export interface DashboardStats {
  kpis: {
    totalProducts: number;
    totalInventoryValue: number;
    lowStockProducts: number;
    predictedStockouts: number;
    criticalStockouts: number;
    pendingPurchaseOrders: number;
    activeSuppliers: number;
  };
  inventoryHealth: {
    healthy: number;
    warning: number;
    critical: number;
  };
  recentMovements: InventoryMovement[];
  recentPurchaseOrders: PurchaseOrder[];
  topRisks: StockoutRisk[];
  sampleForecasts: Forecast[];
}

export interface AlertItem {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  date: string;
  actionUrl: string;
  actionText: string;
}
