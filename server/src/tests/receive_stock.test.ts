import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { itemsTable, locationsTable, suppliersTable, stockMovementsTable } from '../db/schema';
import { type ReceiveStockInput } from '../schema';
import { receiveStock } from '../handlers/receive_stock';
import { eq } from 'drizzle-orm';

describe('receiveStock', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testItemId: number;
  let testLocationId: number;
  let testSupplierId: number;

  beforeEach(async () => {
    // Create prerequisite data
    const item = await db.insert(itemsTable)
      .values({
        name: 'Test Item',
        sku: 'TEST-001',
        description: 'A test item',
        unit_of_measure: 'pcs',
        is_manufactured: false,
        reorder_level: '10',
        cost_price: '5.00',
        sale_price: '10.00'
      })
      .returning()
      .execute();
    testItemId = item[0].id;

    const location = await db.insert(locationsTable)
      .values({
        name: 'Warehouse A',
        description: 'Main warehouse'
      })
      .returning()
      .execute();
    testLocationId = location[0].id;

    const supplier = await db.insert(suppliersTable)
      .values({
        name: 'Test Supplier',
        contact_person: 'John Doe',
        email: 'john@supplier.com',
        phone: '123-456-7890'
      })
      .returning()
      .execute();
    testSupplierId = supplier[0].id;
  });

  it('should receive stock without supplier reference', async () => {
    const input: ReceiveStockInput = {
      item_id: testItemId,
      location_id: testLocationId,
      quantity: 100,
      reference: 'PO-001'
    };

    const result = await receiveStock(input);

    // Basic field validation
    expect(result.item_id).toEqual(testItemId);
    expect(result.location_id).toEqual(testLocationId);
    expect(result.movement_type).toEqual('Receipt');
    expect(result.quantity).toEqual(100);
    expect(typeof result.quantity).toEqual('number');
    expect(result.reference).toEqual('PO-001');
    expect(result.id).toBeDefined();
    expect(result.date).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should receive stock with supplier reference', async () => {
    const input: ReceiveStockInput = {
      item_id: testItemId,
      location_id: testLocationId,
      quantity: 50,
      supplier_id: testSupplierId,
      reference: 'PO-002'
    };

    const result = await receiveStock(input);

    // Verify supplier reference is added
    expect(result.reference).toContain('PO-002');
    expect(result.reference).toContain('Supplier: Test Supplier');
    expect(result.reference).toContain(`ID: ${testSupplierId}`);
    expect(result.quantity).toEqual(50);
    expect(result.movement_type).toEqual('Receipt');
  });

  it('should receive stock with supplier but no reference', async () => {
    const input: ReceiveStockInput = {
      item_id: testItemId,
      location_id: testLocationId,
      quantity: 25,
      supplier_id: testSupplierId,
      reference: null
    };

    const result = await receiveStock(input);

    // Verify only supplier reference is set
    expect(result.reference).toEqual(`Supplier: Test Supplier (ID: ${testSupplierId})`);
    expect(result.quantity).toEqual(25);
  });

  it('should save stock movement to database', async () => {
    const input: ReceiveStockInput = {
      item_id: testItemId,
      location_id: testLocationId,
      quantity: 75,
      reference: 'Test Receipt'
    };

    const result = await receiveStock(input);

    // Query database to verify the record was saved
    const movements = await db.select()
      .from(stockMovementsTable)
      .where(eq(stockMovementsTable.id, result.id))
      .execute();

    expect(movements).toHaveLength(1);
    expect(movements[0].item_id).toEqual(testItemId);
    expect(movements[0].location_id).toEqual(testLocationId);
    expect(movements[0].movement_type).toEqual('Receipt');
    expect(parseFloat(movements[0].quantity)).toEqual(75);
    expect(movements[0].reference).toEqual('Test Receipt');
    expect(movements[0].date).toBeInstanceOf(Date);
    expect(movements[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle decimal quantities correctly', async () => {
    const input: ReceiveStockInput = {
      item_id: testItemId,
      location_id: testLocationId,
      quantity: 12.5,
      reference: 'Decimal quantity test'
    };

    const result = await receiveStock(input);

    expect(result.quantity).toEqual(12.5);
    expect(typeof result.quantity).toEqual('number');

    // Verify in database
    const movements = await db.select()
      .from(stockMovementsTable)
      .where(eq(stockMovementsTable.id, result.id))
      .execute();

    expect(parseFloat(movements[0].quantity)).toEqual(12.5);
  });

  it('should throw error for non-existent item', async () => {
    const input: ReceiveStockInput = {
      item_id: 99999,
      location_id: testLocationId,
      quantity: 10,
      reference: 'Invalid item test'
    };

    await expect(receiveStock(input)).rejects.toThrow(/Item with id 99999 not found/i);
  });

  it('should throw error for non-existent location', async () => {
    const input: ReceiveStockInput = {
      item_id: testItemId,
      location_id: 99999,
      quantity: 10,
      reference: 'Invalid location test'
    };

    await expect(receiveStock(input)).rejects.toThrow(/Location with id 99999 not found/i);
  });

  it('should throw error for non-existent supplier', async () => {
    const input: ReceiveStockInput = {
      item_id: testItemId,
      location_id: testLocationId,
      quantity: 10,
      supplier_id: 99999,
      reference: 'Invalid supplier test'
    };

    await expect(receiveStock(input)).rejects.toThrow(/Supplier with id 99999 not found/i);
  });

  it('should handle null reference correctly', async () => {
    const input: ReceiveStockInput = {
      item_id: testItemId,
      location_id: testLocationId,
      quantity: 30,
      reference: null
    };

    const result = await receiveStock(input);

    expect(result.reference).toBeNull();
    expect(result.quantity).toEqual(30);
    expect(result.movement_type).toEqual('Receipt');
  });
});