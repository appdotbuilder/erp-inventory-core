import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable } from '../db/schema';
import { type UpdateCustomerInput, type CreateCustomerInput } from '../schema';
import { updateCustomer } from '../handlers/update_customer';
import { eq } from 'drizzle-orm';

// Test data
const initialCustomerData: CreateCustomerInput = {
  name: 'Test Customer',
  contact_person: 'John Doe',
  email: 'john@example.com',
  phone: '123-456-7890'
};

const updateCustomerData: UpdateCustomerInput = {
  id: 1, // Will be set dynamically
  name: 'Updated Customer',
  contact_person: 'Jane Smith',
  email: 'jane@example.com',
  phone: '987-654-3210'
};

describe('updateCustomer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update a customer with all fields', async () => {
    // Create initial customer
    const createdCustomer = await db.insert(customersTable)
      .values(initialCustomerData)
      .returning()
      .execute();

    const customerId = createdCustomer[0].id;

    // Update customer
    const updateInput = { ...updateCustomerData, id: customerId };
    const result = await updateCustomer(updateInput);

    // Verify updated fields
    expect(result.id).toEqual(customerId);
    expect(result.name).toEqual('Updated Customer');
    expect(result.contact_person).toEqual('Jane Smith');
    expect(result.email).toEqual('jane@example.com');
    expect(result.phone).toEqual('987-654-3210');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update a customer with partial fields', async () => {
    // Create initial customer
    const createdCustomer = await db.insert(customersTable)
      .values(initialCustomerData)
      .returning()
      .execute();

    const customerId = createdCustomer[0].id;

    // Update only name and email
    const partialUpdate: UpdateCustomerInput = {
      id: customerId,
      name: 'Partially Updated Customer',
      email: 'partial@example.com'
    };

    const result = await updateCustomer(partialUpdate);

    // Verify updated fields
    expect(result.id).toEqual(customerId);
    expect(result.name).toEqual('Partially Updated Customer');
    expect(result.email).toEqual('partial@example.com');
    // These should remain unchanged
    expect(result.contact_person).toEqual('John Doe');
    expect(result.phone).toEqual('123-456-7890');
  });

  it('should update customer with nullable fields set to null', async () => {
    // Create initial customer
    const createdCustomer = await db.insert(customersTable)
      .values(initialCustomerData)
      .returning()
      .execute();

    const customerId = createdCustomer[0].id;

    // Update with null values
    const updateInput: UpdateCustomerInput = {
      id: customerId,
      name: 'Customer with Nulls',
      contact_person: null,
      email: null,
      phone: null
    };

    const result = await updateCustomer(updateInput);

    // Verify fields are set to null
    expect(result.id).toEqual(customerId);
    expect(result.name).toEqual('Customer with Nulls');
    expect(result.contact_person).toBeNull();
    expect(result.email).toBeNull();
    expect(result.phone).toBeNull();
  });

  it('should save updated customer to database', async () => {
    // Create initial customer
    const createdCustomer = await db.insert(customersTable)
      .values(initialCustomerData)
      .returning()
      .execute();

    const customerId = createdCustomer[0].id;

    // Update customer
    const updateInput = { ...updateCustomerData, id: customerId };
    await updateCustomer(updateInput);

    // Verify in database
    const savedCustomers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, customerId))
      .execute();

    expect(savedCustomers).toHaveLength(1);
    const savedCustomer = savedCustomers[0];
    expect(savedCustomer.name).toEqual('Updated Customer');
    expect(savedCustomer.contact_person).toEqual('Jane Smith');
    expect(savedCustomer.email).toEqual('jane@example.com');
    expect(savedCustomer.phone).toEqual('987-654-3210');
  });

  it('should throw error when customer does not exist', async () => {
    const nonExistentUpdate: UpdateCustomerInput = {
      id: 999,
      name: 'Non-existent Customer'
    };

    await expect(updateCustomer(nonExistentUpdate)).rejects.toThrow(/Customer with id 999 not found/i);
  });

  it('should handle unique name constraint violation', async () => {
    // Create two customers
    const customer1 = await db.insert(customersTable)
      .values({ ...initialCustomerData, name: 'Customer 1' })
      .returning()
      .execute();

    await db.insert(customersTable)
      .values({ ...initialCustomerData, name: 'Customer 2' })
      .returning()
      .execute();

    // Try to update customer1 with customer2's name
    const duplicateUpdate: UpdateCustomerInput = {
      id: customer1[0].id,
      name: 'Customer 2' // This should cause unique constraint violation
    };

    await expect(updateCustomer(duplicateUpdate)).rejects.toThrow();
  });

  it('should update only the specified customer', async () => {
    // Create two customers
    const customer1 = await db.insert(customersTable)
      .values({ ...initialCustomerData, name: 'Customer 1' })
      .returning()
      .execute();

    const customer2 = await db.insert(customersTable)
      .values({ ...initialCustomerData, name: 'Customer 2' })
      .returning()
      .execute();

    // Update only customer1
    const updateInput: UpdateCustomerInput = {
      id: customer1[0].id,
      name: 'Updated Customer 1'
    };

    await updateCustomer(updateInput);

    // Verify customer1 is updated
    const updatedCustomer1 = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, customer1[0].id))
      .execute();

    expect(updatedCustomer1[0].name).toEqual('Updated Customer 1');

    // Verify customer2 is unchanged
    const unchangedCustomer2 = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, customer2[0].id))
      .execute();

    expect(unchangedCustomer2[0].name).toEqual('Customer 2');
  });
});