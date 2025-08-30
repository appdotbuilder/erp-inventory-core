import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { itemsTable } from '../db/schema';
import { type CreateItemInput } from '../schema';
import { getItems } from '../handlers/get_items';

// Test item inputs
const testItem1: CreateItemInput = {
  name: 'Test Widget',
  sku: 'TW-001',
  description: 'A widget for testing',
  unit_of_measure: 'pieces',
  is_manufactured: false,
  reorder_level: 10,
  cost_price: 5.99,
  sale_price: 12.49
};

const testItem2: CreateItemInput = {
  name: 'Test Component',
  sku: 'TC-002',
  description: null,
  unit_of_measure: 'units',
  is_manufactured: true,
  reorder_level: 25,
  cost_price: 15.00,
  sale_price: 30.00
};

const testItem3: CreateItemInput = {
  name: 'Premium Item',
  sku: 'PI-003',
  description: 'High-value manufactured item',
  unit_of_measure: 'each',
  is_manufactured: true,
  reorder_level: 5,
  cost_price: 100.75,
  sale_price: 250.25
};

describe('getItems', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no items exist', async () => {
    const result = await getItems();

    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return single item with correct data types', async () => {
    // Insert test item
    await db.insert(itemsTable)
      .values({
        ...testItem1,
        reorder_level: testItem1.reorder_level.toString(),
        cost_price: testItem1.cost_price.toString(),
        sale_price: testItem1.sale_price.toString()
      })
      .execute();

    const result = await getItems();

    expect(result).toHaveLength(1);
    const item = result[0];
    
    // Verify basic fields
    expect(item.name).toBe('Test Widget');
    expect(item.sku).toBe('TW-001');
    expect(item.description).toBe('A widget for testing');
    expect(item.unit_of_measure).toBe('pieces');
    expect(item.is_manufactured).toBe(false);
    
    // Verify numeric fields are converted to numbers
    expect(typeof item.reorder_level).toBe('number');
    expect(item.reorder_level).toBe(10);
    
    expect(typeof item.cost_price).toBe('number');
    expect(item.cost_price).toBe(5.99);
    
    expect(typeof item.sale_price).toBe('number');
    expect(item.sale_price).toBe(12.49);
    
    // Verify metadata
    expect(item.id).toBeDefined();
    expect(item.created_at).toBeInstanceOf(Date);
  });

  it('should return multiple items in correct order', async () => {
    // Insert test items
    await db.insert(itemsTable)
      .values([
        {
          ...testItem1,
          reorder_level: testItem1.reorder_level.toString(),
          cost_price: testItem1.cost_price.toString(),
          sale_price: testItem1.sale_price.toString()
        },
        {
          ...testItem2,
          reorder_level: testItem2.reorder_level.toString(),
          cost_price: testItem2.cost_price.toString(),
          sale_price: testItem2.sale_price.toString()
        },
        {
          ...testItem3,
          reorder_level: testItem3.reorder_level.toString(),
          cost_price: testItem3.cost_price.toString(),
          sale_price: testItem3.sale_price.toString()
        }
      ])
      .execute();

    const result = await getItems();

    expect(result).toHaveLength(3);
    
    // Verify items are returned (order by ID ascending by default)
    expect(result[0].name).toBe('Test Widget');
    expect(result[1].name).toBe('Test Component');
    expect(result[2].name).toBe('Premium Item');
    
    // Verify all items have correct numeric conversions
    result.forEach(item => {
      expect(typeof item.reorder_level).toBe('number');
      expect(typeof item.cost_price).toBe('number');
      expect(typeof item.sale_price).toBe('number');
      expect(item.id).toBeDefined();
      expect(item.created_at).toBeInstanceOf(Date);
    });
  });

  it('should handle items with null descriptions', async () => {
    // Insert item with null description
    await db.insert(itemsTable)
      .values({
        ...testItem2,
        reorder_level: testItem2.reorder_level.toString(),
        cost_price: testItem2.cost_price.toString(),
        sale_price: testItem2.sale_price.toString()
      })
      .execute();

    const result = await getItems();

    expect(result).toHaveLength(1);
    expect(result[0].description).toBeNull();
    expect(result[0].name).toBe('Test Component');
  });

  it('should handle items with zero values correctly', async () => {
    // Insert item with zero cost/sale prices
    await db.insert(itemsTable)
      .values({
        name: 'Free Item',
        sku: 'FREE-001',
        description: 'Item with zero prices',
        unit_of_measure: 'pieces',
        is_manufactured: false,
        reorder_level: '0',
        cost_price: '0',
        sale_price: '0'
      })
      .execute();

    const result = await getItems();

    expect(result).toHaveLength(1);
    const item = result[0];
    
    expect(item.reorder_level).toBe(0);
    expect(item.cost_price).toBe(0);
    expect(item.sale_price).toBe(0);
    
    // Ensure types are still numbers, not strings
    expect(typeof item.reorder_level).toBe('number');
    expect(typeof item.cost_price).toBe('number');
    expect(typeof item.sale_price).toBe('number');
  });

  it('should handle items with decimal precision correctly', async () => {
    // Insert item with high precision decimals
    await db.insert(itemsTable)
      .values({
        name: 'Precision Item',
        sku: 'PREC-001',
        description: 'Item with decimal precision',
        unit_of_measure: 'grams',
        is_manufactured: true,
        reorder_level: '12.5',
        cost_price: '25.75',
        sale_price: '50.25'
      })
      .execute();

    const result = await getItems();

    expect(result).toHaveLength(1);
    const item = result[0];
    
    expect(item.reorder_level).toBe(12.5);
    expect(item.cost_price).toBe(25.75);
    expect(item.sale_price).toBe(50.25);
    
    // Verify precision is maintained
    expect(typeof item.reorder_level).toBe('number');
    expect(typeof item.cost_price).toBe('number');
    expect(typeof item.sale_price).toBe('number');
  });

  it('should handle manufactured and non-manufactured items', async () => {
    // Insert both manufactured and non-manufactured items
    await db.insert(itemsTable)
      .values([
        {
          ...testItem1, // non-manufactured
          reorder_level: testItem1.reorder_level.toString(),
          cost_price: testItem1.cost_price.toString(),
          sale_price: testItem1.sale_price.toString()
        },
        {
          ...testItem2, // manufactured
          reorder_level: testItem2.reorder_level.toString(),
          cost_price: testItem2.cost_price.toString(),
          sale_price: testItem2.sale_price.toString()
        }
      ])
      .execute();

    const result = await getItems();

    expect(result).toHaveLength(2);
    
    const nonManufactured = result.find(item => item.sku === 'TW-001');
    const manufactured = result.find(item => item.sku === 'TC-002');
    
    expect(nonManufactured?.is_manufactured).toBe(false);
    expect(manufactured?.is_manufactured).toBe(true);
  });
});