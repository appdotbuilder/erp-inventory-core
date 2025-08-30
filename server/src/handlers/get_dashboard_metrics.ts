import { db } from '../db';
import { itemsTable, locationsTable, stockMovementsTable } from '../db/schema';
import { type DashboardMetrics } from '../schema';
import { count, sql, gte } from 'drizzle-orm';

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  try {
    // Get total items count
    const totalItemsResult = await db.select({ count: count() })
      .from(itemsTable)
      .execute();
    const total_items = totalItemsResult[0].count;

    // Get total locations count
    const totalLocationsResult = await db.select({ count: count() })
      .from(locationsTable)
      .execute();
    const total_locations = totalLocationsResult[0].count;

    // Get low stock items count using raw SQL
    // We need to calculate current stock levels and compare with reorder levels
    const lowStockQuery = sql`
      WITH current_stock AS (
        SELECT 
          sm.item_id,
          COALESCE(SUM(CAST(sm.quantity AS NUMERIC)), 0) as current_quantity
        FROM ${stockMovementsTable} sm
        GROUP BY sm.item_id
      ),
      item_stock_levels AS (
        SELECT 
          i.id,
          CAST(i.reorder_level AS NUMERIC) as reorder_level,
          COALESCE(cs.current_quantity, 0) as current_quantity
        FROM ${itemsTable} i
        LEFT JOIN current_stock cs ON i.id = cs.item_id
      )
      SELECT COUNT(*) as count
      FROM item_stock_levels
      WHERE current_quantity < reorder_level
    `;

    const lowStockResult = await db.execute(lowStockQuery);
    const low_stock_items = Number((lowStockResult.rows[0] as any).count);

    // Get recent movements count (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentMovementsResult = await db.select({ count: count() })
      .from(stockMovementsTable)
      .where(gte(stockMovementsTable.date, sevenDaysAgo))
      .execute();
    const recent_movements = recentMovementsResult[0].count;

    return {
      total_items,
      total_locations,
      low_stock_items,
      recent_movements
    };
  } catch (error) {
    console.error('Dashboard metrics query failed:', error);
    throw error;
  }
}