import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { itemsTable, locationsTable, billOfMaterialsTable, stockMovementsTable } from '../db/schema';
import { type ProduceItemInput } from '../schema';
import { produceItem } from '../handlers/produce_item';
import { eq, sql } from 'drizzle-orm';

describe('produceItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test data setup helper
  const setupTestData = async () => {
    // Create location
    const locationResult = await db.insert(locationsTable)
      .values({
        name: 'Main Warehouse',
        description: 'Primary storage location'
      })
      .returning()
      .execute();
    const locationId = locationResult[0].id;

    // Create manufactured item (final product)
    const manufacturedItemResult = await db.insert(itemsTable)
      .values({
        name: 'Assembled Widget',
        sku: 'WIDGET-001',
        description: 'A complex manufactured widget',
        unit_of_measure: 'piece',
        is_manufactured: true,
        reorder_level: '10',
        cost_price: '15.00',
        sale_price: '25.00'
      })
      .returning()
      .execute();
    const manufacturedItemId = manufacturedItemResult[0].id;

    // Create component items
    const component1Result = await db.insert(itemsTable)
      .values({
        name: 'Component A',
        sku: 'COMP-A-001',
        description: 'First component',
        unit_of_measure: 'piece',
        is_manufactured: false,
        reorder_level: '50',
        cost_price: '2.00',
        sale_price: '3.00'
      })
      .returning()
      .execute();
    const component1Id = component1Result[0].id;

    const component2Result = await db.insert(itemsTable)
      .values({
        name: 'Component B',
        sku: 'COMP-B-001',
        description: 'Second component',
        unit_of_measure: 'piece',
        is_manufactured: false,
        reorder_level: '30',
        cost_price: '5.00',
        sale_price: '8.00'
      })
      .returning()
      .execute();
    const component2Id = component2Result[0].id;

    // Create BOM entries
    await db.insert(billOfMaterialsTable)
      .values([
        {
          parent_item_id: manufacturedItemId,
          component_item_id: component1Id,
          quantity: '2.0' // 2 units of Component A per widget
        },
        {
          parent_item_id: manufacturedItemId,
          component_item_id: component2Id,
          quantity: '1.5' // 1.5 units of Component B per widget
        }
      ])
      .execute();

    return {
      locationId,
      manufacturedItemId,
      component1Id,
      component2Id
    };
  };

  // Helper to add stock for components
  const addComponentStock = async (itemId: number, locationId: number, quantity: number) => {
    await db.insert(stockMovementsTable)
      .values({
        item_id: itemId,
        location_id: locationId,
        movement_type: 'Receipt',
        quantity: quantity.toString(),
        date: new Date(),
        reference: 'Initial stock for testing'
      })
      .execute();
  };

  const testInput: ProduceItemInput = {
    item_id: 0, // Will be set in tests
    location_id: 0, // Will be set in tests
    quantity: 5, // Produce 5 widgets
    reference: 'Production batch #001'
  };

  it('should produce item and consume components successfully', async () => {
    const { locationId, manufacturedItemId, component1Id, component2Id } = await setupTestData();

    // Add sufficient stock for components
    await addComponentStock(component1Id, locationId, 20); // Need 10 (5 * 2), have 20
    await addComponentStock(component2Id, locationId, 15); // Need 7.5 (5 * 1.5), have 15

    const input = {
      ...testInput,
      item_id: manufacturedItemId,
      location_id: locationId
    };

    const result = await produceItem(input);

    // Should return 3 movements: 1 production + 2 consumption
    expect(result).toHaveLength(3);

    // Find movements by type
    const productionMovement = result.find(m => m.movement_type === 'Production');
    const consumptionMovements = result.filter(m => m.movement_type === 'Consumption');

    // Verify production movement
    expect(productionMovement).toBeDefined();
    expect(productionMovement!.item_id).toBe(manufacturedItemId);
    expect(productionMovement!.location_id).toBe(locationId);
    expect(productionMovement!.quantity).toBe(5);
    expect(productionMovement!.reference).toBe('Production batch #001');

    // Verify consumption movements
    expect(consumptionMovements).toHaveLength(2);
    
    const comp1Consumption = consumptionMovements.find(m => m.item_id === component1Id);
    const comp2Consumption = consumptionMovements.find(m => m.item_id === component2Id);

    expect(comp1Consumption).toBeDefined();
    expect(comp1Consumption!.quantity).toBe(-10); // 5 * 2 = 10, negative
    expect(comp1Consumption!.reference).toContain('Production of Assembled Widget');

    expect(comp2Consumption).toBeDefined();
    expect(comp2Consumption!.quantity).toBe(-7.5); // 5 * 1.5 = 7.5, negative
    expect(comp2Consumption!.reference).toContain('Production of Assembled Widget');

    // Verify all movements are saved to database
    const allMovements = await db.select()
      .from(stockMovementsTable)
      .where(eq(stockMovementsTable.location_id, locationId))
      .execute();

    expect(allMovements).toHaveLength(5); // 2 initial stock + 3 production movements
  });

  it('should calculate correct current stock levels', async () => {
    const { locationId, manufacturedItemId, component1Id, component2Id } = await setupTestData();

    // Add initial stock
    await addComponentStock(component1Id, locationId, 100);
    await addComponentStock(component2Id, locationId, 50);

    // First production run
    await produceItem({
      item_id: manufacturedItemId,
      location_id: locationId,
      quantity: 10,
      reference: 'First batch'
    });

    // Check stock levels after first production
    const stockLevels = await db.select({
      item_id: stockMovementsTable.item_id,
      total_quantity: sql<string>`SUM(${stockMovementsTable.quantity})`.as('total_quantity')
    })
      .from(stockMovementsTable)
      .where(eq(stockMovementsTable.location_id, locationId))
      .groupBy(stockMovementsTable.item_id)
      .execute();

    // Find stock levels for each item
    const comp1Stock = stockLevels.find(s => s.item_id === component1Id);
    const comp2Stock = stockLevels.find(s => s.item_id === component2Id);
    const manufacturedStock = stockLevels.find(s => s.item_id === manufacturedItemId);

    expect(parseFloat(comp1Stock!.total_quantity)).toBe(80); // 100 - 20
    expect(parseFloat(comp2Stock!.total_quantity)).toBe(35); // 50 - 15
    expect(parseFloat(manufacturedStock!.total_quantity)).toBe(10); // 0 + 10

    // Second production run - should work with remaining stock
    const result = await produceItem({
      item_id: manufacturedItemId,
      location_id: locationId,
      quantity: 3,
      reference: 'Second batch'
    });

    expect(result).toHaveLength(3);
  });

  it('should throw error for non-existent item', async () => {
    const { locationId } = await setupTestData();

    const input = {
      ...testInput,
      item_id: 99999,
      location_id: locationId
    };

    expect(produceItem(input)).rejects.toThrow(/Item with ID 99999 not found/i);
  });

  it('should throw error for non-manufactured item', async () => {
    const { locationId } = await setupTestData();

    // Create a non-manufactured item
    const nonManufacturedResult = await db.insert(itemsTable)
      .values({
        name: 'Simple Item',
        sku: 'SIMPLE-001',
        description: 'Not manufactured',
        unit_of_measure: 'piece',
        is_manufactured: false,
        reorder_level: '10',
        cost_price: '5.00',
        sale_price: '10.00'
      })
      .returning()
      .execute();

    const input = {
      ...testInput,
      item_id: nonManufacturedResult[0].id,
      location_id: locationId
    };

    expect(produceItem(input)).rejects.toThrow(/is not marked as manufactured/i);
  });

  it('should throw error when no BOM exists', async () => {
    const { locationId } = await setupTestData();

    // Create manufactured item without BOM
    const itemWithoutBOMResult = await db.insert(itemsTable)
      .values({
        name: 'Widget Without BOM',
        sku: 'NO-BOM-001',
        description: 'Manufactured but no BOM',
        unit_of_measure: 'piece',
        is_manufactured: true,
        reorder_level: '5',
        cost_price: '10.00',
        sale_price: '20.00'
      })
      .returning()
      .execute();

    const input = {
      ...testInput,
      item_id: itemWithoutBOMResult[0].id,
      location_id: locationId
    };

    expect(produceItem(input)).rejects.toThrow(/No Bill of Materials found/i);
  });

  it('should throw error for insufficient component stock', async () => {
    const { locationId, manufacturedItemId, component1Id } = await setupTestData();

    // Add insufficient stock (need 10 Component A, only add 5)
    await addComponentStock(component1Id, locationId, 5);

    const input = {
      ...testInput,
      item_id: manufacturedItemId,
      location_id: locationId
    };

    expect(produceItem(input)).rejects.toThrow(/Insufficient stock for components/i);
  });

  it('should handle production with no reference', async () => {
    const { locationId, manufacturedItemId, component1Id, component2Id } = await setupTestData();

    // Add sufficient stock
    await addComponentStock(component1Id, locationId, 20);
    await addComponentStock(component2Id, locationId, 15);

    const input = {
      item_id: manufacturedItemId,
      location_id: locationId,
      quantity: 2,
      reference: null
    };

    const result = await produceItem(input);

    expect(result).toHaveLength(3);

    const productionMovement = result.find(m => m.movement_type === 'Production');
    expect(productionMovement!.reference).toBe(null);

    const consumptionMovement = result.find(m => m.movement_type === 'Consumption');
    expect(consumptionMovement!.reference).toContain('Production of Assembled Widget');
    expect(consumptionMovement!.reference).not.toContain(' - '); // No additional reference
  });

  it('should handle fractional quantities correctly', async () => {
    const { locationId, manufacturedItemId, component1Id, component2Id } = await setupTestData();

    // Add stock
    await addComponentStock(component1Id, locationId, 10);
    await addComponentStock(component2Id, locationId, 10);

    const input = {
      item_id: manufacturedItemId,
      location_id: locationId,
      quantity: 2.5, // Fractional production quantity
      reference: 'Fractional batch'
    };

    const result = await produceItem(input);

    expect(result).toHaveLength(3);

    const consumptionMovements = result.filter(m => m.movement_type === 'Consumption');
    
    const comp1Consumption = consumptionMovements.find(m => m.item_id === component1Id);
    const comp2Consumption = consumptionMovements.find(m => m.item_id === component2Id);

    expect(comp1Consumption!.quantity).toBe(-5); // 2.5 * 2 = 5
    expect(comp2Consumption!.quantity).toBe(-3.75); // 2.5 * 1.5 = 3.75
  });

  it('should verify all numeric conversions work correctly', async () => {
    const { locationId, manufacturedItemId, component1Id, component2Id } = await setupTestData();

    await addComponentStock(component1Id, locationId, 50);
    await addComponentStock(component2Id, locationId, 50);

    const result = await produceItem({
      item_id: manufacturedItemId,
      location_id: locationId,
      quantity: 1,
      reference: 'Numeric test'
    });

    // Verify all returned quantities are numbers, not strings
    result.forEach(movement => {
      expect(typeof movement.quantity).toBe('number');
      expect(typeof movement.id).toBe('number');
      expect(typeof movement.item_id).toBe('number');
      expect(typeof movement.location_id).toBe('number');
      expect(movement.created_at).toBeInstanceOf(Date);
      expect(movement.date).toBeInstanceOf(Date);
    });
  });
});