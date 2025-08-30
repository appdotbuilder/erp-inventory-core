import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, itemsTable, locationsTable, stockMovementsTable } from '../db/schema';
import { deleteCustomer } from '../handlers/delete_customer';
import { eq } from 'drizzle-orm';

describe('deleteCustomer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing customer', async () => {
    // Create a test customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        contact_person: 'John Doe',
        email: 'john@testcustomer.com',
        phone: '+1234567890'
      })
      .returning()
      .execute();

    const customerId = customerResult[0].id;

    // Delete the customer
    const result = await deleteCustomer(customerId);

    expect(result).toBe(true);

    // Verify customer is deleted from database
    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, customerId))
      .execute();

    expect(customers).toHaveLength(0);
  });

  it('should throw error when customer does not exist', async () => {
    const nonExistentId = 99999;

    expect(deleteCustomer(nonExistentId)).rejects.toThrow(/customer not found/i);
  });

  it('should prevent deletion when customer is referenced in stock movements', async () => {
    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Referenced Customer',
        contact_person: 'Jane Smith',
        email: 'jane@referencedcustomer.com',
        phone: '+1987654321'
      })
      .returning()
      .execute();

    const customerId = customerResult[0].id;
    const customerName = customerResult[0].name;

    // Create prerequisite data for stock movement
    const itemResult = await db.insert(itemsTable)
      .values({
        name: 'Test Item',
        sku: 'TEST-001',
        description: 'A test item',
        unit_of_measure: 'pcs',
        is_manufactured: false,
        reorder_level: '10',
        cost_price: '15.50',
        sale_price: '25.00'
      })
      .returning()
      .execute();

    const locationResult = await db.insert(locationsTable)
      .values({
        name: 'Test Location',
        description: 'A test location'
      })
      .returning()
      .execute();

    // Create stock movement that references the customer
    await db.insert(stockMovementsTable)
      .values({
        item_id: itemResult[0].id,
        location_id: locationResult[0].id,
        movement_type: 'Issue',
        quantity: '5.0000',
        date: new Date(),
        reference: customerName
      })
      .execute();

    // Try to delete the customer - should fail
    expect(deleteCustomer(customerId)).rejects.toThrow(/cannot delete customer.*referenced in stock movements/i);

    // Verify customer still exists in database
    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, customerId))
      .execute();

    expect(customers).toHaveLength(1);
    expect(customers[0].name).toBe('Referenced Customer');
  });

  it('should successfully delete customer when not referenced in stock movements', async () => {
    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Safe Customer',
        contact_person: 'Bob Johnson',
        email: 'bob@safecustomer.com',
        phone: '+1122334455'
      })
      .returning()
      .execute();

    const customerId = customerResult[0].id;

    // Create prerequisite data for stock movement
    const itemResult = await db.insert(itemsTable)
      .values({
        name: 'Test Item',
        sku: 'TEST-002',
        description: 'A test item',
        unit_of_measure: 'pcs',
        is_manufactured: false,
        reorder_level: '10',
        cost_price: '15.50',
        sale_price: '25.00'
      })
      .returning()
      .execute();

    const locationResult = await db.insert(locationsTable)
      .values({
        name: 'Test Location',
        description: 'A test location'
      })
      .returning()
      .execute();

    // Create stock movement that references a different customer
    await db.insert(stockMovementsTable)
      .values({
        item_id: itemResult[0].id,
        location_id: locationResult[0].id,
        movement_type: 'Issue',
        quantity: '3.0000',
        date: new Date(),
        reference: 'Different Customer'
      })
      .execute();

    // Delete the customer - should succeed
    const result = await deleteCustomer(customerId);

    expect(result).toBe(true);

    // Verify customer is deleted from database
    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, customerId))
      .execute();

    expect(customers).toHaveLength(0);

    // Verify stock movement is still there
    const movements = await db.select()
      .from(stockMovementsTable)
      .execute();

    expect(movements).toHaveLength(1);
    expect(movements[0].reference).toBe('Different Customer');
  });

  it('should handle customer with null reference fields', async () => {
    // Create customer with minimal data
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Minimal Customer',
        contact_person: null,
        email: null,
        phone: null
      })
      .returning()
      .execute();

    const customerId = customerResult[0].id;

    // Delete the customer
    const result = await deleteCustomer(customerId);

    expect(result).toBe(true);

    // Verify customer is deleted
    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, customerId))
      .execute();

    expect(customers).toHaveLength(0);
  });
});