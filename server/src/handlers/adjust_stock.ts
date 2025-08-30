import { db } from '../db';
import { stockMovementsTable, itemsTable, locationsTable } from '../db/schema';
import { type AdjustStockInput, type StockMovement } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function adjustStock(input: AdjustStockInput): Promise<StockMovement> {
  try {
    // Validate that item exists
    const itemExists = await db.select()
      .from(itemsTable)
      .where(eq(itemsTable.id, input.item_id))
      .execute();

    if (itemExists.length === 0) {
      throw new Error(`Item with id ${input.item_id} does not exist`);
    }

    // Validate that location exists
    const locationExists = await db.select()
      .from(locationsTable)
      .where(eq(locationsTable.id, input.location_id))
      .execute();

    if (locationExists.length === 0) {
      throw new Error(`Location with id ${input.location_id} does not exist`);
    }

    // Create stock movement record
    const result = await db.insert(stockMovementsTable)
      .values({
        item_id: input.item_id,
        location_id: input.location_id,
        movement_type: 'Adjustment',
        quantity: input.quantity.toString(), // Convert number to string for numeric column
        date: new Date(),
        reference: input.reference
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const movement = result[0];
    return {
      ...movement,
      quantity: parseFloat(movement.quantity) // Convert string back to number
    };
  } catch (error) {
    console.error('Stock adjustment failed:', error);
    throw error;
  }
}