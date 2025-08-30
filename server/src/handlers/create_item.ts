import { db } from '../db';
import { itemsTable } from '../db/schema';
import { type CreateItemInput, type Item } from '../schema';

export const createItem = async (input: CreateItemInput): Promise<Item> => {
  try {
    // Insert item record
    const result = await db.insert(itemsTable)
      .values({
        name: input.name,
        sku: input.sku,
        description: input.description,
        unit_of_measure: input.unit_of_measure,
        is_manufactured: input.is_manufactured,
        reorder_level: input.reorder_level.toString(), // Convert number to string for numeric column
        cost_price: input.cost_price.toString(), // Convert number to string for numeric column
        sale_price: input.sale_price.toString() // Convert number to string for numeric column
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const item = result[0];
    return {
      ...item,
      reorder_level: parseFloat(item.reorder_level), // Convert string back to number
      cost_price: parseFloat(item.cost_price), // Convert string back to number
      sale_price: parseFloat(item.sale_price) // Convert string back to number
    };
  } catch (error) {
    console.error('Item creation failed:', error);
    throw error;
  }
};