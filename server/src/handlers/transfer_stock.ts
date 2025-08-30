import { db } from '../db';
import { stockMovementsTable, itemsTable, locationsTable } from '../db/schema';
import { type TransferStockInput, type StockMovement } from '../schema';
import { eq, and, sum } from 'drizzle-orm';

export const transferStock = async (input: TransferStockInput): Promise<StockMovement[]> => {
  try {
    // Verify item exists
    const item = await db.select()
      .from(itemsTable)
      .where(eq(itemsTable.id, input.item_id))
      .execute();

    if (item.length === 0) {
      throw new Error(`Item with id ${input.item_id} does not exist`);
    }

    // Verify both locations exist
    const fromLocation = await db.select()
      .from(locationsTable)
      .where(eq(locationsTable.id, input.from_location_id))
      .execute();

    if (fromLocation.length === 0) {
      throw new Error(`Source location with id ${input.from_location_id} does not exist`);
    }

    const toLocation = await db.select()
      .from(locationsTable)
      .where(eq(locationsTable.id, input.to_location_id))
      .execute();

    if (toLocation.length === 0) {
      throw new Error(`Destination location with id ${input.to_location_id} does not exist`);
    }

    // Prevent transfer to same location
    if (input.from_location_id === input.to_location_id) {
      throw new Error('Cannot transfer stock to the same location');
    }

    // Calculate current stock at source location
    const stockResult = await db.select({
      currentStock: sum(stockMovementsTable.quantity)
    })
      .from(stockMovementsTable)
      .where(
        and(
          eq(stockMovementsTable.item_id, input.item_id),
          eq(stockMovementsTable.location_id, input.from_location_id)
        )
      )
      .execute();

    const currentStock = stockResult[0]?.currentStock ? parseFloat(stockResult[0].currentStock) : 0;

    // Check if sufficient stock is available
    if (currentStock < input.quantity) {
      throw new Error(`Insufficient stock. Available: ${currentStock}, Required: ${input.quantity}`);
    }

    const currentDate = new Date();

    // Create transfer out movement (negative quantity)
    const transferOutResult = await db.insert(stockMovementsTable)
      .values({
        item_id: input.item_id,
        location_id: input.from_location_id,
        movement_type: 'Transfer Out',
        quantity: (-input.quantity).toString(), // Convert to string for numeric column
        date: currentDate,
        reference: input.reference
      })
      .returning()
      .execute();

    // Create transfer in movement (positive quantity)
    const transferInResult = await db.insert(stockMovementsTable)
      .values({
        item_id: input.item_id,
        location_id: input.to_location_id,
        movement_type: 'Transfer In',
        quantity: input.quantity.toString(), // Convert to string for numeric column
        date: currentDate,
        reference: input.reference
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers
    const transferOut: StockMovement = {
      ...transferOutResult[0],
      quantity: parseFloat(transferOutResult[0].quantity)
    };

    const transferIn: StockMovement = {
      ...transferInResult[0],
      quantity: parseFloat(transferInResult[0].quantity)
    };

    return [transferOut, transferIn];
  } catch (error) {
    console.error('Stock transfer failed:', error);
    throw error;
  }
};