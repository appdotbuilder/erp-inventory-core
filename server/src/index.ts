import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createItemInputSchema,
  updateItemInputSchema,
  createLocationInputSchema,
  updateLocationInputSchema,
  createSupplierInputSchema,
  updateSupplierInputSchema,
  createCustomerInputSchema,
  updateCustomerInputSchema,
  createBillOfMaterialInputSchema,
  updateBillOfMaterialInputSchema,
  receiveStockInputSchema,
  issueStockInputSchema,
  adjustStockInputSchema,
  transferStockInputSchema,
  produceItemInputSchema,
  getStockMovementsInputSchema
} from './schema';

// Import handlers
import { createItem } from './handlers/create_item';
import { getItems } from './handlers/get_items';
import { updateItem } from './handlers/update_item';
import { deleteItem } from './handlers/delete_item';

import { createLocation } from './handlers/create_location';
import { getLocations } from './handlers/get_locations';
import { updateLocation } from './handlers/update_location';
import { deleteLocation } from './handlers/delete_location';

import { createSupplier } from './handlers/create_supplier';
import { getSuppliers } from './handlers/get_suppliers';
import { updateSupplier } from './handlers/update_supplier';
import { deleteSupplier } from './handlers/delete_supplier';

import { createCustomer } from './handlers/create_customer';
import { getCustomers } from './handlers/get_customers';
import { updateCustomer } from './handlers/update_customer';
import { deleteCustomer } from './handlers/delete_customer';

import { createBillOfMaterial } from './handlers/create_bill_of_material';
import { getBillOfMaterials } from './handlers/get_bill_of_materials';
import { updateBillOfMaterial } from './handlers/update_bill_of_material';
import { deleteBillOfMaterial } from './handlers/delete_bill_of_material';

import { receiveStock } from './handlers/receive_stock';
import { issueStock } from './handlers/issue_stock';
import { adjustStock } from './handlers/adjust_stock';
import { transferStock } from './handlers/transfer_stock';
import { produceItem } from './handlers/produce_item';

import { getStockMovements } from './handlers/get_stock_movements';
import { getStockLevels } from './handlers/get_stock_levels';
import { getDashboardMetrics } from './handlers/get_dashboard_metrics';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Dashboard
  getDashboardMetrics: publicProcedure
    .query(() => getDashboardMetrics()),

  // Items
  createItem: publicProcedure
    .input(createItemInputSchema)
    .mutation(({ input }) => createItem(input)),

  getItems: publicProcedure
    .query(() => getItems()),

  updateItem: publicProcedure
    .input(updateItemInputSchema)
    .mutation(({ input }) => updateItem(input)),

  deleteItem: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteItem(input.id)),

  // Locations
  createLocation: publicProcedure
    .input(createLocationInputSchema)
    .mutation(({ input }) => createLocation(input)),

  getLocations: publicProcedure
    .query(() => getLocations()),

  updateLocation: publicProcedure
    .input(updateLocationInputSchema)
    .mutation(({ input }) => updateLocation(input)),

  deleteLocation: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteLocation(input.id)),

  // Suppliers
  createSupplier: publicProcedure
    .input(createSupplierInputSchema)
    .mutation(({ input }) => createSupplier(input)),

  getSuppliers: publicProcedure
    .query(() => getSuppliers()),

  updateSupplier: publicProcedure
    .input(updateSupplierInputSchema)
    .mutation(({ input }) => updateSupplier(input)),

  deleteSupplier: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteSupplier(input.id)),

  // Customers
  createCustomer: publicProcedure
    .input(createCustomerInputSchema)
    .mutation(({ input }) => createCustomer(input)),

  getCustomers: publicProcedure
    .query(() => getCustomers()),

  updateCustomer: publicProcedure
    .input(updateCustomerInputSchema)
    .mutation(({ input }) => updateCustomer(input)),

  deleteCustomer: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteCustomer(input.id)),

  // Bill of Materials
  createBillOfMaterial: publicProcedure
    .input(createBillOfMaterialInputSchema)
    .mutation(({ input }) => createBillOfMaterial(input)),

  getBillOfMaterials: publicProcedure
    .input(z.object({ parentItemId: z.number().optional() }))
    .query(({ input }) => getBillOfMaterials(input.parentItemId)),

  updateBillOfMaterial: publicProcedure
    .input(updateBillOfMaterialInputSchema)
    .mutation(({ input }) => updateBillOfMaterial(input)),

  deleteBillOfMaterial: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteBillOfMaterial(input.id)),

  // Stock Operations
  receiveStock: publicProcedure
    .input(receiveStockInputSchema)
    .mutation(({ input }) => receiveStock(input)),

  issueStock: publicProcedure
    .input(issueStockInputSchema)
    .mutation(({ input }) => issueStock(input)),

  adjustStock: publicProcedure
    .input(adjustStockInputSchema)
    .mutation(({ input }) => adjustStock(input)),

  transferStock: publicProcedure
    .input(transferStockInputSchema)
    .mutation(({ input }) => transferStock(input)),

  produceItem: publicProcedure
    .input(produceItemInputSchema)
    .mutation(({ input }) => produceItem(input)),

  // Stock Reporting
  getStockMovements: publicProcedure
    .input(getStockMovementsInputSchema)
    .query(({ input }) => getStockMovements(input)),

  getStockLevels: publicProcedure
    .input(z.object({ 
      itemId: z.number().optional(), 
      locationId: z.number().optional() 
    }))
    .query(({ input }) => getStockLevels(input.itemId, input.locationId)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`ERP Inventory tRPC server listening at port: ${port}`);
}

start();