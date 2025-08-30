import { z } from 'zod';

// Movement type enum
export const movementTypeEnum = z.enum([
  'Receipt',
  'Issue', 
  'Adjustment',
  'Transfer In',
  'Transfer Out',
  'Production',
  'Consumption'
]);

export type MovementType = z.infer<typeof movementTypeEnum>;

// Item schema
export const itemSchema = z.object({
  id: z.number(),
  name: z.string(),
  sku: z.string(),
  description: z.string().nullable(),
  unit_of_measure: z.string(),
  is_manufactured: z.boolean(),
  reorder_level: z.number(),
  cost_price: z.number(),
  sale_price: z.number(),
  created_at: z.coerce.date()
});

export type Item = z.infer<typeof itemSchema>;

// Input schema for creating items
export const createItemInputSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  description: z.string().nullable(),
  unit_of_measure: z.string().min(1),
  is_manufactured: z.boolean(),
  reorder_level: z.number().nonnegative(),
  cost_price: z.number().nonnegative(),
  sale_price: z.number().nonnegative()
});

export type CreateItemInput = z.infer<typeof createItemInputSchema>;

// Input schema for updating items
export const updateItemInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  sku: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  unit_of_measure: z.string().min(1).optional(),
  is_manufactured: z.boolean().optional(),
  reorder_level: z.number().nonnegative().optional(),
  cost_price: z.number().nonnegative().optional(),
  sale_price: z.number().nonnegative().optional()
});

export type UpdateItemInput = z.infer<typeof updateItemInputSchema>;

// Location schema
export const locationSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  created_at: z.coerce.date()
});

export type Location = z.infer<typeof locationSchema>;

// Input schema for creating locations
export const createLocationInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable()
});

export type CreateLocationInput = z.infer<typeof createLocationInputSchema>;

// Input schema for updating locations
export const updateLocationInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional()
});

export type UpdateLocationInput = z.infer<typeof updateLocationInputSchema>;

// Supplier schema
export const supplierSchema = z.object({
  id: z.number(),
  name: z.string(),
  contact_person: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  created_at: z.coerce.date()
});

export type Supplier = z.infer<typeof supplierSchema>;

// Input schema for creating suppliers
export const createSupplierInputSchema = z.object({
  name: z.string().min(1),
  contact_person: z.string().nullable(),
  email: z.string().email().nullable(),
  phone: z.string().nullable()
});

export type CreateSupplierInput = z.infer<typeof createSupplierInputSchema>;

// Input schema for updating suppliers
export const updateSupplierInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  contact_person: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional()
});

export type UpdateSupplierInput = z.infer<typeof updateSupplierInputSchema>;

// Customer schema
export const customerSchema = z.object({
  id: z.number(),
  name: z.string(),
  contact_person: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  created_at: z.coerce.date()
});

export type Customer = z.infer<typeof customerSchema>;

// Input schema for creating customers
export const createCustomerInputSchema = z.object({
  name: z.string().min(1),
  contact_person: z.string().nullable(),
  email: z.string().email().nullable(),
  phone: z.string().nullable()
});

export type CreateCustomerInput = z.infer<typeof createCustomerInputSchema>;

// Input schema for updating customers
export const updateCustomerInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  contact_person: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional()
});

export type UpdateCustomerInput = z.infer<typeof updateCustomerInputSchema>;

// Bill of Material schema
export const billOfMaterialSchema = z.object({
  id: z.number(),
  parent_item_id: z.number(),
  component_item_id: z.number(),
  quantity: z.number(),
  created_at: z.coerce.date()
});

export type BillOfMaterial = z.infer<typeof billOfMaterialSchema>;

// Input schema for creating BOMs
export const createBillOfMaterialInputSchema = z.object({
  parent_item_id: z.number(),
  component_item_id: z.number(),
  quantity: z.number().positive()
});

export type CreateBillOfMaterialInput = z.infer<typeof createBillOfMaterialInputSchema>;

// Input schema for updating BOMs
export const updateBillOfMaterialInputSchema = z.object({
  id: z.number(),
  parent_item_id: z.number().optional(),
  component_item_id: z.number().optional(),
  quantity: z.number().positive().optional()
});

export type UpdateBillOfMaterialInput = z.infer<typeof updateBillOfMaterialInputSchema>;

// Stock Movement schema
export const stockMovementSchema = z.object({
  id: z.number(),
  item_id: z.number(),
  location_id: z.number(),
  movement_type: movementTypeEnum,
  quantity: z.number(),
  date: z.coerce.date(),
  reference: z.string().nullable(),
  created_at: z.coerce.date()
});

export type StockMovement = z.infer<typeof stockMovementSchema>;

// Input schema for creating stock movements
export const createStockMovementInputSchema = z.object({
  item_id: z.number(),
  location_id: z.number(),
  movement_type: movementTypeEnum,
  quantity: z.number(),
  date: z.coerce.date(),
  reference: z.string().nullable()
});

export type CreateStockMovementInput = z.infer<typeof createStockMovementInputSchema>;

// Input schema for stock operations
export const receiveStockInputSchema = z.object({
  item_id: z.number(),
  location_id: z.number(),
  quantity: z.number().positive(),
  supplier_id: z.number().optional(),
  reference: z.string().nullable()
});

export type ReceiveStockInput = z.infer<typeof receiveStockInputSchema>;

export const issueStockInputSchema = z.object({
  item_id: z.number(),
  location_id: z.number(),
  quantity: z.number().positive(),
  customer_id: z.number().optional(),
  reference: z.string().nullable()
});

export type IssueStockInput = z.infer<typeof issueStockInputSchema>;

export const adjustStockInputSchema = z.object({
  item_id: z.number(),
  location_id: z.number(),
  quantity: z.number(), // Can be negative for decreases
  reference: z.string().nullable()
});

export type AdjustStockInput = z.infer<typeof adjustStockInputSchema>;

export const transferStockInputSchema = z.object({
  item_id: z.number(),
  from_location_id: z.number(),
  to_location_id: z.number(),
  quantity: z.number().positive(),
  reference: z.string().nullable()
});

export type TransferStockInput = z.infer<typeof transferStockInputSchema>;

export const produceItemInputSchema = z.object({
  item_id: z.number(),
  location_id: z.number(),
  quantity: z.number().positive(),
  reference: z.string().nullable()
});

export type ProduceItemInput = z.infer<typeof produceItemInputSchema>;

// Stock level view schema (for current stock levels)
export const stockLevelSchema = z.object({
  item_id: z.number(),
  item_name: z.string(),
  item_sku: z.string(),
  location_id: z.number(),
  location_name: z.string(),
  current_quantity: z.number(),
  reorder_level: z.number(),
  unit_of_measure: z.string()
});

export type StockLevel = z.infer<typeof stockLevelSchema>;

// Dashboard metrics schema
export const dashboardMetricsSchema = z.object({
  total_items: z.number(),
  total_locations: z.number(),
  low_stock_items: z.number(),
  recent_movements: z.number()
});

export type DashboardMetrics = z.infer<typeof dashboardMetricsSchema>;

// Query params for filtering
export const getStockMovementsInputSchema = z.object({
  item_id: z.number().optional(),
  location_id: z.number().optional(),
  movement_type: movementTypeEnum.optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional()
});

export type GetStockMovementsInput = z.infer<typeof getStockMovementsInputSchema>;