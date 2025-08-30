import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { itemsTable, locationsTable, billOfMaterialsTable, stockMovementsTable } from '../db/schema';
import { deleteItem } from '../handlers/delete_item';
import { eq } from 'drizzle-orm';

describe('deleteItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an item without dependencies', async () => {
    // Create a test item
    const itemResult = await db.insert(itemsTable)
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

    const item = itemResult[0];

    // Delete the item
    const result = await deleteItem(item.id);

    expect(result).toBe(true);

    // Verify item is deleted
    const remainingItems = await db.select()
      .from(itemsTable)
      .where(eq(itemsTable.id, item.id))
      .execute();

    expect(remainingItems).toHaveLength(0);
  });

  it('should throw error when item does not exist', async () => {
    const nonExistentId = 99999;

    await expect(deleteItem(nonExistentId)).rejects.toThrow(/item not found/i);
  });

  it('should prevent deletion when item is used as parent in BOM', async () => {
    // Create parent and component items
    const parentResult = await db.insert(itemsTable)
      .values({
        name: 'Parent Item',
        sku: 'PARENT-001',
        description: 'A parent item',
        unit_of_measure: 'pcs',
        is_manufactured: true,
        reorder_level: '5',
        cost_price: '20.00',
        sale_price: '40.00'
      })
      .returning()
      .execute();

    const componentResult = await db.insert(itemsTable)
      .values({
        name: 'Component Item',
        sku: 'COMP-001',
        description: 'A component item',
        unit_of_measure: 'pcs',
        is_manufactured: false,
        reorder_level: '10',
        cost_price: '5.00',
        sale_price: '10.00'
      })
      .returning()
      .execute();

    const parentItem = parentResult[0];
    const componentItem = componentResult[0];

    // Create BOM entry
    await db.insert(billOfMaterialsTable)
      .values({
        parent_item_id: parentItem.id,
        component_item_id: componentItem.id,
        quantity: '2.0000'
      })
      .execute();

    // Try to delete parent item
    await expect(deleteItem(parentItem.id)).rejects.toThrow(/referenced in bill of materials/i);

    // Verify parent item still exists
    const remainingItems = await db.select()
      .from(itemsTable)
      .where(eq(itemsTable.id, parentItem.id))
      .execute();

    expect(remainingItems).toHaveLength(1);
  });

  it('should prevent deletion when item is used as component in BOM', async () => {
    // Create parent and component items
    const parentResult = await db.insert(itemsTable)
      .values({
        name: 'Parent Item',
        sku: 'PARENT-002',
        description: 'A parent item',
        unit_of_measure: 'pcs',
        is_manufactured: true,
        reorder_level: '5',
        cost_price: '20.00',
        sale_price: '40.00'
      })
      .returning()
      .execute();

    const componentResult = await db.insert(itemsTable)
      .values({
        name: 'Component Item',
        sku: 'COMP-002',
        description: 'A component item',
        unit_of_measure: 'pcs',
        is_manufactured: false,
        reorder_level: '10',
        cost_price: '5.00',
        sale_price: '10.00'
      })
      .returning()
      .execute();

    const parentItem = parentResult[0];
    const componentItem = componentResult[0];

    // Create BOM entry
    await db.insert(billOfMaterialsTable)
      .values({
        parent_item_id: parentItem.id,
        component_item_id: componentItem.id,
        quantity: '3.0000'
      })
      .execute();

    // Try to delete component item
    await expect(deleteItem(componentItem.id)).rejects.toThrow(/referenced in bill of materials/i);

    // Verify component item still exists
    const remainingItems = await db.select()
      .from(itemsTable)
      .where(eq(itemsTable.id, componentItem.id))
      .execute();

    expect(remainingItems).toHaveLength(1);
  });

  it('should prevent deletion when item has stock movements', async () => {
    // Create item and location
    const itemResult = await db.insert(itemsTable)
      .values({
        name: 'Stocked Item',
        sku: 'STOCK-001',
        description: 'An item with stock history',
        unit_of_measure: 'pcs',
        is_manufactured: false,
        reorder_level: '10',
        cost_price: '5.00',
        sale_price: '10.00'
      })
      .returning()
      .execute();

    const locationResult = await db.insert(locationsTable)
      .values({
        name: 'Test Warehouse',
        description: 'A test location'
      })
      .returning()
      .execute();

    const item = itemResult[0];
    const location = locationResult[0];

    // Create stock movement
    await db.insert(stockMovementsTable)
      .values({
        item_id: item.id,
        location_id: location.id,
        movement_type: 'Receipt',
        quantity: '100.0000',
        date: new Date(),
        reference: 'TEST-RECEIPT-001'
      })
      .execute();

    // Try to delete item
    await expect(deleteItem(item.id)).rejects.toThrow(/stock movement history/i);

    // Verify item still exists
    const remainingItems = await db.select()
      .from(itemsTable)
      .where(eq(itemsTable.id, item.id))
      .execute();

    expect(remainingItems).toHaveLength(1);
  });

  it('should handle multiple dependencies correctly', async () => {
    // Create items and location
    const parentResult = await db.insert(itemsTable)
      .values({
        name: 'Multi-Dependent Item',
        sku: 'MULTI-001',
        description: 'An item with multiple dependencies',
        unit_of_measure: 'pcs',
        is_manufactured: true,
        reorder_level: '5',
        cost_price: '25.00',
        sale_price: '50.00'
      })
      .returning()
      .execute();

    const componentResult = await db.insert(itemsTable)
      .values({
        name: 'Component Item',
        sku: 'COMP-MULTI-001',
        description: 'A component item',
        unit_of_measure: 'pcs',
        is_manufactured: false,
        reorder_level: '10',
        cost_price: '5.00',
        sale_price: '10.00'
      })
      .returning()
      .execute();

    const locationResult = await db.insert(locationsTable)
      .values({
        name: 'Multi Test Warehouse',
        description: 'A test location for multi dependencies'
      })
      .returning()
      .execute();

    const parentItem = parentResult[0];
    const componentItem = componentResult[0];
    const location = locationResult[0];

    // Create BOM entry
    await db.insert(billOfMaterialsTable)
      .values({
        parent_item_id: parentItem.id,
        component_item_id: componentItem.id,
        quantity: '1.0000'
      })
      .execute();

    // Create stock movement for parent item
    await db.insert(stockMovementsTable)
      .values({
        item_id: parentItem.id,
        location_id: location.id,
        movement_type: 'Production',
        quantity: '10.0000',
        date: new Date(),
        reference: 'PROD-001'
      })
      .execute();

    // Try to delete parent item (should fail due to both BOM and stock movement)
    await expect(deleteItem(parentItem.id)).rejects.toThrow(/referenced in bill of materials/i);

    // Verify item still exists
    const remainingItems = await db.select()
      .from(itemsTable)
      .where(eq(itemsTable.id, parentItem.id))
      .execute();

    expect(remainingItems).toHaveLength(1);
  });

  it('should successfully delete after removing dependencies', async () => {
    // Create items
    const parentResult = await db.insert(itemsTable)
      .values({
        name: 'Deletable Parent',
        sku: 'DEL-PARENT-001',
        description: 'A parent item that will be deletable',
        unit_of_measure: 'pcs',
        is_manufactured: true,
        reorder_level: '5',
        cost_price: '20.00',
        sale_price: '40.00'
      })
      .returning()
      .execute();

    const componentResult = await db.insert(itemsTable)
      .values({
        name: 'Deletable Component',
        sku: 'DEL-COMP-001',
        description: 'A component item that will be deletable',
        unit_of_measure: 'pcs',
        is_manufactured: false,
        reorder_level: '10',
        cost_price: '5.00',
        sale_price: '10.00'
      })
      .returning()
      .execute();

    const parentItem = parentResult[0];
    const componentItem = componentResult[0];

    // Create BOM entry
    const bomResult = await db.insert(billOfMaterialsTable)
      .values({
        parent_item_id: parentItem.id,
        component_item_id: componentItem.id,
        quantity: '2.0000'
      })
      .returning()
      .execute();

    // First attempt should fail
    await expect(deleteItem(parentItem.id)).rejects.toThrow(/referenced in bill of materials/i);

    // Remove BOM dependency
    await db.delete(billOfMaterialsTable)
      .where(eq(billOfMaterialsTable.id, bomResult[0].id))
      .execute();

    // Now deletion should succeed
    const result = await deleteItem(parentItem.id);
    expect(result).toBe(true);

    // Verify item is deleted
    const remainingItems = await db.select()
      .from(itemsTable)
      .where(eq(itemsTable.id, parentItem.id))
      .execute();

    expect(remainingItems).toHaveLength(0);
  });
});