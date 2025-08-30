import { db } from '../db';
import { billOfMaterialsTable, itemsTable } from '../db/schema';
import { type CreateBillOfMaterialInput, type BillOfMaterial } from '../schema';
import { eq, and } from 'drizzle-orm';

export const createBillOfMaterial = async (input: CreateBillOfMaterialInput): Promise<BillOfMaterial> => {
  try {
    // Validate that both parent and component items exist
    const parentItem = await db.select()
      .from(itemsTable)
      .where(eq(itemsTable.id, input.parent_item_id))
      .execute();

    if (parentItem.length === 0) {
      throw new Error(`Parent item with ID ${input.parent_item_id} does not exist`);
    }

    const componentItem = await db.select()
      .from(itemsTable)
      .where(eq(itemsTable.id, input.component_item_id))
      .execute();

    if (componentItem.length === 0) {
      throw new Error(`Component item with ID ${input.component_item_id} does not exist`);
    }

    // Prevent self-referencing BOM (item cannot be component of itself)
    if (input.parent_item_id === input.component_item_id) {
      throw new Error('An item cannot be a component of itself');
    }

    // Check for circular dependencies - prevent component from having parent as its own component
    const existingCircularBom = await db.select()
      .from(billOfMaterialsTable)
      .where(
        and(
          eq(billOfMaterialsTable.parent_item_id, input.component_item_id),
          eq(billOfMaterialsTable.component_item_id, input.parent_item_id)
        )
      )
      .execute();

    if (existingCircularBom.length > 0) {
      throw new Error('Circular dependency detected: component item is already a parent of the parent item');
    }

    // Check if BOM entry already exists (prevent duplicates)
    const existingBom = await db.select()
      .from(billOfMaterialsTable)
      .where(
        and(
          eq(billOfMaterialsTable.parent_item_id, input.parent_item_id),
          eq(billOfMaterialsTable.component_item_id, input.component_item_id)
        )
      )
      .execute();

    if (existingBom.length > 0) {
      throw new Error('BOM entry already exists for this parent-component combination');
    }

    // Insert BOM record
    const result = await db.insert(billOfMaterialsTable)
      .values({
        parent_item_id: input.parent_item_id,
        component_item_id: input.component_item_id,
        quantity: input.quantity.toString() // Convert number to string for numeric column
      })
      .returning()
      .execute();

    // Convert numeric field back to number before returning
    const bom = result[0];
    return {
      ...bom,
      quantity: parseFloat(bom.quantity) // Convert string back to number
    };
  } catch (error) {
    console.error('BOM creation failed:', error);
    throw error;
  }
};