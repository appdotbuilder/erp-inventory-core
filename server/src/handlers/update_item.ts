import { db } from '../db';
import { itemsTable } from '../db/schema';
import { type UpdateItemInput, type Item } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateItem(input: UpdateItemInput): Promise<Item> {
  try {
    // First check if the item exists
    const existingItems = await db.select()
      .from(itemsTable)
      .where(eq(itemsTable.id, input.id))
      .execute();

    if (existingItems.length === 0) {
      throw new Error(`Item with id ${input.id} not found`);
    }

    // Build update object with only provided fields
    const updateData: Partial<typeof itemsTable.$inferInsert> = {};
    
    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.sku !== undefined) {
      updateData.sku = input.sku;
    }
    if (input.description !== undefined) {
      updateData.description = input.description;
    }
    if (input.unit_of_measure !== undefined) {
      updateData.unit_of_measure = input.unit_of_measure;
    }
    if (input.is_manufactured !== undefined) {
      updateData.is_manufactured = input.is_manufactured;
    }
    if (input.reorder_level !== undefined) {
      updateData.reorder_level = input.reorder_level.toString();
    }
    if (input.cost_price !== undefined) {
      updateData.cost_price = input.cost_price.toString();
    }
    if (input.sale_price !== undefined) {
      updateData.sale_price = input.sale_price.toString();
    }

    // Update the item
    const result = await db.update(itemsTable)
      .set(updateData)
      .where(eq(itemsTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const updatedItem = result[0];
    return {
      ...updatedItem,
      reorder_level: parseFloat(updatedItem.reorder_level),
      cost_price: parseFloat(updatedItem.cost_price),
      sale_price: parseFloat(updatedItem.sale_price)
    };
  } catch (error) {
    console.error('Item update failed:', error);
    throw error;
  }
}