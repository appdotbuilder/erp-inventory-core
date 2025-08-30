import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { itemsTable, locationsTable, stockMovementsTable, customersTable } from '../db/schema';
import { type IssueStockInput } from '../schema';
import { issueStock } from '../handlers/issue_stock';
import { eq, and, sum } from 'drizzle-orm';

describe('issueStock', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test data
  const createTestData = async () => {
    // Create test item
    const itemResult = await db.insert(itemsTable)
      .values({
        name: 'Test Item',
        sku: 'TEST-001',
        description: 'Test item description',
        unit_of_measure: 'pcs',
        is_manufactured: false,
        reorder_level: '10',
        cost_price: '100.00',
        sale_price: '150.00'
      })
      .returning()
      .execute();

    // Create test location
    const locationResult = await db.insert(locationsTable)
      .values({
        name: 'Test Warehouse',
        description: 'Main warehouse'
      })
      .returning()
      .execute();

    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        contact_person: 'John Doe',
        email: 'john@example.com',
        phone: '555-0123'
      })
      .returning()
      .execute();

    // Add initial stock (Receipt)
    await db.insert(stockMovementsTable)
      .values({
        item_id: itemResult[0].id,
        location_id: locationResult[0].id,
        movement_type: 'Receipt',
        quantity: '100', // Initial stock of 100 units
        date: new Date(),
        reference: 'Initial stock'
      })
      .execute();

    return {
      item: itemResult[0],
      location: locationResult[0],
      customer: customerResult[0]
    };
  };

  const testInput: IssueStockInput = {
    item_id: 1,
    location_id: 1,
    quantity: 25,
    reference: 'Test issue'
  };

  it('should issue stock successfully', async () => {
    const { item, location } = await createTestData();
    
    const input: IssueStockInput = {
      item_id: item.id,
      location_id: location.id,
      quantity: 25,
      reference: 'Test stock issue'
    };

    const result = await issueStock(input);

    // Verify the returned stock movement
    expect(result.item_id).toEqual(item.id);
    expect(result.location_id).toEqual(location.id);
    expect(result.movement_type).toEqual('Issue');
    expect(result.quantity).toEqual(-25); // Negative for outgoing
    expect(result.reference).toEqual('Test stock issue');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.date).toBeInstanceOf(Date);
  });

  it('should save stock movement to database', async () => {
    const { item, location } = await createTestData();
    
    const input: IssueStockInput = {
      item_id: item.id,
      location_id: location.id,
      quantity: 30,
      reference: 'Database test'
    };

    const result = await issueStock(input);

    // Query the database to verify the record was saved
    const movements = await db.select()
      .from(stockMovementsTable)
      .where(eq(stockMovementsTable.id, result.id))
      .execute();

    expect(movements).toHaveLength(1);
    expect(movements[0].item_id).toEqual(item.id);
    expect(movements[0].location_id).toEqual(location.id);
    expect(movements[0].movement_type).toEqual('Issue');
    expect(parseFloat(movements[0].quantity)).toEqual(-30);
    expect(movements[0].reference).toEqual('Database test');
  });

  it('should update stock levels correctly', async () => {
    const { item, location } = await createTestData();
    
    const input: IssueStockInput = {
      item_id: item.id,
      location_id: location.id,
      quantity: 40,
      reference: 'Stock level test'
    };

    await issueStock(input);

    // Calculate current stock level
    const stockQuery = await db.select({
      total: sum(stockMovementsTable.quantity)
    })
      .from(stockMovementsTable)
      .where(
        and(
          eq(stockMovementsTable.item_id, item.id),
          eq(stockMovementsTable.location_id, location.id)
        )
      )
      .execute();

    const currentStock = parseFloat(stockQuery[0]?.total || '0');
    expect(currentStock).toEqual(60); // 100 initial - 40 issued = 60
  });

  it('should include customer reference when customer_id provided', async () => {
    const { item, location, customer } = await createTestData();
    
    const input: IssueStockInput = {
      item_id: item.id,
      location_id: location.id,
      quantity: 20,
      customer_id: customer.id,
      reference: 'Customer order'
    };

    const result = await issueStock(input);

    expect(result.reference).toEqual(`Customer order - Customer ID: ${customer.id}`);
  });

  it('should handle customer reference without existing reference', async () => {
    const { item, location, customer } = await createTestData();
    
    const input: IssueStockInput = {
      item_id: item.id,
      location_id: location.id,
      quantity: 15,
      customer_id: customer.id,
      reference: null
    };

    const result = await issueStock(input);

    expect(result.reference).toEqual(`Customer ID: ${customer.id}`);
  });

  it('should throw error for non-existent item', async () => {
    const { location } = await createTestData();
    
    const input: IssueStockInput = {
      item_id: 99999,
      location_id: location.id,
      quantity: 10,
      reference: 'Invalid item test'
    };

    await expect(issueStock(input)).rejects.toThrow(/Item with ID 99999 does not exist/i);
  });

  it('should throw error for non-existent location', async () => {
    const { item } = await createTestData();
    
    const input: IssueStockInput = {
      item_id: item.id,
      location_id: 99999,
      quantity: 10,
      reference: 'Invalid location test'
    };

    await expect(issueStock(input)).rejects.toThrow(/Location with ID 99999 does not exist/i);
  });

  it('should throw error for non-existent customer', async () => {
    const { item, location } = await createTestData();
    
    const input: IssueStockInput = {
      item_id: item.id,
      location_id: location.id,
      quantity: 10,
      customer_id: 99999,
      reference: 'Invalid customer test'
    };

    await expect(issueStock(input)).rejects.toThrow(/Customer with ID 99999 does not exist/i);
  });

  it('should throw error for insufficient stock', async () => {
    const { item, location } = await createTestData();
    
    const input: IssueStockInput = {
      item_id: item.id,
      location_id: location.id,
      quantity: 150, // More than available (100)
      reference: 'Insufficient stock test'
    };

    await expect(issueStock(input)).rejects.toThrow(/Insufficient stock. Available: 100, Requested: 150/i);
  });

  it('should allow issuing exact available stock', async () => {
    const { item, location } = await createTestData();
    
    const input: IssueStockInput = {
      item_id: item.id,
      location_id: location.id,
      quantity: 100, // Exact available stock
      reference: 'Full stock issue'
    };

    const result = await issueStock(input);

    expect(result.quantity).toEqual(-100);

    // Verify stock is now zero
    const stockQuery = await db.select({
      total: sum(stockMovementsTable.quantity)
    })
      .from(stockMovementsTable)
      .where(
        and(
          eq(stockMovementsTable.item_id, item.id),
          eq(stockMovementsTable.location_id, location.id)
        )
      )
      .execute();

    const currentStock = parseFloat(stockQuery[0]?.total || '0');
    expect(currentStock).toEqual(0);
  });

  it('should handle location with no stock', async () => {
    // Create item and location without initial stock
    const itemResult = await db.insert(itemsTable)
      .values({
        name: 'No Stock Item',
        sku: 'NOSTOCK-001',
        description: 'Item with no stock',
        unit_of_measure: 'pcs',
        is_manufactured: false,
        reorder_level: '10',
        cost_price: '50.00',
        sale_price: '75.00'
      })
      .returning()
      .execute();

    const locationResult = await db.insert(locationsTable)
      .values({
        name: 'Empty Location',
        description: 'Location with no stock'
      })
      .returning()
      .execute();

    const input: IssueStockInput = {
      item_id: itemResult[0].id,
      location_id: locationResult[0].id,
      quantity: 1,
      reference: 'No stock test'
    };

    await expect(issueStock(input)).rejects.toThrow(/Insufficient stock. Available: 0, Requested: 1/i);
  });

  it('should handle numeric precision correctly', async () => {
    const { item, location } = await createTestData();
    
    const input: IssueStockInput = {
      item_id: item.id,
      location_id: location.id,
      quantity: 25.75, // Decimal quantity
      reference: 'Precision test'
    };

    const result = await issueStock(input);

    expect(result.quantity).toEqual(-25.75);
    expect(typeof result.quantity).toEqual('number');

    // Verify database storage and retrieval
    const movement = await db.select()
      .from(stockMovementsTable)
      .where(eq(stockMovementsTable.id, result.id))
      .execute();

    expect(parseFloat(movement[0].quantity)).toEqual(-25.75);
  });
});