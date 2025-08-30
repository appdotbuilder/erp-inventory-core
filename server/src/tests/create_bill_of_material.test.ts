import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { billOfMaterialsTable, itemsTable } from '../db/schema';
import { type CreateBillOfMaterialInput } from '../schema';
import { createBillOfMaterial } from '../handlers/create_bill_of_material';
import { eq, and } from 'drizzle-orm';

// Test data
const createTestItems = async () => {
  const items = await db.insert(itemsTable)
    .values([
      {
        name: 'Parent Product',
        sku: 'PARENT001',
        description: 'A manufactured product',
        unit_of_measure: 'piece',
        is_manufactured: true,
        reorder_level: '10',
        cost_price: '50.00',
        sale_price: '75.00'
      },
      {
        name: 'Component A',
        sku: 'COMP001',
        description: 'A component part',
        unit_of_measure: 'piece',
        is_manufactured: false,
        reorder_level: '50',
        cost_price: '5.00',
        sale_price: '8.00'
      },
      {
        name: 'Component B',
        sku: 'COMP002',
        description: 'Another component part',
        unit_of_measure: 'meter',
        is_manufactured: false,
        reorder_level: '100',
        cost_price: '2.50',
        sale_price: '4.00'
      }
    ])
    .returning()
    .execute();

  return {
    parentItem: items[0],
    componentA: items[1],
    componentB: items[2]
  };
};

describe('createBillOfMaterial', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a BOM entry successfully', async () => {
    const { parentItem, componentA } = await createTestItems();

    const testInput: CreateBillOfMaterialInput = {
      parent_item_id: parentItem.id,
      component_item_id: componentA.id,
      quantity: 2.5
    };

    const result = await createBillOfMaterial(testInput);

    // Basic field validation
    expect(result.parent_item_id).toEqual(parentItem.id);
    expect(result.component_item_id).toEqual(componentA.id);
    expect(result.quantity).toEqual(2.5);
    expect(typeof result.quantity).toEqual('number');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save BOM entry to database', async () => {
    const { parentItem, componentA } = await createTestItems();

    const testInput: CreateBillOfMaterialInput = {
      parent_item_id: parentItem.id,
      component_item_id: componentA.id,
      quantity: 3.0
    };

    const result = await createBillOfMaterial(testInput);

    // Query database to verify the BOM was saved
    const bomEntries = await db.select()
      .from(billOfMaterialsTable)
      .where(eq(billOfMaterialsTable.id, result.id))
      .execute();

    expect(bomEntries).toHaveLength(1);
    expect(bomEntries[0].parent_item_id).toEqual(parentItem.id);
    expect(bomEntries[0].component_item_id).toEqual(componentA.id);
    expect(parseFloat(bomEntries[0].quantity)).toEqual(3.0);
    expect(bomEntries[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle decimal quantities correctly', async () => {
    const { parentItem, componentB } = await createTestItems();

    const testInput: CreateBillOfMaterialInput = {
      parent_item_id: parentItem.id,
      component_item_id: componentB.id,
      quantity: 0.125 // Test fractional quantity
    };

    const result = await createBillOfMaterial(testInput);

    expect(result.quantity).toEqual(0.125);
    expect(typeof result.quantity).toEqual('number');

    // Verify in database
    const bomEntry = await db.select()
      .from(billOfMaterialsTable)
      .where(eq(billOfMaterialsTable.id, result.id))
      .execute();

    expect(parseFloat(bomEntry[0].quantity)).toEqual(0.125);
  });

  it('should throw error when parent item does not exist', async () => {
    const { componentA } = await createTestItems();

    const testInput: CreateBillOfMaterialInput = {
      parent_item_id: 99999, // Non-existent ID
      component_item_id: componentA.id,
      quantity: 1.0
    };

    await expect(createBillOfMaterial(testInput))
      .rejects.toThrow(/Parent item with ID 99999 does not exist/i);
  });

  it('should throw error when component item does not exist', async () => {
    const { parentItem } = await createTestItems();

    const testInput: CreateBillOfMaterialInput = {
      parent_item_id: parentItem.id,
      component_item_id: 99999, // Non-existent ID
      quantity: 1.0
    };

    await expect(createBillOfMaterial(testInput))
      .rejects.toThrow(/Component item with ID 99999 does not exist/i);
  });

  it('should prevent self-referencing BOM entries', async () => {
    const { parentItem } = await createTestItems();

    const testInput: CreateBillOfMaterialInput = {
      parent_item_id: parentItem.id,
      component_item_id: parentItem.id, // Same as parent
      quantity: 1.0
    };

    await expect(createBillOfMaterial(testInput))
      .rejects.toThrow(/An item cannot be a component of itself/i);
  });

  it('should prevent circular dependencies', async () => {
    const { parentItem, componentA } = await createTestItems();

    // First create a BOM entry: parentItem uses componentA
    await createBillOfMaterial({
      parent_item_id: parentItem.id,
      component_item_id: componentA.id,
      quantity: 1.0
    });

    // Try to create reverse BOM: componentA uses parentItem (circular dependency)
    const circularInput: CreateBillOfMaterialInput = {
      parent_item_id: componentA.id,
      component_item_id: parentItem.id,
      quantity: 1.0
    };

    await expect(createBillOfMaterial(circularInput))
      .rejects.toThrow(/Circular dependency detected/i);
  });

  it('should prevent duplicate BOM entries', async () => {
    const { parentItem, componentA } = await createTestItems();

    const testInput: CreateBillOfMaterialInput = {
      parent_item_id: parentItem.id,
      component_item_id: componentA.id,
      quantity: 2.0
    };

    // Create first BOM entry
    await createBillOfMaterial(testInput);

    // Try to create duplicate BOM entry
    const duplicateInput: CreateBillOfMaterialInput = {
      parent_item_id: parentItem.id,
      component_item_id: componentA.id,
      quantity: 3.0 // Different quantity, but same parent-component combination
    };

    await expect(createBillOfMaterial(duplicateInput))
      .rejects.toThrow(/BOM entry already exists for this parent-component combination/i);
  });

  it('should allow same component in multiple parent BOMs', async () => {
    const { parentItem, componentA, componentB } = await createTestItems();

    // Create another parent item
    const additionalParent = await db.insert(itemsTable)
      .values({
        name: 'Second Parent',
        sku: 'PARENT002',
        description: 'Another manufactured product',
        unit_of_measure: 'piece',
        is_manufactured: true,
        reorder_level: '5',
        cost_price: '30.00',
        sale_price: '45.00'
      })
      .returning()
      .execute();

    // Create BOM entries with same component for different parents
    const bom1 = await createBillOfMaterial({
      parent_item_id: parentItem.id,
      component_item_id: componentA.id,
      quantity: 2.0
    });

    const bom2 = await createBillOfMaterial({
      parent_item_id: additionalParent[0].id,
      component_item_id: componentA.id, // Same component, different parent
      quantity: 1.5
    });

    expect(bom1.id).not.toEqual(bom2.id);
    expect(bom1.parent_item_id).not.toEqual(bom2.parent_item_id);
    expect(bom1.component_item_id).toEqual(bom2.component_item_id);

    // Verify both entries exist in database
    const allBoms = await db.select()
      .from(billOfMaterialsTable)
      .where(eq(billOfMaterialsTable.component_item_id, componentA.id))
      .execute();

    expect(allBoms).toHaveLength(2);
  });
});