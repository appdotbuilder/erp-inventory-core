import { db } from '../db';
import { locationsTable, stockMovementsTable } from '../db/schema';
import { eq, count } from 'drizzle-orm';

export async function deleteLocation(id: number): Promise<boolean> {
  try {
    // Check if location exists
    const existingLocation = await db.select()
      .from(locationsTable)
      .where(eq(locationsTable.id, id))
      .limit(1)
      .execute();

    if (existingLocation.length === 0) {
      throw new Error(`Location with id ${id} not found`);
    }

    // Check for dependencies - stock movements
    const stockMovementCount = await db.select({ count: count() })
      .from(stockMovementsTable)
      .where(eq(stockMovementsTable.location_id, id))
      .execute();

    if (stockMovementCount[0].count > 0) {
      throw new Error(`Cannot delete location: ${stockMovementCount[0].count} stock movements are associated with this location`);
    }

    // Delete the location
    const result = await db.delete(locationsTable)
      .where(eq(locationsTable.id, id))
      .execute();

    return result.rowCount !== null && result.rowCount > 0;
  } catch (error) {
    console.error('Location deletion failed:', error);
    throw error;
  }
}