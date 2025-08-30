import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { itemsTable, locationsTable, stockMovementsTable } from '../db/schema';
import { type TransferStockInput } from '../schema';
import { transferStock } from '../handlers/transfer_stock';
import { eq, and, sum } from 'drizzle-orm';

describe('transferStock', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test item
  const createTestItem = async () => {
    const result = await db.insert(itemsTable)
      .values({
        name: 'Test Item',
        sku: 'TEST-001',
        description: 'A test item',
        unit_of_measure: 'each',
        is_manufactured: false,
        reorder_level: '10',
        cost_price: '5.00',
        sale_price: '10.00'
      })
      .returning()
      .execute();
    return result[0];
  };

  // Helper function to create test locations
  const createTestLocations = async () => {
    const warehouse = await db.insert(locationsTable)
      .values({
        name: 'Warehouse A',
        description: 'Main warehouse'
      })
      .returning()
      .execute();

    const store = await db.insert(locationsTable)
      .values({
        name: 'Store B',
        description: 'Retail store'
      })
      .returning()
      .execute();

    return { warehouse: warehouse[0], store: store[0] };
  };

  // Helper function to add initial stock
  const addInitialStock = async (itemId: number, locationId: number, quantity: number) => {
    await db.insert(stockMovementsTable)
      .values({
        item_id: itemId,
        location_id: locationId,
        movement_type: 'Receipt',
        quantity: quantity.toString(),
        date: new Date(),
        reference: 'Initial stock'
      })
      .execute();
  };

  // Helper function to get current stock
  const getCurrentStock = async (itemId: number, locationId: number): Promise<number> => {
    const result = await db.select({
      currentStock: sum(stockMovementsTable.quantity)
    })
      .from(stockMovementsTable)
      .where(
        and(
          eq(stockMovementsTable.item_id, itemId),
          eq(stockMovementsTable.location_id, locationId)
        )
      )
      .execute();
    
    return result[0]?.currentStock ? parseFloat(result[0].currentStock) : 0;
  };

  const testInput: TransferStockInput = {
    item_id: 1,
    from_location_id: 1,
    to_location_id: 2,
    quantity: 50,
    reference: 'Transfer test'
  };

  it('should successfully transfer stock between locations', async () => {
    const item = await createTestItem();
    const { warehouse, store } = await createTestLocations();
    
    // Add initial stock to warehouse
    await addInitialStock(item.id, warehouse.id, 100);

    const transferInput: TransferStockInput = {
      item_id: item.id,
      from_location_id: warehouse.id,
      to_location_id: store.id,
      quantity: 30,
      reference: 'Transfer to store'
    };

    const result = await transferStock(transferInput);

    // Should return two movements
    expect(result).toHaveLength(2);

    // Check transfer out movement
    const transferOut = result.find(m => m.movement_type === 'Transfer Out');
    expect(transferOut).toBeDefined();
    expect(transferOut!.item_id).toBe(item.id);
    expect(transferOut!.location_id).toBe(warehouse.id);
    expect(transferOut!.quantity).toBe(-30);
    expect(transferOut!.reference).toBe('Transfer to store');
    expect(transferOut!.id).toBeDefined();
    expect(transferOut!.created_at).toBeInstanceOf(Date);

    // Check transfer in movement
    const transferIn = result.find(m => m.movement_type === 'Transfer In');
    expect(transferIn).toBeDefined();
    expect(transferIn!.item_id).toBe(item.id);
    expect(transferIn!.location_id).toBe(store.id);
    expect(transferIn!.quantity).toBe(30);
    expect(transferIn!.reference).toBe('Transfer to store');
    expect(transferIn!.id).toBeDefined();
    expect(transferIn!.created_at).toBeInstanceOf(Date);
  });

  it('should update stock levels correctly in database', async () => {
    const item = await createTestItem();
    const { warehouse, store } = await createTestLocations();
    
    // Add initial stock to warehouse
    await addInitialStock(item.id, warehouse.id, 100);

    const transferInput: TransferStockInput = {
      item_id: item.id,
      from_location_id: warehouse.id,
      to_location_id: store.id,
      quantity: 25,
      reference: 'Stock transfer'
    };

    await transferStock(transferInput);

    // Check stock levels after transfer
    const warehouseStock = await getCurrentStock(item.id, warehouse.id);
    const storeStock = await getCurrentStock(item.id, store.id);

    expect(warehouseStock).toBe(75); // 100 - 25
    expect(storeStock).toBe(25); // 0 + 25
  });

  it('should save movements to database with correct data', async () => {
    const item = await createTestItem();
    const { warehouse, store } = await createTestLocations();
    
    await addInitialStock(item.id, warehouse.id, 100);

    const transferInput: TransferStockInput = {
      item_id: item.id,
      from_location_id: warehouse.id,
      to_location_id: store.id,
      quantity: 20,
      reference: 'DB test transfer'
    };

    const result = await transferStock(transferInput);

    // Verify movements exist in database
    const movements = await db.select()
      .from(stockMovementsTable)
      .where(eq(stockMovementsTable.reference, 'DB test transfer'))
      .execute();

    expect(movements).toHaveLength(2);

    // Check transfer out in database
    const dbTransferOut = movements.find(m => m.movement_type === 'Transfer Out');
    expect(dbTransferOut).toBeDefined();
    expect(parseFloat(dbTransferOut!.quantity)).toBe(-20);
    expect(dbTransferOut!.location_id).toBe(warehouse.id);

    // Check transfer in in database
    const dbTransferIn = movements.find(m => m.movement_type === 'Transfer In');
    expect(dbTransferIn).toBeDefined();
    expect(parseFloat(dbTransferIn!.quantity)).toBe(20);
    expect(dbTransferIn!.location_id).toBe(store.id);
  });

  it('should handle null reference correctly', async () => {
    const item = await createTestItem();
    const { warehouse, store } = await createTestLocations();
    
    await addInitialStock(item.id, warehouse.id, 50);

    const transferInput: TransferStockInput = {
      item_id: item.id,
      from_location_id: warehouse.id,
      to_location_id: store.id,
      quantity: 10,
      reference: null
    };

    const result = await transferStock(transferInput);

    expect(result).toHaveLength(2);
    expect(result[0].reference).toBeNull();
    expect(result[1].reference).toBeNull();
  });

  it('should throw error when item does not exist', async () => {
    const { warehouse, store } = await createTestLocations();

    const transferInput: TransferStockInput = {
      item_id: 999, // Non-existent item
      from_location_id: warehouse.id,
      to_location_id: store.id,
      quantity: 10,
      reference: 'Should fail'
    };

    await expect(transferStock(transferInput)).rejects.toThrow(/item with id 999 does not exist/i);
  });

  it('should throw error when source location does not exist', async () => {
    const item = await createTestItem();
    const { store } = await createTestLocations();

    const transferInput: TransferStockInput = {
      item_id: item.id,
      from_location_id: 999, // Non-existent location
      to_location_id: store.id,
      quantity: 10,
      reference: 'Should fail'
    };

    await expect(transferStock(transferInput)).rejects.toThrow(/source location with id 999 does not exist/i);
  });

  it('should throw error when destination location does not exist', async () => {
    const item = await createTestItem();
    const { warehouse } = await createTestLocations();

    const transferInput: TransferStockInput = {
      item_id: item.id,
      from_location_id: warehouse.id,
      to_location_id: 999, // Non-existent location
      quantity: 10,
      reference: 'Should fail'
    };

    await expect(transferStock(transferInput)).rejects.toThrow(/destination location with id 999 does not exist/i);
  });

  it('should throw error when transferring to same location', async () => {
    const item = await createTestItem();
    const { warehouse } = await createTestLocations();

    const transferInput: TransferStockInput = {
      item_id: item.id,
      from_location_id: warehouse.id,
      to_location_id: warehouse.id, // Same location
      quantity: 10,
      reference: 'Should fail'
    };

    await expect(transferStock(transferInput)).rejects.toThrow(/cannot transfer stock to the same location/i);
  });

  it('should throw error when insufficient stock available', async () => {
    const item = await createTestItem();
    const { warehouse, store } = await createTestLocations();
    
    // Add only 10 units to warehouse
    await addInitialStock(item.id, warehouse.id, 10);

    const transferInput: TransferStockInput = {
      item_id: item.id,
      from_location_id: warehouse.id,
      to_location_id: store.id,
      quantity: 15, // More than available
      reference: 'Should fail'
    };

    await expect(transferStock(transferInput)).rejects.toThrow(/insufficient stock.*available: 10.*required: 15/i);
  });

  it('should handle zero stock scenario correctly', async () => {
    const item = await createTestItem();
    const { warehouse, store } = await createTestLocations();
    
    // No initial stock added

    const transferInput: TransferStockInput = {
      item_id: item.id,
      from_location_id: warehouse.id,
      to_location_id: store.id,
      quantity: 5,
      reference: 'Should fail'
    };

    await expect(transferStock(transferInput)).rejects.toThrow(/insufficient stock.*available: 0.*required: 5/i);
  });

  it('should handle complex stock movements correctly', async () => {
    const item = await createTestItem();
    const { warehouse, store } = await createTestLocations();
    
    // Create complex stock movement history
    await addInitialStock(item.id, warehouse.id, 100); // +100
    await db.insert(stockMovementsTable)
      .values({
        item_id: item.id,
        location_id: warehouse.id,
        movement_type: 'Issue',
        quantity: '-30', // -30
        date: new Date(),
        reference: 'Issue'
      })
      .execute();
    await db.insert(stockMovementsTable)
      .values({
        item_id: item.id,
        location_id: warehouse.id,
        movement_type: 'Adjustment',
        quantity: '10', // +10
        date: new Date(),
        reference: 'Adjustment'
      })
      .execute();
    // Total should be: 100 - 30 + 10 = 80

    const transferInput: TransferStockInput = {
      item_id: item.id,
      from_location_id: warehouse.id,
      to_location_id: store.id,
      quantity: 70,
      reference: 'Complex transfer'
    };

    const result = await transferStock(transferInput);
    expect(result).toHaveLength(2);

    // Verify final stock levels
    const warehouseStock = await getCurrentStock(item.id, warehouse.id);
    const storeStock = await getCurrentStock(item.id, store.id);

    expect(warehouseStock).toBe(10); // 80 - 70
    expect(storeStock).toBe(70);
  });
});