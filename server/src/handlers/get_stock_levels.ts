import { db } from '../db';
import { itemsTable, locationsTable, stockMovementsTable } from '../db/schema';
import { type StockLevel } from '../schema';
import { eq, and, sum, SQL } from 'drizzle-orm';

export async function getStockLevels(itemId?: number, locationId?: number): Promise<StockLevel[]> {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];

    if (itemId !== undefined) {
      conditions.push(eq(itemsTable.id, itemId));
    }

    if (locationId !== undefined) {
      conditions.push(eq(locationsTable.id, locationId));
    }

    // Build the query step by step
    let baseQuery = db.select({
      item_id: itemsTable.id,
      item_name: itemsTable.name,
      item_sku: itemsTable.sku,
      location_id: locationsTable.id,
      location_name: locationsTable.name,
      current_quantity: sum(stockMovementsTable.quantity).as('current_quantity'),
      reorder_level: itemsTable.reorder_level,
      unit_of_measure: itemsTable.unit_of_measure,
    })
    .from(stockMovementsTable)
    .innerJoin(itemsTable, eq(stockMovementsTable.item_id, itemsTable.id))
    .innerJoin(locationsTable, eq(stockMovementsTable.location_id, locationsTable.id));

    // Apply where clause if we have conditions
    const queryWithWhere = conditions.length > 0
      ? baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions))
      : baseQuery;

    // Apply groupBy
    const finalQuery = queryWithWhere.groupBy(
      itemsTable.id,
      itemsTable.name,
      itemsTable.sku,
      locationsTable.id,
      locationsTable.name,
      itemsTable.reorder_level,
      itemsTable.unit_of_measure
    );

    const results = await finalQuery.execute();

    // Convert numeric fields and ensure proper typing
    return results.map(result => ({
      item_id: result.item_id,
      item_name: result.item_name,
      item_sku: result.item_sku,
      location_id: result.location_id,
      location_name: result.location_name,
      current_quantity: parseFloat(result.current_quantity || '0'),
      reorder_level: parseFloat(result.reorder_level),
      unit_of_measure: result.unit_of_measure,
    }));
  } catch (error) {
    console.error('Stock levels query failed:', error);
    throw error;
  }
}