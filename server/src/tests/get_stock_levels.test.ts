import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { itemsTable, locationsTable, stockMovementsTable } from '../db/schema';
import { getStockLevels } from '../handlers/get_stock_levels';

describe('getStockLevels', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should calculate current stock levels correctly', async () => {
    // Create test items
    const items = await db.insert(itemsTable).values([
      {
        name: 'Widget A',
        sku: 'WID-001',
        description: 'Test widget',
        unit_of_measure: 'pcs',
        reorder_level: '10.00',
        cost_price: '5.00',
        sale_price: '10.00'
      },
      {
        name: 'Widget B',
        sku: 'WID-002',
        description: 'Another widget',
        unit_of_measure: 'kg',
        reorder_level: '20.00',
        cost_price: '15.00',
        sale_price: '25.00'
      }
    ]).returning().execute();

    // Create test locations
    const locations = await db.insert(locationsTable).values([
      { name: 'Warehouse A', description: 'Main warehouse' },
      { name: 'Warehouse B', description: 'Secondary warehouse' }
    ]).returning().execute();

    // Create stock movements
    await db.insert(stockMovementsTable).values([
      // Widget A in Warehouse A: 100 - 20 + 5 = 85
      {
        item_id: items[0].id,
        location_id: locations[0].id,
        movement_type: 'Receipt',
        quantity: '100.0000',
        date: new Date('2024-01-01'),
        reference: 'PO-001'
      },
      {
        item_id: items[0].id,
        location_id: locations[0].id,
        movement_type: 'Issue',
        quantity: '-20.0000',
        date: new Date('2024-01-02'),
        reference: 'SO-001'
      },
      {
        item_id: items[0].id,
        location_id: locations[0].id,
        movement_type: 'Adjustment',
        quantity: '5.0000',
        date: new Date('2024-01-03'),
        reference: 'ADJ-001'
      },
      // Widget A in Warehouse B: 50
      {
        item_id: items[0].id,
        location_id: locations[1].id,
        movement_type: 'Receipt',
        quantity: '50.0000',
        date: new Date('2024-01-01'),
        reference: 'PO-002'
      },
      // Widget B in Warehouse A: 30 - 5 = 25
      {
        item_id: items[1].id,
        location_id: locations[0].id,
        movement_type: 'Receipt',
        quantity: '30.0000',
        date: new Date('2024-01-01'),
        reference: 'PO-003'
      },
      {
        item_id: items[1].id,
        location_id: locations[0].id,
        movement_type: 'Issue',
        quantity: '-5.0000',
        date: new Date('2024-01-02'),
        reference: 'SO-002'
      }
    ]).execute();

    const result = await getStockLevels();

    // Should return 3 stock level records (2 items x 2 locations - 1 empty combination)
    expect(result).toHaveLength(3);

    // Verify Widget A in Warehouse A
    const widgetAWarehouseA = result.find(r => 
      r.item_id === items[0].id && r.location_id === locations[0].id
    );
    expect(widgetAWarehouseA).toBeDefined();
    expect(widgetAWarehouseA!.item_name).toEqual('Widget A');
    expect(widgetAWarehouseA!.item_sku).toEqual('WID-001');
    expect(widgetAWarehouseA!.location_name).toEqual('Warehouse A');
    expect(widgetAWarehouseA!.current_quantity).toEqual(85);
    expect(widgetAWarehouseA!.reorder_level).toEqual(10);
    expect(widgetAWarehouseA!.unit_of_measure).toEqual('pcs');

    // Verify Widget A in Warehouse B
    const widgetAWarehouseB = result.find(r => 
      r.item_id === items[0].id && r.location_id === locations[1].id
    );
    expect(widgetAWarehouseB).toBeDefined();
    expect(widgetAWarehouseB!.current_quantity).toEqual(50);
    expect(widgetAWarehouseB!.location_name).toEqual('Warehouse B');

    // Verify Widget B in Warehouse A
    const widgetBWarehouseA = result.find(r => 
      r.item_id === items[1].id && r.location_id === locations[0].id
    );
    expect(widgetBWarehouseA).toBeDefined();
    expect(widgetBWarehouseA!.item_name).toEqual('Widget B');
    expect(widgetBWarehouseA!.current_quantity).toEqual(25);
    expect(widgetBWarehouseA!.reorder_level).toEqual(20);
    expect(widgetBWarehouseA!.unit_of_measure).toEqual('kg');
  });

  it('should filter by item_id when provided', async () => {
    // Create test items
    const items = await db.insert(itemsTable).values([
      {
        name: 'Widget A',
        sku: 'WID-001',
        description: 'Test widget',
        unit_of_measure: 'pcs',
        reorder_level: '10.00',
        cost_price: '5.00',
        sale_price: '10.00'
      },
      {
        name: 'Widget B',
        sku: 'WID-002',
        description: 'Another widget',
        unit_of_measure: 'kg',
        reorder_level: '20.00',
        cost_price: '15.00',
        sale_price: '25.00'
      }
    ]).returning().execute();

    // Create test location
    const locations = await db.insert(locationsTable).values([
      { name: 'Warehouse A', description: 'Main warehouse' }
    ]).returning().execute();

    // Create stock movements for both items
    await db.insert(stockMovementsTable).values([
      {
        item_id: items[0].id,
        location_id: locations[0].id,
        movement_type: 'Receipt',
        quantity: '100.0000',
        date: new Date('2024-01-01'),
        reference: 'PO-001'
      },
      {
        item_id: items[1].id,
        location_id: locations[0].id,
        movement_type: 'Receipt',
        quantity: '50.0000',
        date: new Date('2024-01-01'),
        reference: 'PO-002'
      }
    ]).execute();

    const result = await getStockLevels(items[0].id);

    // Should only return stock levels for Widget A
    expect(result).toHaveLength(1);
    expect(result[0].item_id).toEqual(items[0].id);
    expect(result[0].item_name).toEqual('Widget A');
    expect(result[0].current_quantity).toEqual(100);
  });

  it('should filter by location_id when provided', async () => {
    // Create test item
    const items = await db.insert(itemsTable).values([
      {
        name: 'Widget A',
        sku: 'WID-001',
        description: 'Test widget',
        unit_of_measure: 'pcs',
        reorder_level: '10.00',
        cost_price: '5.00',
        sale_price: '10.00'
      }
    ]).returning().execute();

    // Create test locations
    const locations = await db.insert(locationsTable).values([
      { name: 'Warehouse A', description: 'Main warehouse' },
      { name: 'Warehouse B', description: 'Secondary warehouse' }
    ]).returning().execute();

    // Create stock movements in both locations
    await db.insert(stockMovementsTable).values([
      {
        item_id: items[0].id,
        location_id: locations[0].id,
        movement_type: 'Receipt',
        quantity: '100.0000',
        date: new Date('2024-01-01'),
        reference: 'PO-001'
      },
      {
        item_id: items[0].id,
        location_id: locations[1].id,
        movement_type: 'Receipt',
        quantity: '75.0000',
        date: new Date('2024-01-01'),
        reference: 'PO-002'
      }
    ]).execute();

    const result = await getStockLevels(undefined, locations[1].id);

    // Should only return stock levels for Warehouse B
    expect(result).toHaveLength(1);
    expect(result[0].location_id).toEqual(locations[1].id);
    expect(result[0].location_name).toEqual('Warehouse B');
    expect(result[0].current_quantity).toEqual(75);
  });

  it('should filter by both item_id and location_id when provided', async () => {
    // Create test items
    const items = await db.insert(itemsTable).values([
      {
        name: 'Widget A',
        sku: 'WID-001',
        description: 'Test widget',
        unit_of_measure: 'pcs',
        reorder_level: '10.00',
        cost_price: '5.00',
        sale_price: '10.00'
      },
      {
        name: 'Widget B',
        sku: 'WID-002',
        description: 'Another widget',
        unit_of_measure: 'kg',
        reorder_level: '20.00',
        cost_price: '15.00',
        sale_price: '25.00'
      }
    ]).returning().execute();

    // Create test locations
    const locations = await db.insert(locationsTable).values([
      { name: 'Warehouse A', description: 'Main warehouse' },
      { name: 'Warehouse B', description: 'Secondary warehouse' }
    ]).returning().execute();

    // Create stock movements for multiple combinations
    await db.insert(stockMovementsTable).values([
      {
        item_id: items[0].id,
        location_id: locations[0].id,
        movement_type: 'Receipt',
        quantity: '100.0000',
        date: new Date('2024-01-01'),
        reference: 'PO-001'
      },
      {
        item_id: items[0].id,
        location_id: locations[1].id,
        movement_type: 'Receipt',
        quantity: '75.0000',
        date: new Date('2024-01-01'),
        reference: 'PO-002'
      },
      {
        item_id: items[1].id,
        location_id: locations[0].id,
        movement_type: 'Receipt',
        quantity: '50.0000',
        date: new Date('2024-01-01'),
        reference: 'PO-003'
      }
    ]).execute();

    const result = await getStockLevels(items[0].id, locations[1].id);

    // Should only return stock level for Widget A in Warehouse B
    expect(result).toHaveLength(1);
    expect(result[0].item_id).toEqual(items[0].id);
    expect(result[0].location_id).toEqual(locations[1].id);
    expect(result[0].item_name).toEqual('Widget A');
    expect(result[0].location_name).toEqual('Warehouse B');
    expect(result[0].current_quantity).toEqual(75);
  });

  it('should return empty array when no stock movements exist', async () => {
    // Create test item and location but no movements
    await db.insert(itemsTable).values([
      {
        name: 'Widget A',
        sku: 'WID-001',
        description: 'Test widget',
        unit_of_measure: 'pcs',
        reorder_level: '10.00',
        cost_price: '5.00',
        sale_price: '10.00'
      }
    ]).execute();

    await db.insert(locationsTable).values([
      { name: 'Warehouse A', description: 'Main warehouse' }
    ]).execute();

    const result = await getStockLevels();

    expect(result).toHaveLength(0);
  });

  it('should handle decimal quantities correctly', async () => {
    // Create test item
    const items = await db.insert(itemsTable).values([
      {
        name: 'Widget A',
        sku: 'WID-001',
        description: 'Test widget',
        unit_of_measure: 'kg',
        reorder_level: '5.50',
        cost_price: '5.00',
        sale_price: '10.00'
      }
    ]).returning().execute();

    // Create test location
    const locations = await db.insert(locationsTable).values([
      { name: 'Warehouse A', description: 'Main warehouse' }
    ]).returning().execute();

    // Create stock movements with decimal quantities
    await db.insert(stockMovementsTable).values([
      {
        item_id: items[0].id,
        location_id: locations[0].id,
        movement_type: 'Receipt',
        quantity: '15.75',
        date: new Date('2024-01-01'),
        reference: 'PO-001'
      },
      {
        item_id: items[0].id,
        location_id: locations[0].id,
        movement_type: 'Issue',
        quantity: '-3.25',
        date: new Date('2024-01-02'),
        reference: 'SO-001'
      }
    ]).execute();

    const result = await getStockLevels();

    expect(result).toHaveLength(1);
    expect(result[0].current_quantity).toEqual(12.5);
    expect(result[0].reorder_level).toEqual(5.5);
    expect(typeof result[0].current_quantity).toBe('number');
    expect(typeof result[0].reorder_level).toBe('number');
  });
});