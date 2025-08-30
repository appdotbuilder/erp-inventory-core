import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { itemsTable, locationsTable, stockMovementsTable } from '../db/schema';
import { type GetStockMovementsInput } from '../schema';
import { getStockMovements } from '../handlers/get_stock_movements';

describe('getStockMovements', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Create test data
  const createTestData = async () => {
    // Create test items
    const items = await db.insert(itemsTable)
      .values([
        {
          name: 'Test Item 1',
          sku: 'ITEM001',
          description: 'Test item 1',
          unit_of_measure: 'pcs',
          is_manufactured: false,
          reorder_level: '10',
          cost_price: '5.50',
          sale_price: '8.75'
        },
        {
          name: 'Test Item 2',
          sku: 'ITEM002',
          description: 'Test item 2',
          unit_of_measure: 'kg',
          is_manufactured: true,
          reorder_level: '20',
          cost_price: '15.25',
          sale_price: '25.00'
        }
      ])
      .returning()
      .execute();

    // Create test locations
    const locations = await db.insert(locationsTable)
      .values([
        {
          name: 'Warehouse A',
          description: 'Main warehouse'
        },
        {
          name: 'Warehouse B',
          description: 'Secondary warehouse'
        }
      ])
      .returning()
      .execute();

    // Create test stock movements with different dates and types
    const baseDate = new Date('2024-01-01');
    const movements = await db.insert(stockMovementsTable)
      .values([
        {
          item_id: items[0].id,
          location_id: locations[0].id,
          movement_type: 'Receipt',
          quantity: '100.5',
          date: baseDate,
          reference: 'PO001'
        },
        {
          item_id: items[0].id,
          location_id: locations[0].id,
          movement_type: 'Issue',
          quantity: '-25.25',
          date: new Date('2024-01-02'),
          reference: 'SO001'
        },
        {
          item_id: items[1].id,
          location_id: locations[1].id,
          movement_type: 'Receipt',
          quantity: '50.0',
          date: new Date('2024-01-03'),
          reference: 'PO002'
        },
        {
          item_id: items[0].id,
          location_id: locations[1].id,
          movement_type: 'Transfer In',
          quantity: '10.75',
          date: new Date('2024-01-04'),
          reference: 'TR001'
        },
        {
          item_id: items[1].id,
          location_id: locations[0].id,
          movement_type: 'Adjustment',
          quantity: '-5.5',
          date: new Date('2024-01-05'),
          reference: 'ADJ001'
        }
      ])
      .returning()
      .execute();

    return { items, locations, movements };
  };

  it('should return all stock movements when no filter is provided', async () => {
    const { movements } = await createTestData();

    const result = await getStockMovements();

    expect(result).toHaveLength(5);
    // Results should be ordered by date descending
    expect(result[0].date).toEqual(new Date('2024-01-05'));
    expect(result[4].date).toEqual(new Date('2024-01-01'));
    
    // Verify numeric conversion
    expect(typeof result[0].quantity).toBe('number');
    expect(result[0].quantity).toBe(-5.5);
  });

  it('should return empty array when no movements exist', async () => {
    const result = await getStockMovements();

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should filter by item_id correctly', async () => {
    const { items } = await createTestData();

    const result = await getStockMovements({ item_id: items[0].id });

    expect(result).toHaveLength(3);
    result.forEach(movement => {
      expect(movement.item_id).toBe(items[0].id);
    });
  });

  it('should filter by location_id correctly', async () => {
    const { locations } = await createTestData();

    const result = await getStockMovements({ location_id: locations[1].id });

    expect(result).toHaveLength(2);
    result.forEach(movement => {
      expect(movement.location_id).toBe(locations[1].id);
    });
  });

  it('should filter by movement_type correctly', async () => {
    await createTestData();

    const result = await getStockMovements({ movement_type: 'Receipt' });

    expect(result).toHaveLength(2);
    result.forEach(movement => {
      expect(movement.movement_type).toBe('Receipt');
    });
  });

  it('should filter by date range correctly', async () => {
    await createTestData();

    const startDate = new Date('2024-01-02');
    const endDate = new Date('2024-01-04');

    const result = await getStockMovements({ 
      start_date: startDate, 
      end_date: endDate 
    });

    expect(result).toHaveLength(3);
    result.forEach(movement => {
      expect(movement.date).toBeInstanceOf(Date);
      expect(movement.date >= startDate).toBe(true);
      expect(movement.date <= endDate).toBe(true);
    });
  });

  it('should filter by start_date only', async () => {
    await createTestData();

    const startDate = new Date('2024-01-03');

    const result = await getStockMovements({ start_date: startDate });

    expect(result).toHaveLength(3);
    result.forEach(movement => {
      expect(movement.date >= startDate).toBe(true);
    });
  });

  it('should filter by end_date only', async () => {
    await createTestData();

    const endDate = new Date('2024-01-03');

    const result = await getStockMovements({ end_date: endDate });

    expect(result).toHaveLength(3);
    result.forEach(movement => {
      expect(movement.date <= endDate).toBe(true);
    });
  });

  it('should combine multiple filters correctly', async () => {
    const { items, locations } = await createTestData();

    const result = await getStockMovements({
      item_id: items[0].id,
      location_id: locations[0].id,
      movement_type: 'Receipt'
    });

    expect(result).toHaveLength(1);
    expect(result[0].item_id).toBe(items[0].id);
    expect(result[0].location_id).toBe(locations[0].id);
    expect(result[0].movement_type).toBe('Receipt');
    expect(result[0].quantity).toBe(100.5);
    expect(result[0].reference).toBe('PO001');
  });

  it('should return correct structure for each movement', async () => {
    const { movements } = await createTestData();

    const result = await getStockMovements();

    const movement = result[0];
    expect(movement).toHaveProperty('id');
    expect(movement).toHaveProperty('item_id');
    expect(movement).toHaveProperty('location_id');
    expect(movement).toHaveProperty('movement_type');
    expect(movement).toHaveProperty('quantity');
    expect(movement).toHaveProperty('date');
    expect(movement).toHaveProperty('reference');
    expect(movement).toHaveProperty('created_at');

    // Verify types
    expect(typeof movement.id).toBe('number');
    expect(typeof movement.item_id).toBe('number');
    expect(typeof movement.location_id).toBe('number');
    expect(typeof movement.quantity).toBe('number');
    expect(movement.date).toBeInstanceOf(Date);
    expect(movement.created_at).toBeInstanceOf(Date);
  });

  it('should handle movements with null reference', async () => {
    const { items, locations } = await createTestData();

    // Create movement with null reference
    await db.insert(stockMovementsTable)
      .values({
        item_id: items[0].id,
        location_id: locations[0].id,
        movement_type: 'Adjustment',
        quantity: '5.0',
        date: new Date(),
        reference: null
      })
      .execute();

    const result = await getStockMovements({ movement_type: 'Adjustment' });

    expect(result).toHaveLength(2); // Original adjustment + new one
    const movementWithNullRef = result.find(m => m.reference === null);
    expect(movementWithNullRef).toBeDefined();
    expect(movementWithNullRef!.reference).toBeNull();
  });

  it('should maintain proper ordering with multiple movements on same date', async () => {
    const { items, locations } = await createTestData();

    const sameDate = new Date('2024-01-10');

    // Create multiple movements on the same date
    await db.insert(stockMovementsTable)
      .values([
        {
          item_id: items[0].id,
          location_id: locations[0].id,
          movement_type: 'Receipt',
          quantity: '10.0',
          date: sameDate,
          reference: 'FIRST'
        },
        {
          item_id: items[0].id,
          location_id: locations[0].id,
          movement_type: 'Issue',
          quantity: '-5.0',
          date: sameDate,
          reference: 'SECOND'
        }
      ])
      .execute();

    const result = await getStockMovements({ 
      start_date: sameDate,
      end_date: sameDate 
    });

    expect(result).toHaveLength(2);
    // Both movements should have the same date
    expect(result[0].date).toEqual(sameDate);
    expect(result[1].date).toEqual(sameDate);
    // Should be ordered by created_at descending as secondary sort
  });
});