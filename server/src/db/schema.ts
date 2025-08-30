import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define the movement type enum
export const movementTypeEnum = pgEnum('movement_type', [
  'Receipt',
  'Issue',
  'Adjustment',
  'Transfer In',
  'Transfer Out',
  'Production',
  'Consumption'
]);

// Items table
export const itemsTable = pgTable('items', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  sku: text('sku').notNull().unique(),
  description: text('description'), // Nullable
  unit_of_measure: text('unit_of_measure').notNull(),
  is_manufactured: boolean('is_manufactured').notNull().default(false),
  reorder_level: numeric('reorder_level', { precision: 10, scale: 2 }).notNull().default('0'),
  cost_price: numeric('cost_price', { precision: 10, scale: 2 }).notNull().default('0'),
  sale_price: numeric('sale_price', { precision: 10, scale: 2 }).notNull().default('0'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Locations table
export const locationsTable = pgTable('locations', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'), // Nullable
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Suppliers table
export const suppliersTable = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  contact_person: text('contact_person'), // Nullable
  email: text('email'), // Nullable
  phone: text('phone'), // Nullable
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Customers table
export const customersTable = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  contact_person: text('contact_person'), // Nullable
  email: text('email'), // Nullable
  phone: text('phone'), // Nullable
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Bill of Materials table
export const billOfMaterialsTable = pgTable('bill_of_materials', {
  id: serial('id').primaryKey(),
  parent_item_id: integer('parent_item_id').notNull().references(() => itemsTable.id),
  component_item_id: integer('component_item_id').notNull().references(() => itemsTable.id),
  quantity: numeric('quantity', { precision: 10, scale: 4 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Stock Movements table
export const stockMovementsTable = pgTable('stock_movements', {
  id: serial('id').primaryKey(),
  item_id: integer('item_id').notNull().references(() => itemsTable.id),
  location_id: integer('location_id').notNull().references(() => locationsTable.id),
  movement_type: movementTypeEnum('movement_type').notNull(),
  quantity: numeric('quantity', { precision: 10, scale: 4 }).notNull(),
  date: timestamp('date').notNull(),
  reference: text('reference'), // Nullable
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Define relations
export const itemsRelations = relations(itemsTable, ({ many }) => ({
  stockMovements: many(stockMovementsTable),
  bomParents: many(billOfMaterialsTable, { relationName: 'parentItem' }),
  bomComponents: many(billOfMaterialsTable, { relationName: 'componentItem' }),
}));

export const locationsRelations = relations(locationsTable, ({ many }) => ({
  stockMovements: many(stockMovementsTable),
}));

export const suppliersRelations = relations(suppliersTable, ({ many }) => ({
  // Suppliers don't have direct foreign keys but can be linked via reference in stock movements
}));

export const customersRelations = relations(customersTable, ({ many }) => ({
  // Customers don't have direct foreign keys but can be linked via reference in stock movements
}));

export const billOfMaterialsRelations = relations(billOfMaterialsTable, ({ one }) => ({
  parentItem: one(itemsTable, {
    fields: [billOfMaterialsTable.parent_item_id],
    references: [itemsTable.id],
    relationName: 'parentItem',
  }),
  componentItem: one(itemsTable, {
    fields: [billOfMaterialsTable.component_item_id],
    references: [itemsTable.id],
    relationName: 'componentItem',
  }),
}));

export const stockMovementsRelations = relations(stockMovementsTable, ({ one }) => ({
  item: one(itemsTable, {
    fields: [stockMovementsTable.item_id],
    references: [itemsTable.id],
  }),
  location: one(locationsTable, {
    fields: [stockMovementsTable.location_id],
    references: [locationsTable.id],
  }),
}));

// TypeScript types for the table schemas
export type Item = typeof itemsTable.$inferSelect;
export type NewItem = typeof itemsTable.$inferInsert;

export type Location = typeof locationsTable.$inferSelect;
export type NewLocation = typeof locationsTable.$inferInsert;

export type Supplier = typeof suppliersTable.$inferSelect;
export type NewSupplier = typeof suppliersTable.$inferInsert;

export type Customer = typeof customersTable.$inferSelect;
export type NewCustomer = typeof customersTable.$inferInsert;

export type BillOfMaterial = typeof billOfMaterialsTable.$inferSelect;
export type NewBillOfMaterial = typeof billOfMaterialsTable.$inferInsert;

export type StockMovement = typeof stockMovementsTable.$inferSelect;
export type NewStockMovement = typeof stockMovementsTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  items: itemsTable,
  locations: locationsTable,
  suppliers: suppliersTable,
  customers: customersTable,
  billOfMaterials: billOfMaterialsTable,
  stockMovements: stockMovementsTable,
};