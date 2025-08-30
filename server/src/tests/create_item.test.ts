import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { itemsTable } from '../db/schema';
import { type CreateItemInput } from '../schema';
import { createItem } from '../handlers/create_item';
import { eq } from 'drizzle-orm';

// Test input with all fields
const testInput: CreateItemInput = {
  name: 'Test Widget',
  sku: 'TW-001',
  description: 'A high-quality test widget',
  unit_of_measure: 'pieces',
  is_manufactured: false,
  reorder_level: 10.5,
  cost_price: 25.99,
  sale_price: 45.99
};

// Test input with nullable field
const testInputWithNullDescription: CreateItemInput = {
  name: 'Widget Without Description',
  sku: 'WND-001',
  description: null,
  unit_of_measure: 'kg',
  is_manufactured: true,
  reorder_level: 0,
  cost_price: 0,
  sale_price: 15.75
};

describe('createItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an item with all fields', async () => {
    const result = await createItem(testInput);

    // Basic field validation
    expect(result.name).toEqual('Test Widget');
    expect(result.sku).toEqual('TW-001');
    expect(result.description).toEqual('A high-quality test widget');
    expect(result.unit_of_measure).toEqual('pieces');
    expect(result.is_manufactured).toEqual(false);
    expect(result.reorder_level).toEqual(10.5);
    expect(result.cost_price).toEqual(25.99);
    expect(result.sale_price).toEqual(45.99);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);

    // Verify numeric types are correctly converted
    expect(typeof result.reorder_level).toBe('number');
    expect(typeof result.cost_price).toBe('number');
    expect(typeof result.sale_price).toBe('number');
  });

  it('should create an item with null description', async () => {
    const result = await createItem(testInputWithNullDescription);

    expect(result.name).toEqual('Widget Without Description');
    expect(result.sku).toEqual('WND-001');
    expect(result.description).toBeNull();
    expect(result.unit_of_measure).toEqual('kg');
    expect(result.is_manufactured).toEqual(true);
    expect(result.reorder_level).toEqual(0);
    expect(result.cost_price).toEqual(0);
    expect(result.sale_price).toEqual(15.75);
  });

  it('should save item to database correctly', async () => {
    const result = await createItem(testInput);

    // Query database directly to verify data persistence
    const items = await db.select()
      .from(itemsTable)
      .where(eq(itemsTable.id, result.id))
      .execute();

    expect(items).toHaveLength(1);
    const savedItem = items[0];
    
    expect(savedItem.name).toEqual('Test Widget');
    expect(savedItem.sku).toEqual('TW-001');
    expect(savedItem.description).toEqual('A high-quality test widget');
    expect(savedItem.unit_of_measure).toEqual('pieces');
    expect(savedItem.is_manufactured).toEqual(false);
    
    // Verify numeric fields are stored correctly and can be parsed
    expect(parseFloat(savedItem.reorder_level)).toEqual(10.5);
    expect(parseFloat(savedItem.cost_price)).toEqual(25.99);
    expect(parseFloat(savedItem.sale_price)).toEqual(45.99);
    expect(savedItem.created_at).toBeInstanceOf(Date);
  });

  it('should enforce unique name constraint', async () => {
    // Create first item
    await createItem(testInput);

    // Try to create another item with same name but different SKU
    const duplicateNameInput: CreateItemInput = {
      ...testInput,
      sku: 'DIFFERENT-SKU'
    };

    await expect(createItem(duplicateNameInput)).rejects.toThrow(/unique/i);
  });

  it('should enforce unique sku constraint', async () => {
    // Create first item
    await createItem(testInput);

    // Try to create another item with same SKU but different name
    const duplicateSkuInput: CreateItemInput = {
      ...testInput,
      name: 'Different Name'
    };

    await expect(createItem(duplicateSkuInput)).rejects.toThrow(/unique/i);
  });

  it('should handle decimal precision correctly', async () => {
    const precisionTestInput: CreateItemInput = {
      name: 'Precision Test Item',
      sku: 'PTI-001',
      description: 'Testing decimal precision',
      unit_of_measure: 'liters',
      is_manufactured: false,
      reorder_level: 99.99,
      cost_price: 123.45,
      sale_price: 999.99
    };

    const result = await createItem(precisionTestInput);

    // Verify precision is maintained within reasonable bounds (PostgreSQL numeric stores up to 2 decimal places by default)
    expect(result.reorder_level).toEqual(99.99);
    expect(result.cost_price).toEqual(123.45);
    expect(result.sale_price).toEqual(999.99);
    expect(typeof result.reorder_level).toBe('number');
    expect(typeof result.cost_price).toBe('number');
    expect(typeof result.sale_price).toBe('number');
  });

  it('should create manufactured item correctly', async () => {
    const manufacturedInput: CreateItemInput = {
      name: 'Assembly Product',
      sku: 'ASM-001',
      description: 'A manufactured assembly',
      unit_of_measure: 'units',
      is_manufactured: true,
      reorder_level: 5,
      cost_price: 100.00,
      sale_price: 175.50
    };

    const result = await createItem(manufacturedInput);

    expect(result.is_manufactured).toEqual(true);
    expect(result.name).toEqual('Assembly Product');
    expect(typeof result.cost_price).toBe('number');
    expect(typeof result.sale_price).toBe('number');
  });
});