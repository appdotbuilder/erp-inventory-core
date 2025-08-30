import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { itemsTable, locationsTable, stockMovementsTable } from '../db/schema';
import { getDashboardMetrics } from '../handlers/get_dashboard_metrics';

describe('getDashboardMetrics', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return zero metrics for empty database', async () => {
    const result = await getDashboardMetrics();

    expect(result.total_items).toEqual(0);
    expect(result.total_locations).toEqual(0);
    expect(result.low_stock_items).toEqual(0);
    expect(result.recent_movements).toEqual(0);
  });

  it('should count total items and locations correctly', async () => {
    // Create test items
    await db.insert(itemsTable).values([
      {
        name: 'Item 1',
        sku: 'ITM001',
        description: 'Test item 1',
        unit_of_measure: 'pcs',
        is_manufactured: false,
        reorder_level: '10.00',
        cost_price: '5.00',
        sale_price: '10.00'
      },
      {
        name: 'Item 2',
        sku: 'ITM002',
        description: 'Test item 2',
        unit_of_measure: 'kg',
        is_manufactured: true,
        reorder_level: '20.00',
        cost_price: '15.00',
        sale_price: '25.00'
      }
    ]).execute();

    // Create test locations
    await db.insert(locationsTable).values([
      {
        name: 'Warehouse A',
        description: 'Main warehouse'
      },
      {
        name: 'Store B',
        description: 'Retail store'
      },
      {
        name: 'Factory C',
        description: 'Manufacturing facility'
      }
    ]).execute();

    const result = await getDashboardMetrics();

    expect(result.total_items).toEqual(2);
    expect(result.total_locations).toEqual(3);
    expect(result.low_stock_items).toEqual(2); // No stock movements, so both items are below reorder level
    expect(result.recent_movements).toEqual(0);
  });

  it('should identify low stock items correctly', async () => {
    // Create test item and location
    const itemResult = await db.insert(itemsTable).values({
      name: 'Test Item',
      sku: 'TEST001',
      description: 'Test item',
      unit_of_measure: 'pcs',
      is_manufactured: false,
      reorder_level: '15.00', // Reorder level of 15
      cost_price: '5.00',
      sale_price: '10.00'
    }).returning().execute();

    const locationResult = await db.insert(locationsTable).values({
      name: 'Test Location',
      description: 'Test location'
    }).returning().execute();

    const itemId = itemResult[0].id;
    const locationId = locationResult[0].id;

    // Add stock movement that keeps item below reorder level
    await db.insert(stockMovementsTable).values({
      item_id: itemId,
      location_id: locationId,
      movement_type: 'Receipt',
      quantity: '10.0000', // Only 10 units, below reorder level of 15
      date: new Date(),
      reference: 'TEST-001'
    }).execute();

    const result = await getDashboardMetrics();

    expect(result.total_items).toEqual(1);
    expect(result.total_locations).toEqual(1);
    expect(result.low_stock_items).toEqual(1); // Item is below reorder level
    expect(result.recent_movements).toEqual(1);
  });

  it('should not count items with sufficient stock as low stock', async () => {
    // Create test item and location
    const itemResult = await db.insert(itemsTable).values({
      name: 'Well Stocked Item',
      sku: 'STOCK001',
      description: 'Well stocked item',
      unit_of_measure: 'pcs',
      is_manufactured: false,
      reorder_level: '10.00', // Reorder level of 10
      cost_price: '5.00',
      sale_price: '10.00'
    }).returning().execute();

    const locationResult = await db.insert(locationsTable).values({
      name: 'Test Location',
      description: 'Test location'
    }).returning().execute();

    const itemId = itemResult[0].id;
    const locationId = locationResult[0].id;

    // Add stock movement that keeps item above reorder level
    await db.insert(stockMovementsTable).values({
      item_id: itemId,
      location_id: locationId,
      movement_type: 'Receipt',
      quantity: '25.0000', // 25 units, above reorder level of 10
      date: new Date(),
      reference: 'STOCK-001'
    }).execute();

    const result = await getDashboardMetrics();

    expect(result.total_items).toEqual(1);
    expect(result.total_locations).toEqual(1);
    expect(result.low_stock_items).toEqual(0); // Item is above reorder level
    expect(result.recent_movements).toEqual(1);
  });

  it('should count recent movements correctly', async () => {
    // Create test item and location
    const itemResult = await db.insert(itemsTable).values({
      name: 'Test Item',
      sku: 'MOVE001',
      description: 'Test item for movements',
      unit_of_measure: 'pcs',
      is_manufactured: false,
      reorder_level: '5.00',
      cost_price: '2.00',
      sale_price: '5.00'
    }).returning().execute();

    const locationResult = await db.insert(locationsTable).values({
      name: 'Test Location',
      description: 'Test location for movements'
    }).returning().execute();

    const itemId = itemResult[0].id;
    const locationId = locationResult[0].id;

    // Create movements at different dates
    const now = new Date();
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    const tenDaysAgo = new Date(now);
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    // Recent movement (within 7 days)
    await db.insert(stockMovementsTable).values({
      item_id: itemId,
      location_id: locationId,
      movement_type: 'Receipt',
      quantity: '10.0000',
      date: threeDaysAgo,
      reference: 'RECENT-001'
    }).execute();

    // Old movement (outside 7 days)
    await db.insert(stockMovementsTable).values({
      item_id: itemId,
      location_id: locationId,
      movement_type: 'Issue',
      quantity: '-5.0000',
      date: tenDaysAgo,
      reference: 'OLD-001'
    }).execute();

    // Another recent movement
    await db.insert(stockMovementsTable).values({
      item_id: itemId,
      location_id: locationId,
      movement_type: 'Adjustment',
      quantity: '2.0000',
      date: now,
      reference: 'RECENT-002'
    }).execute();

    const result = await getDashboardMetrics();

    expect(result.total_items).toEqual(1);
    expect(result.total_locations).toEqual(1);
    expect(result.recent_movements).toEqual(2); // Only recent movements count
  });

  it('should handle complex stock calculations with multiple movements', async () => {
    // Create test item and location
    const itemResult = await db.insert(itemsTable).values({
      name: 'Complex Item',
      sku: 'COMPLEX001',
      description: 'Item with complex stock movements',
      unit_of_measure: 'units',
      is_manufactured: false,
      reorder_level: '20.00', // Reorder level of 20
      cost_price: '10.00',
      sale_price: '20.00'
    }).returning().execute();

    const locationResult = await db.insert(locationsTable).values({
      name: 'Complex Location',
      description: 'Location for complex movements'
    }).returning().execute();

    const itemId = itemResult[0].id;
    const locationId = locationResult[0].id;
    const now = new Date();

    // Multiple stock movements that result in stock below reorder level
    await db.insert(stockMovementsTable).values([
      {
        item_id: itemId,
        location_id: locationId,
        movement_type: 'Receipt',
        quantity: '50.0000', // +50
        date: now,
        reference: 'RECEIPT-001'
      },
      {
        item_id: itemId,
        location_id: locationId,
        movement_type: 'Issue',
        quantity: '-30.0000', // -30
        date: now,
        reference: 'ISSUE-001'
      },
      {
        item_id: itemId,
        location_id: locationId,
        movement_type: 'Adjustment',
        quantity: '-5.0000', // -5
        date: now,
        reference: 'ADJUST-001'
      }
    ]).execute();

    // Net stock: 50 - 30 - 5 = 15, which is below reorder level of 20

    const result = await getDashboardMetrics();

    expect(result.total_items).toEqual(1);
    expect(result.total_locations).toEqual(1);
    expect(result.low_stock_items).toEqual(1); // Net stock (15) is below reorder level (20)
    expect(result.recent_movements).toEqual(3);
  });
});