import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { billOfMaterialsTable, itemsTable } from '../db/schema';
import { type UpdateBillOfMaterialInput } from '../schema';
import { updateBillOfMaterial } from '../handlers/update_bill_of_material';
import { eq } from 'drizzle-orm';

describe('updateBillOfMaterial', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test items
  const createTestItems = async () => {
    const items = await db.insert(itemsTable)
      .values([
        {
          name: 'Parent Item 1',
          sku: 'PARENT-001',
          description: 'Test parent item 1',
          unit_of_measure: 'pcs',
          is_manufactured: true,
          reorder_level: '10',
          cost_price: '50.00',
          sale_price: '75.00'
        },
        {
          name: 'Component Item 1',
          sku: 'COMP-001',
          description: 'Test component item 1',
          unit_of_measure: 'pcs',
          is_manufactured: false,
          reorder_level: '20',
          cost_price: '25.00',
          sale_price: '35.00'
        },
        {
          name: 'Component Item 2',
          sku: 'COMP-002',
          description: 'Test component item 2',
          unit_of_measure: 'kg',
          is_manufactured: false,
          reorder_level: '15',
          cost_price: '15.00',
          sale_price: '25.00'
        },
        {
          name: 'Parent Item 2',
          sku: 'PARENT-002',
          description: 'Test parent item 2',
          unit_of_measure: 'pcs',
          is_manufactured: true,
          reorder_level: '5',
          cost_price: '100.00',
          sale_price: '150.00'
        }
      ])
      .returning()
      .execute();

    return items;
  };

  // Helper function to create a test BOM
  const createTestBom = async (parentId: number, componentId: number, quantity: number) => {
    const bom = await db.insert(billOfMaterialsTable)
      .values({
        parent_item_id: parentId,
        component_item_id: componentId,
        quantity: quantity.toString()
      })
      .returning()
      .execute();

    return bom[0];
  };

  it('should update BOM quantity only', async () => {
    const items = await createTestItems();
    const originalBom = await createTestBom(items[0].id, items[1].id, 2.5);

    const input: UpdateBillOfMaterialInput = {
      id: originalBom.id,
      quantity: 5.0
    };

    const result = await updateBillOfMaterial(input);

    expect(result.id).toEqual(originalBom.id);
    expect(result.parent_item_id).toEqual(items[0].id);
    expect(result.component_item_id).toEqual(items[1].id);
    expect(result.quantity).toEqual(5.0);
    expect(typeof result.quantity).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update BOM parent item', async () => {
    const items = await createTestItems();
    const originalBom = await createTestBom(items[0].id, items[1].id, 2.0);

    const input: UpdateBillOfMaterialInput = {
      id: originalBom.id,
      parent_item_id: items[3].id
    };

    const result = await updateBillOfMaterial(input);

    expect(result.id).toEqual(originalBom.id);
    expect(result.parent_item_id).toEqual(items[3].id);
    expect(result.component_item_id).toEqual(items[1].id);
    expect(result.quantity).toEqual(2.0);
  });

  it('should update BOM component item', async () => {
    const items = await createTestItems();
    const originalBom = await createTestBom(items[0].id, items[1].id, 3.0);

    const input: UpdateBillOfMaterialInput = {
      id: originalBom.id,
      component_item_id: items[2].id
    };

    const result = await updateBillOfMaterial(input);

    expect(result.id).toEqual(originalBom.id);
    expect(result.parent_item_id).toEqual(items[0].id);
    expect(result.component_item_id).toEqual(items[2].id);
    expect(result.quantity).toEqual(3.0);
  });

  it('should update multiple BOM fields at once', async () => {
    const items = await createTestItems();
    const originalBom = await createTestBom(items[0].id, items[1].id, 1.0);

    const input: UpdateBillOfMaterialInput = {
      id: originalBom.id,
      parent_item_id: items[3].id,
      component_item_id: items[2].id,
      quantity: 7.5
    };

    const result = await updateBillOfMaterial(input);

    expect(result.id).toEqual(originalBom.id);
    expect(result.parent_item_id).toEqual(items[3].id);
    expect(result.component_item_id).toEqual(items[2].id);
    expect(result.quantity).toEqual(7.5);
  });

  it('should save updated BOM to database', async () => {
    const items = await createTestItems();
    const originalBom = await createTestBom(items[0].id, items[1].id, 2.0);

    const input: UpdateBillOfMaterialInput = {
      id: originalBom.id,
      quantity: 4.5
    };

    await updateBillOfMaterial(input);

    // Verify the update was persisted
    const updatedBoms = await db.select()
      .from(billOfMaterialsTable)
      .where(eq(billOfMaterialsTable.id, originalBom.id))
      .execute();

    expect(updatedBoms).toHaveLength(1);
    expect(parseFloat(updatedBoms[0].quantity)).toEqual(4.5);
    expect(updatedBoms[0].parent_item_id).toEqual(items[0].id);
    expect(updatedBoms[0].component_item_id).toEqual(items[1].id);
  });

  it('should throw error when BOM does not exist', async () => {
    const input: UpdateBillOfMaterialInput = {
      id: 999,
      quantity: 5.0
    };

    await expect(updateBillOfMaterial(input)).rejects.toThrow(/not found/i);
  });

  it('should throw error when parent item does not exist', async () => {
    const items = await createTestItems();
    const originalBom = await createTestBom(items[0].id, items[1].id, 2.0);

    const input: UpdateBillOfMaterialInput = {
      id: originalBom.id,
      parent_item_id: 999
    };

    await expect(updateBillOfMaterial(input)).rejects.toThrow(/referenced items do not exist/i);
  });

  it('should throw error when component item does not exist', async () => {
    const items = await createTestItems();
    const originalBom = await createTestBom(items[0].id, items[1].id, 2.0);

    const input: UpdateBillOfMaterialInput = {
      id: originalBom.id,
      component_item_id: 999
    };

    await expect(updateBillOfMaterial(input)).rejects.toThrow(/referenced items do not exist/i);
  });

  it('should prevent direct circular dependency (item as component of itself)', async () => {
    const items = await createTestItems();
    const originalBom = await createTestBom(items[0].id, items[1].id, 2.0);

    const input: UpdateBillOfMaterialInput = {
      id: originalBom.id,
      parent_item_id: items[1].id,
      component_item_id: items[1].id
    };

    await expect(updateBillOfMaterial(input)).rejects.toThrow(/cannot be a component of itself/i);
  });

  it('should prevent indirect circular dependency', async () => {
    const items = await createTestItems();
    
    // Create initial BOM: Parent1 -> Component1
    const bom1 = await createTestBom(items[0].id, items[1].id, 2.0); // Parent1 uses Component1
    
    // Create second BOM: Parent2 -> Component2
    const bom2 = await createTestBom(items[3].id, items[2].id, 1.0); // Parent2 uses Component2

    // Update BOM2 to make Parent2 -> Parent1 (still no cycle)
    await updateBillOfMaterial({
      id: bom2.id,
      component_item_id: items[0].id // Parent2 -> Parent1
    });

    // Now try to update BOM1 to make Parent1 -> Parent2, which would create cycle: Parent1 -> Parent2 -> Parent1
    const input: UpdateBillOfMaterialInput = {
      id: bom1.id,
      component_item_id: items[3].id // Parent1 -> Parent2
    };

    await expect(updateBillOfMaterial(input)).rejects.toThrow(/circular dependency/i);
  });

  it('should allow valid BOM hierarchy changes', async () => {
    const items = await createTestItems();
    
    // Create initial BOMs
    const bom1 = await createTestBom(items[0].id, items[1].id, 2.0); // Parent1 -> Component1
    await createTestBom(items[3].id, items[2].id, 1.0); // Parent2 -> Component2

    // Update to create a valid hierarchy: Parent1 -> Component2 (no circular dependency)
    const input: UpdateBillOfMaterialInput = {
      id: bom1.id,
      component_item_id: items[2].id
    };

    const result = await updateBillOfMaterial(input);

    expect(result.parent_item_id).toEqual(items[0].id);
    expect(result.component_item_id).toEqual(items[2].id);
    expect(result.quantity).toEqual(2.0);
  });

  it('should handle decimal quantities correctly', async () => {
    const items = await createTestItems();
    const originalBom = await createTestBom(items[0].id, items[1].id, 1.0);

    const input: UpdateBillOfMaterialInput = {
      id: originalBom.id,
      quantity: 0.125 // Small decimal
    };

    const result = await updateBillOfMaterial(input);

    expect(result.quantity).toEqual(0.125);
    expect(typeof result.quantity).toBe('number');

    // Verify precision is maintained in database
    const savedBoms = await db.select()
      .from(billOfMaterialsTable)
      .where(eq(billOfMaterialsTable.id, originalBom.id))
      .execute();

    expect(parseFloat(savedBoms[0].quantity)).toEqual(0.125);
  });
});