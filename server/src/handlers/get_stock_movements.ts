import { db } from '../db';
import { stockMovementsTable, itemsTable, locationsTable } from '../db/schema';
import { type GetStockMovementsInput, type StockMovement } from '../schema';
import { eq, and, gte, lte, desc, type SQL } from 'drizzle-orm';

export async function getStockMovements(input?: GetStockMovementsInput): Promise<StockMovement[]> {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    if (input) {
      if (input.item_id !== undefined) {
        conditions.push(eq(stockMovementsTable.item_id, input.item_id));
      }

      if (input.location_id !== undefined) {
        conditions.push(eq(stockMovementsTable.location_id, input.location_id));
      }

      if (input.movement_type !== undefined) {
        conditions.push(eq(stockMovementsTable.movement_type, input.movement_type));
      }

      if (input.start_date !== undefined) {
        conditions.push(gte(stockMovementsTable.date, input.start_date));
      }

      if (input.end_date !== undefined) {
        conditions.push(lte(stockMovementsTable.date, input.end_date));
      }
    }

    // Build the complete query based on whether we have conditions
    const results = conditions.length > 0
      ? await db.select({
          id: stockMovementsTable.id,
          item_id: stockMovementsTable.item_id,
          location_id: stockMovementsTable.location_id,
          movement_type: stockMovementsTable.movement_type,
          quantity: stockMovementsTable.quantity,
          date: stockMovementsTable.date,
          reference: stockMovementsTable.reference,
          created_at: stockMovementsTable.created_at,
        })
        .from(stockMovementsTable)
        .innerJoin(itemsTable, eq(stockMovementsTable.item_id, itemsTable.id))
        .innerJoin(locationsTable, eq(stockMovementsTable.location_id, locationsTable.id))
        .where(conditions.length === 1 ? conditions[0] : and(...conditions))
        .orderBy(desc(stockMovementsTable.date), desc(stockMovementsTable.created_at))
        .execute()
      : await db.select({
          id: stockMovementsTable.id,
          item_id: stockMovementsTable.item_id,
          location_id: stockMovementsTable.location_id,
          movement_type: stockMovementsTable.movement_type,
          quantity: stockMovementsTable.quantity,
          date: stockMovementsTable.date,
          reference: stockMovementsTable.reference,
          created_at: stockMovementsTable.created_at,
        })
        .from(stockMovementsTable)
        .innerJoin(itemsTable, eq(stockMovementsTable.item_id, itemsTable.id))
        .innerJoin(locationsTable, eq(stockMovementsTable.location_id, locationsTable.id))
        .orderBy(desc(stockMovementsTable.date), desc(stockMovementsTable.created_at))
        .execute();

    // Convert numeric fields back to numbers and return
    return results.map(result => ({
      id: result.id,
      item_id: result.item_id,
      location_id: result.location_id,
      movement_type: result.movement_type,
      quantity: parseFloat(result.quantity), // Convert numeric to number
      date: result.date,
      reference: result.reference,
      created_at: result.created_at,
    }));
  } catch (error) {
    console.error('Failed to fetch stock movements:', error);
    throw error;
  }
}