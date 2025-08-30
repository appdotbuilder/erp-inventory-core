import { db } from '../db';
import { itemsTable, billOfMaterialsTable, stockMovementsTable } from '../db/schema';
import { eq, or } from 'drizzle-orm';

export async function deleteItem(id: number): Promise<boolean> {
  try {
    // First check if the item exists
    const existingItems = await db.select()
      .from(itemsTable)
      .where(eq(itemsTable.id, id))
      .execute();

    if (existingItems.length === 0) {
      throw new Error('Item not found');
    }

    // Check for dependencies in bill of materials (as parent or component)
    const bomDependencies = await db.select()
      .from(billOfMaterialsTable)
      .where(
        or(
          eq(billOfMaterialsTable.parent_item_id, id),
          eq(billOfMaterialsTable.component_item_id, id)
        )
      )
      .execute();

    if (bomDependencies.length > 0) {
      throw new Error('Cannot delete item: it is referenced in bill of materials');
    }

    // Check for dependencies in stock movements
    const stockDependencies = await db.select()
      .from(stockMovementsTable)
      .where(eq(stockMovementsTable.item_id, id))
      .execute();

    if (stockDependencies.length > 0) {
      throw new Error('Cannot delete item: it has stock movement history');
    }

    // If no dependencies, proceed with deletion
    const result = await db.delete(itemsTable)
      .where(eq(itemsTable.id, id))
      .execute();

    return true;
  } catch (error) {
    console.error('Item deletion failed:', error);
    throw error;
  }
}