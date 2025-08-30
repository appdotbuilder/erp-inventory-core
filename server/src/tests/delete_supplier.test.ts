import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { suppliersTable, stockMovementsTable, itemsTable, locationsTable } from '../db/schema';
import { deleteSupplier } from '../handlers/delete_supplier';
import { eq } from 'drizzle-orm';

describe('deleteSupplier', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a supplier successfully', async () => {
    // Create a test supplier
    const supplierResult = await db.insert(suppliersTable)
      .values({
        name: 'Test Supplier',
        contact_person: 'John Doe',
        email: 'john@testsupplier.com',
        phone: '123-456-7890'
      })
      .returning()
      .execute();

    const supplierId = supplierResult[0].id;

    // Delete the supplier
    const result = await deleteSupplier(supplierId);

    expect(result).toBe(true);

    // Verify supplier was deleted
    const suppliers = await db.select()
      .from(suppliersTable)
      .where(eq(suppliersTable.id, supplierId))
      .execute();

    expect(suppliers).toHaveLength(0);
  });

  it('should throw error when supplier does not exist', async () => {
    const nonExistentId = 9999;

    await expect(deleteSupplier(nonExistentId))
      .rejects.toThrow(/supplier with id 9999 not found/i);
  });

  it('should prevent deletion when supplier is referenced in stock movements', async () => {
    // Create prerequisite data
    const itemResult = await db.insert(itemsTable)
      .values({
        name: 'Test Item',
        sku: 'TEST-001',
        unit_of_measure: 'units',
        is_manufactured: false,
        reorder_level: '10',
        cost_price: '5.00',
        sale_price: '10.00'
      })
      .returning()
      .execute();

    const locationResult = await db.insert(locationsTable)
      .values({
        name: 'Test Location',
        description: 'Test location'
      })
      .returning()
      .execute();

    const supplierResult = await db.insert(suppliersTable)
      .values({
        name: 'Referenced Supplier',
        contact_person: 'Jane Doe',
        email: 'jane@supplier.com',
        phone: '987-654-3210'
      })
      .returning()
      .execute();

    const itemId = itemResult[0].id;
    const locationId = locationResult[0].id;
    const supplierId = supplierResult[0].id;
    const supplierName = supplierResult[0].name;

    // Create a stock movement that references the supplier
    await db.insert(stockMovementsTable)
      .values({
        item_id: itemId,
        location_id: locationId,
        movement_type: 'Receipt',
        quantity: '50',
        date: new Date(),
        reference: `Receipt from ${supplierName} - Order #12345`
      })
      .execute();

    // Attempt to delete the supplier
    await expect(deleteSupplier(supplierId))
      .rejects.toThrow(/cannot delete supplier.*stock movements reference this supplier/i);

    // Verify supplier still exists
    const suppliers = await db.select()
      .from(suppliersTable)
      .where(eq(suppliersTable.id, supplierId))
      .execute();

    expect(suppliers).toHaveLength(1);
    expect(suppliers[0].name).toBe('Referenced Supplier');
  });

  it('should allow deletion when supplier has non-receipt stock movements', async () => {
    // Create prerequisite data
    const itemResult = await db.insert(itemsTable)
      .values({
        name: 'Test Item 2',
        sku: 'TEST-002',
        unit_of_measure: 'units',
        is_manufactured: false,
        reorder_level: '10',
        cost_price: '5.00',
        sale_price: '10.00'
      })
      .returning()
      .execute();

    const locationResult = await db.insert(locationsTable)
      .values({
        name: 'Test Location 2',
        description: 'Test location 2'
      })
      .returning()
      .execute();

    const supplierResult = await db.insert(suppliersTable)
      .values({
        name: 'Unreferenced Supplier',
        contact_person: 'Bob Smith',
        email: 'bob@supplier.com',
        phone: '555-123-4567'
      })
      .returning()
      .execute();

    const itemId = itemResult[0].id;
    const locationId = locationResult[0].id;
    const supplierId = supplierResult[0].id;
    const supplierName = supplierResult[0].name;

    // Create a stock movement that references the supplier but is not a receipt
    await db.insert(stockMovementsTable)
      .values({
        item_id: itemId,
        location_id: locationId,
        movement_type: 'Issue',
        quantity: '25',
        date: new Date(),
        reference: `Sold to ${supplierName} customer`
      })
      .execute();

    // Delete should succeed since the reference is not in a receipt movement
    const result = await deleteSupplier(supplierId);

    expect(result).toBe(true);

    // Verify supplier was deleted
    const suppliers = await db.select()
      .from(suppliersTable)
      .where(eq(suppliersTable.id, supplierId))
      .execute();

    expect(suppliers).toHaveLength(0);
  });

  it('should allow deletion when supplier name appears in unrelated references', async () => {
    // Create prerequisite data
    const itemResult = await db.insert(itemsTable)
      .values({
        name: 'Test Item 3',
        sku: 'TEST-003',
        unit_of_measure: 'units',
        is_manufactured: false,
        reorder_level: '10',
        cost_price: '5.00',
        sale_price: '10.00'
      })
      .returning()
      .execute();

    const locationResult = await db.insert(locationsTable)
      .values({
        name: 'Test Location 3',
        description: 'Test location 3'
      })
      .returning()
      .execute();

    const supplierResult = await db.insert(suppliersTable)
      .values({
        name: 'Safe Supplier',
        contact_person: 'Alice Johnson',
        email: 'alice@supplier.com',
        phone: '444-555-6666'
      })
      .returning()
      .execute();

    const itemId = itemResult[0].id;
    const locationId = locationResult[0].id;
    const supplierId = supplierResult[0].id;

    // Create a stock movement with a reference that doesn't contain the supplier name
    await db.insert(stockMovementsTable)
      .values({
        item_id: itemId,
        location_id: locationId,
        movement_type: 'Receipt',
        quantity: '30',
        date: new Date(),
        reference: 'Received from Different Supplier - Order #99999'
      })
      .execute();

    // Delete should succeed since the supplier name is not in the reference
    const result = await deleteSupplier(supplierId);

    expect(result).toBe(true);

    // Verify supplier was deleted
    const suppliers = await db.select()
      .from(suppliersTable)
      .where(eq(suppliersTable.id, supplierId))
      .execute();

    expect(suppliers).toHaveLength(0);
  });
});