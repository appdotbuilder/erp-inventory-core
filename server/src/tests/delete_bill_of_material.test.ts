import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { itemsTable, billOfMaterialsTable } from '../db/schema';
import { deleteBillOfMaterial } from '../handlers/delete_bill_of_material';
import { eq } from 'drizzle-orm';

describe('deleteBillOfMaterial', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test items
  const createTestItems = async () => {
    const parentItem = await db.insert(itemsTable)
      .values({
        name: 'Parent Item',
        sku: 'PARENT-001',
        description: 'A manufactured item',
        unit_of_measure: 'each',
        is_manufactured: true,
        reorder_level: '10',
        cost_price: '50.00',
        sale_price: '75.00'
      })
      .returning()
      .execute();

    const componentItem = await db.insert(itemsTable)
      .values({
        name: 'Component Item',
        sku: 'COMP-001',
        description: 'A component',
        unit_of_measure: 'each',
        is_manufactured: false,
        reorder_level: '25',
        cost_price: '10.00',
        sale_price: '15.00'
      })
      .returning()
      .execute();

    return {
      parentItem: parentItem[0],
      componentItem: componentItem[0]
    };
  };

  // Helper function to create test BOM
  const createTestBom = async (parentItemId: number, componentItemId: number) => {
    const bomResult = await db.insert(billOfMaterialsTable)
      .values({
        parent_item_id: parentItemId,
        component_item_id: componentItemId,
        quantity: '2.5000'
      })
      .returning()
      .execute();

    return bomResult[0];
  };

  it('should delete an existing BOM and return true', async () => {
    const { parentItem, componentItem } = await createTestItems();
    const bom = await createTestBom(parentItem.id, componentItem.id);

    const result = await deleteBillOfMaterial(bom.id);

    expect(result).toBe(true);

    // Verify the BOM was actually deleted from database
    const deletedBom = await db.select()
      .from(billOfMaterialsTable)
      .where(eq(billOfMaterialsTable.id, bom.id))
      .execute();

    expect(deletedBom).toHaveLength(0);
  });

  it('should return false when trying to delete non-existent BOM', async () => {
    const nonExistentId = 99999;

    const result = await deleteBillOfMaterial(nonExistentId);

    expect(result).toBe(false);
  });

  it('should not affect other BOMs when deleting one', async () => {
    const { parentItem, componentItem } = await createTestItems();
    
    // Create two BOMs
    const bom1 = await createTestBom(parentItem.id, componentItem.id);
    const bom2 = await createTestBom(parentItem.id, componentItem.id);

    // Delete the first BOM
    const result = await deleteBillOfMaterial(bom1.id);

    expect(result).toBe(true);

    // Verify first BOM is deleted
    const deletedBom = await db.select()
      .from(billOfMaterialsTable)
      .where(eq(billOfMaterialsTable.id, bom1.id))
      .execute();

    expect(deletedBom).toHaveLength(0);

    // Verify second BOM still exists
    const remainingBom = await db.select()
      .from(billOfMaterialsTable)
      .where(eq(billOfMaterialsTable.id, bom2.id))
      .execute();

    expect(remainingBom).toHaveLength(1);
    expect(remainingBom[0].id).toBe(bom2.id);
  });

  it('should handle deleting BOM with negative ID gracefully', async () => {
    const result = await deleteBillOfMaterial(-1);

    expect(result).toBe(false);
  });

  it('should handle deleting BOM with zero ID gracefully', async () => {
    const result = await deleteBillOfMaterial(0);

    expect(result).toBe(false);
  });
});