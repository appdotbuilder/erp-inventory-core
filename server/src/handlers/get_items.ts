import { db } from '../db';
import { itemsTable } from '../db/schema';
import { type Item } from '../schema';

export const getItems = async (): Promise<Item[]> => {
  try {
    const results = await db.select()
      .from(itemsTable)
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(item => ({
      ...item,
      reorder_level: parseFloat(item.reorder_level),
      cost_price: parseFloat(item.cost_price),
      sale_price: parseFloat(item.sale_price)
    }));
  } catch (error) {
    console.error('Failed to fetch items:', error);
    throw error;
  }
};