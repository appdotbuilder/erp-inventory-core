import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { itemsTable } from '../db/schema';
import { type UpdateItemInput } from '../schema';
import { updateItem } from '../handlers/update_item';
import { eq } from 'drizzle-orm';

describe('updateItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test item
  const createTestItem = async () => {
    const result = await db.insert(itemsTable)
      .values({
        name: 'Original Item',
        sku: 'ORIG-001',
        description: 'Original description',
        unit_of_measure: 'pcs',
        is_manufactured: false,
        reorder_level: '10',
        cost_price: '5.99',
        sale_price: '9.99'
      })
      .returning()
      .execute();
    
    return result[0];
  };

  it('should update all fields of an item', async () => {
    const originalItem = await createTestItem();
    
    const updateInput: UpdateItemInput = {
      id: originalItem.id,
      name: 'Updated Item',
      sku: 'UPD-001',
      description: 'Updated description',
      unit_of_measure: 'kg',
      is_manufactured: true,
      reorder_level: 20,
      cost_price: 8.99,
      sale_price: 15.99
    };

    const result = await updateItem(updateInput);

    // Verify all fields were updated
    expect(result.id).toEqual(originalItem.id);
    expect(result.name).toEqual('Updated Item');
    expect(result.sku).toEqual('UPD-001');
    expect(result.description).toEqual('Updated description');
    expect(result.unit_of_measure).toEqual('kg');
    expect(result.is_manufactured).toEqual(true);
    expect(result.reorder_level).toEqual(20);
    expect(result.cost_price).toEqual(8.99);
    expect(result.sale_price).toEqual(15.99);
    expect(result.created_at).toBeInstanceOf(Date);
    
    // Verify numeric types are correct
    expect(typeof result.reorder_level).toBe('number');
    expect(typeof result.cost_price).toBe('number');
    expect(typeof result.sale_price).toBe('number');
  });

  it('should update only specific fields when provided', async () => {
    const originalItem = await createTestItem();
    
    const updateInput: UpdateItemInput = {
      id: originalItem.id,
      name: 'Partially Updated Item',
      cost_price: 7.50
    };

    const result = await updateItem(updateInput);

    // Verify only specified fields were updated
    expect(result.name).toEqual('Partially Updated Item');
    expect(result.cost_price).toEqual(7.50);
    
    // Verify other fields remained unchanged
    expect(result.sku).toEqual('ORIG-001');
    expect(result.description).toEqual('Original description');
    expect(result.unit_of_measure).toEqual('pcs');
    expect(result.is_manufactured).toEqual(false);
    expect(result.reorder_level).toEqual(10);
    expect(result.sale_price).toEqual(9.99);
  });

  it('should update item in database', async () => {
    const originalItem = await createTestItem();
    
    const updateInput: UpdateItemInput = {
      id: originalItem.id,
      name: 'Database Updated Item',
      sku: 'DB-UPD-001'
    };

    await updateItem(updateInput);

    // Verify changes were persisted to database
    const updatedItems = await db.select()
      .from(itemsTable)
      .where(eq(itemsTable.id, originalItem.id))
      .execute();

    expect(updatedItems).toHaveLength(1);
    expect(updatedItems[0].name).toEqual('Database Updated Item');
    expect(updatedItems[0].sku).toEqual('DB-UPD-001');
  });

  it('should handle null description update', async () => {
    const originalItem = await createTestItem();
    
    const updateInput: UpdateItemInput = {
      id: originalItem.id,
      description: null
    };

    const result = await updateItem(updateInput);

    expect(result.description).toBeNull();
    
    // Verify in database
    const updatedItems = await db.select()
      .from(itemsTable)
      .where(eq(itemsTable.id, originalItem.id))
      .execute();

    expect(updatedItems[0].description).toBeNull();
  });

  it('should handle zero values for numeric fields', async () => {
    const originalItem = await createTestItem();
    
    const updateInput: UpdateItemInput = {
      id: originalItem.id,
      reorder_level: 0,
      cost_price: 0,
      sale_price: 0
    };

    const result = await updateItem(updateInput);

    expect(result.reorder_level).toEqual(0);
    expect(result.cost_price).toEqual(0);
    expect(result.sale_price).toEqual(0);
    
    // Verify numeric types are still correct
    expect(typeof result.reorder_level).toBe('number');
    expect(typeof result.cost_price).toBe('number');
    expect(typeof result.sale_price).toBe('number');
  });

  it('should throw error when item does not exist', async () => {
    const updateInput: UpdateItemInput = {
      id: 999999,
      name: 'Non-existent Item'
    };

    await expect(updateItem(updateInput)).rejects.toThrow(/item with id 999999 not found/i);
  });

  it('should handle unique constraint violation for name', async () => {
    // Create two items
    const item1 = await createTestItem();
    
    await db.insert(itemsTable)
      .values({
        name: 'Another Item',
        sku: 'ANOTHER-001',
        description: 'Another description',
        unit_of_measure: 'pcs',
        is_manufactured: false,
        reorder_level: '5',
        cost_price: '3.99',
        sale_price: '6.99'
      })
      .execute();

    // Try to update item1 to have the same name as item2
    const updateInput: UpdateItemInput = {
      id: item1.id,
      name: 'Another Item'
    };

    await expect(updateItem(updateInput)).rejects.toThrow();
  });

  it('should handle unique constraint violation for sku', async () => {
    // Create two items
    const item1 = await createTestItem();
    
    await db.insert(itemsTable)
      .values({
        name: 'SKU Test Item',
        sku: 'SKU-TEST-001',
        description: 'SKU test description',
        unit_of_measure: 'pcs',
        is_manufactured: false,
        reorder_level: '5',
        cost_price: '3.99',
        sale_price: '6.99'
      })
      .execute();

    // Try to update item1 to have the same SKU as item2
    const updateInput: UpdateItemInput = {
      id: item1.id,
      sku: 'SKU-TEST-001'
    };

    await expect(updateItem(updateInput)).rejects.toThrow();
  });

  it('should handle decimal precision correctly', async () => {
    const originalItem = await createTestItem();
    
    const updateInput: UpdateItemInput = {
      id: originalItem.id,
      reorder_level: 12.5,
      cost_price: 7.12,
      sale_price: 14.99
    };

    const result = await updateItem(updateInput);

    expect(result.reorder_level).toEqual(12.5);
    expect(result.cost_price).toEqual(7.12);
    expect(result.sale_price).toEqual(14.99);
    
    // Verify precision is maintained in database
    const updatedItems = await db.select()
      .from(itemsTable)
      .where(eq(itemsTable.id, originalItem.id))
      .execute();

    expect(parseFloat(updatedItems[0].reorder_level)).toEqual(12.5);
    expect(parseFloat(updatedItems[0].cost_price)).toEqual(7.12);
    expect(parseFloat(updatedItems[0].sale_price)).toEqual(14.99);
  });
});