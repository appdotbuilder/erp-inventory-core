import { db } from '../db';
import { billOfMaterialsTable, itemsTable } from '../db/schema';
import { type UpdateBillOfMaterialInput, type BillOfMaterial } from '../schema';
import { eq, and, or } from 'drizzle-orm';

export const updateBillOfMaterial = async (input: UpdateBillOfMaterialInput): Promise<BillOfMaterial> => {
  try {
    // First, check if the BOM exists
    const existingBom = await db.select()
      .from(billOfMaterialsTable)
      .where(eq(billOfMaterialsTable.id, input.id))
      .execute();

    if (existingBom.length === 0) {
      throw new Error(`Bill of Material with id ${input.id} not found`);
    }

    const currentBom = existingBom[0];

    // Prepare the update values, using existing values if not provided
    const updateValues = {
      parent_item_id: input.parent_item_id ?? currentBom.parent_item_id,
      component_item_id: input.component_item_id ?? currentBom.component_item_id,
      quantity: input.quantity?.toString() ?? currentBom.quantity
    };

    // Prevent circular dependencies - check if parent becomes a component of itself
    // through the BOM hierarchy
    if (input.parent_item_id !== undefined || input.component_item_id !== undefined) {
      const finalParentId = updateValues.parent_item_id;
      const finalComponentId = updateValues.component_item_id;

      if (finalParentId === finalComponentId) {
        throw new Error('An item cannot be a component of itself');
      }

      // Check for circular dependency by looking for a path from component back to parent
      const hasCircularDependency = await checkCircularDependency(finalComponentId, finalParentId, input.id);
      if (hasCircularDependency) {
        throw new Error('This update would create a circular dependency in the BOM structure');
      }
    }

    // Validate that parent and component items exist if they're being changed
    if (input.parent_item_id !== undefined || input.component_item_id !== undefined) {
      const itemIds = [];
      if (input.parent_item_id !== undefined) itemIds.push(input.parent_item_id);
      if (input.component_item_id !== undefined) itemIds.push(input.component_item_id);

      const items = await db.select()
        .from(itemsTable)
        .where(or(...itemIds.map(id => eq(itemsTable.id, id))))
        .execute();

      if (items.length !== itemIds.length) {
        throw new Error('One or more referenced items do not exist');
      }
    }

    // Update the BOM entry
    const result = await db.update(billOfMaterialsTable)
      .set(updateValues)
      .where(eq(billOfMaterialsTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const updatedBom = result[0];
    return {
      ...updatedBom,
      quantity: parseFloat(updatedBom.quantity)
    };
  } catch (error) {
    console.error('BOM update failed:', error);
    throw error;
  }
};

// Helper function to check for circular dependencies
const checkCircularDependency = async (componentId: number, targetParentId: number, excludeBomId: number): Promise<boolean> => {
  // Get all BOMs where the component is a parent
  const childBoms = await db.select()
    .from(billOfMaterialsTable)
    .where(eq(billOfMaterialsTable.parent_item_id, componentId))
    .execute();

  // Filter out the current BOM being updated to avoid false positives
  const relevantBoms = childBoms.filter(bom => bom.id !== excludeBomId);

  // Check if any child component is the target parent
  for (const bom of relevantBoms) {
    if (bom.component_item_id === targetParentId) {
      return true;
    }
    // Recursively check deeper levels
    if (await checkCircularDependency(bom.component_item_id, targetParentId, excludeBomId)) {
      return true;
    }
  }

  return false;
};