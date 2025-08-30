import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { stockMovementsTable, itemsTable, locationsTable } from '../db/schema';
import { type AdjustStockInput } from '../schema';
import { adjustStock } from '../handlers/adjust_stock';
import { eq } from 'drizzle-orm';

describe('adjustStock', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testItem: any;
  let testLocation: any;

  beforeEach(async () => {
    // Create prerequisite test item
    const itemResult = await db.insert(itemsTable)
      .values({
        name: 'Test Item',
        sku: 'TEST-001',
        description: 'A test item',
        unit_of_measure: 'pieces',
        is_manufactured: false,
        reorder_level: '10',
        cost_price: '15.50',
        sale_price: '25.00'
      })
      .returning()
      .execute();
    testItem = itemResult[0];

    // Create prerequisite test location
    const locationResult = await db.insert(locationsTable)
      .values({
        name: 'Test Warehouse',
        description: 'A test location'
      })
      .returning()
      .execute();
    testLocation = locationResult[0];
  });

  it('should create a positive stock adjustment', async () => {
    const input: AdjustStockInput = {
      item_id: testItem.id,
      location_id: testLocation.id,
      quantity: 50,
      reference: 'Found inventory during audit'
    };

    const result = await adjustStock(input);

    // Verify basic fields
    expect(result.item_id).toEqual(testItem.id);
    expect(result.location_id).toEqual(testLocation.id);
    expect(result.movement_type).toEqual('Adjustment');
    expect(result.quantity).toEqual(50);
    expect(typeof result.quantity).toBe('number'); // Verify numeric conversion
    expect(result.reference).toEqual('Found inventory during audit');
    expect(result.id).toBeDefined();
    expect(result.date).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a negative stock adjustment', async () => {
    const input: AdjustStockInput = {
      item_id: testItem.id,
      location_id: testLocation.id,
      quantity: -25,
      reference: 'Damaged goods write-off'
    };

    const result = await adjustStock(input);

    expect(result.quantity).toEqual(-25);
    expect(result.movement_type).toEqual('Adjustment');
    expect(result.reference).toEqual('Damaged goods write-off');
    expect(typeof result.quantity).toBe('number');
  });

  it('should create adjustment with null reference', async () => {
    const input: AdjustStockInput = {
      item_id: testItem.id,
      location_id: testLocation.id,
      quantity: 10,
      reference: null
    };

    const result = await adjustStock(input);

    expect(result.quantity).toEqual(10);
    expect(result.reference).toBeNull();
  });

  it('should save stock movement to database', async () => {
    const input: AdjustStockInput = {
      item_id: testItem.id,
      location_id: testLocation.id,
      quantity: 75,
      reference: 'Inventory correction'
    };

    const result = await adjustStock(input);

    // Query database to verify the record was saved
    const movements = await db.select()
      .from(stockMovementsTable)
      .where(eq(stockMovementsTable.id, result.id))
      .execute();

    expect(movements).toHaveLength(1);
    expect(movements[0].item_id).toEqual(testItem.id);
    expect(movements[0].location_id).toEqual(testLocation.id);
    expect(movements[0].movement_type).toEqual('Adjustment');
    expect(parseFloat(movements[0].quantity)).toEqual(75);
    expect(movements[0].reference).toEqual('Inventory correction');
    expect(movements[0].date).toBeInstanceOf(Date);
    expect(movements[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle zero quantity adjustment', async () => {
    const input: AdjustStockInput = {
      item_id: testItem.id,
      location_id: testLocation.id,
      quantity: 0,
      reference: 'Zero adjustment test'
    };

    const result = await adjustStock(input);

    expect(result.quantity).toEqual(0);
    expect(typeof result.quantity).toBe('number');
  });

  it('should handle decimal quantities', async () => {
    const input: AdjustStockInput = {
      item_id: testItem.id,
      location_id: testLocation.id,
      quantity: 12.75,
      reference: 'Partial unit adjustment'
    };

    const result = await adjustStock(input);

    expect(result.quantity).toEqual(12.75);
    expect(typeof result.quantity).toBe('number');
  });

  it('should throw error for non-existent item', async () => {
    const input: AdjustStockInput = {
      item_id: 99999, // Non-existent item ID
      location_id: testLocation.id,
      quantity: 10,
      reference: null
    };

    await expect(adjustStock(input)).rejects.toThrow(/Item with id 99999 does not exist/i);
  });

  it('should throw error for non-existent location', async () => {
    const input: AdjustStockInput = {
      item_id: testItem.id,
      location_id: 99999, // Non-existent location ID
      quantity: 10,
      reference: null
    };

    await expect(adjustStock(input)).rejects.toThrow(/Location with id 99999 does not exist/i);
  });

  it('should set current date for movement', async () => {
    const beforeAdjustment = new Date();
    
    const input: AdjustStockInput = {
      item_id: testItem.id,
      location_id: testLocation.id,
      quantity: 20,
      reference: null
    };

    const result = await adjustStock(input);
    const afterAdjustment = new Date();

    // Verify the date is between before and after the operation
    expect(result.date.getTime()).toBeGreaterThanOrEqual(beforeAdjustment.getTime());
    expect(result.date.getTime()).toBeLessThanOrEqual(afterAdjustment.getTime());
  });
});