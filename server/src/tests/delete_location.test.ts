import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { locationsTable, stockMovementsTable, itemsTable } from '../db/schema';
import { deleteLocation } from '../handlers/delete_location';
import { eq } from 'drizzle-orm';

describe('deleteLocation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing location', async () => {
    // Create a test location
    const locationResult = await db.insert(locationsTable)
      .values({
        name: 'Test Warehouse',
        description: 'A test warehouse location'
      })
      .returning()
      .execute();

    const locationId = locationResult[0].id;

    // Delete the location
    const result = await deleteLocation(locationId);

    // Verify deletion was successful
    expect(result).toBe(true);

    // Verify location no longer exists in database
    const locations = await db.select()
      .from(locationsTable)
      .where(eq(locationsTable.id, locationId))
      .execute();

    expect(locations).toHaveLength(0);
  });

  it('should throw error when location does not exist', async () => {
    // Try to delete non-existent location
    await expect(deleteLocation(999)).rejects.toThrow(/location with id 999 not found/i);
  });

  it('should prevent deletion when location has stock movements', async () => {
    // Create prerequisites - item and location
    const itemResult = await db.insert(itemsTable)
      .values({
        name: 'Test Item',
        sku: 'TEST-001',
        description: 'A test item',
        unit_of_measure: 'pcs',
        is_manufactured: false,
        reorder_level: '10',
        cost_price: '5.00',
        sale_price: '10.00'
      })
      .returning()
      .execute();

    const locationResult = await db.insert(locationsTable)
      .values({
        name: 'Test Warehouse',
        description: 'A test warehouse location'
      })
      .returning()
      .execute();

    const itemId = itemResult[0].id;
    const locationId = locationResult[0].id;

    // Create stock movement associated with the location
    await db.insert(stockMovementsTable)
      .values({
        item_id: itemId,
        location_id: locationId,
        movement_type: 'Receipt',
        quantity: '100',
        date: new Date(),
        reference: 'Test movement'
      })
      .execute();

    // Try to delete location with stock movements
    await expect(deleteLocation(locationId)).rejects.toThrow(/cannot delete location.*stock movements are associated/i);

    // Verify location still exists
    const locations = await db.select()
      .from(locationsTable)
      .where(eq(locationsTable.id, locationId))
      .execute();

    expect(locations).toHaveLength(1);
    expect(locations[0].name).toBe('Test Warehouse');
  });

  it('should handle multiple stock movements dependency check', async () => {
    // Create prerequisites
    const itemResult = await db.insert(itemsTable)
      .values({
        name: 'Test Item',
        sku: 'TEST-001',
        description: 'A test item',
        unit_of_measure: 'pcs',
        is_manufactured: false,
        reorder_level: '10',
        cost_price: '5.00',
        sale_price: '10.00'
      })
      .returning()
      .execute();

    const locationResult = await db.insert(locationsTable)
      .values({
        name: 'Test Warehouse',
        description: 'A test warehouse location'
      })
      .returning()
      .execute();

    const itemId = itemResult[0].id;
    const locationId = locationResult[0].id;

    // Create multiple stock movements
    await db.insert(stockMovementsTable)
      .values([
        {
          item_id: itemId,
          location_id: locationId,
          movement_type: 'Receipt',
          quantity: '100',
          date: new Date(),
          reference: 'Receipt 1'
        },
        {
          item_id: itemId,
          location_id: locationId,
          movement_type: 'Issue',
          quantity: '50',
          date: new Date(),
          reference: 'Issue 1'
        }
      ])
      .execute();

    // Try to delete location
    await expect(deleteLocation(locationId)).rejects.toThrow(/cannot delete location.*2 stock movements are associated/i);
  });

  it('should successfully delete location when stock movements exist for other locations', async () => {
    // Create prerequisites - items and multiple locations
    const itemResult = await db.insert(itemsTable)
      .values({
        name: 'Test Item',
        sku: 'TEST-001',
        description: 'A test item',
        unit_of_measure: 'pcs',
        is_manufactured: false,
        reorder_level: '10',
        cost_price: '5.00',
        sale_price: '10.00'
      })
      .returning()
      .execute();

    const locationResults = await db.insert(locationsTable)
      .values([
        {
          name: 'Warehouse A',
          description: 'First warehouse'
        },
        {
          name: 'Warehouse B',
          description: 'Second warehouse'
        }
      ])
      .returning()
      .execute();

    const itemId = itemResult[0].id;
    const locationAId = locationResults[0].id;
    const locationBId = locationResults[1].id;

    // Create stock movement for location B only
    await db.insert(stockMovementsTable)
      .values({
        item_id: itemId,
        location_id: locationBId,
        movement_type: 'Receipt',
        quantity: '100',
        date: new Date(),
        reference: 'Receipt for B'
      })
      .execute();

    // Delete location A (which has no stock movements)
    const result = await deleteLocation(locationAId);

    // Verify deletion was successful
    expect(result).toBe(true);

    // Verify location A no longer exists
    const locationsA = await db.select()
      .from(locationsTable)
      .where(eq(locationsTable.id, locationAId))
      .execute();

    expect(locationsA).toHaveLength(0);

    // Verify location B still exists
    const locationsB = await db.select()
      .from(locationsTable)
      .where(eq(locationsTable.id, locationBId))
      .execute();

    expect(locationsB).toHaveLength(1);
    expect(locationsB[0].name).toBe('Warehouse B');
  });
});