export type Role = 'ADMIN' | 'USER' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS';

export type CustomerType = 'RETAIL' | 'WHOLESALE' | 'DISTRIBUTOR';
export type CustomerStatus = 'LEAD' | 'ACTIVE' | 'INACTIVE';

export type StockMovementType = 'IN' | 'OUT';
export type ChallanStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  updatedAt?: string;
  _count?: {
    createdFollowUps: number;
    createdChallans: number;
    stockMovements: number;
  };
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email: string;
  businessName: string;
  gstNumber?: string | null;
  type: CustomerType;
  status: CustomerStatus;
  address: string;
  followUpDate?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    followUps: number;
    challans: number;
  };
  followUps?: CustomerFollowUp[];
  challans?: Array<{
    id: string;
    challanNumber: string;
    status: ChallanStatus;
    totalQuantity: number;
    createdAt: string;
    confirmedAt?: string | null;
  }>;
}

export interface CustomerFollowUp {
  id: string;
  customerId: string;
  createdById: string;
  note: string;
  nextFollowUpDate?: string | null;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  unitPrice: string | number;
  currentStock: number;
  minimumStockAlertQuantity: number;
  warehouseLocation: string;
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  isLowStock?: boolean;
  stockMovements?: StockMovement[];
}

export interface StockMovement {
  id: string;
  productId: string;
  createdById: string;
  challanId?: string | null;
  quantity: number;
  type: StockMovementType;
  reason: string;
  createdAt: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    category?: string;
  };
  createdBy?: {
    id: string;
    name: string;
    email: string;
    role?: Role;
  };
  challan?: {
    id: string;
    challanNumber: string;
    status: ChallanStatus;
  } | null;
}

export interface SalesChallanItem {
  id: string;
  challanId: string;
  productId: string;
  productName: string;
  productSku: string;
  unitPrice: string | number;
  quantity: number;
  createdAt: string;
}

export interface SalesChallan {
  id: string;
  challanNumber: string;
  customerId: string;
  createdById: string;
  totalQuantity: number;
  status: ChallanStatus;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string | null;
  cancelledAt?: string | null;
  customer?: Customer;
  createdBy?: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };
  items?: SalesChallanItem[];
  _count?: {
    items: number;
  };
  stockMovements?: StockMovement[];
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}
