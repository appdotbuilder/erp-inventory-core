import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable } from '../db/schema';
import { type CreateCustomerInput } from '../schema';
import { createCustomer } from '../handlers/create_customer';
import { eq } from 'drizzle-orm';

// Test inputs with different scenarios
const testInputFull: CreateCustomerInput = {
  name: 'Test Customer Corp',
  contact_person: 'John Smith',
  email: 'john.smith@testcustomer.com',
  phone: '+1-555-0123'
};

const testInputMinimal: CreateCustomerInput = {
  name: 'Minimal Customer',
  contact_person: null,
  email: null,
  phone: null
};

const testInputPartial: CreateCustomerInput = {
  name: 'Partial Customer',
  contact_person: 'Jane Doe',
  email: null,
  phone: '+1-555-9876'
};

describe('createCustomer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a customer with all fields', async () => {
    const result = await createCustomer(testInputFull);

    // Basic field validation
    expect(result.name).toEqual('Test Customer Corp');
    expect(result.contact_person).toEqual('John Smith');
    expect(result.email).toEqual('john.smith@testcustomer.com');
    expect(result.phone).toEqual('+1-555-0123');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.id).toBeGreaterThan(0);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a customer with minimal fields', async () => {
    const result = await createCustomer(testInputMinimal);

    // Verify required fields
    expect(result.name).toEqual('Minimal Customer');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);

    // Verify nullable fields are null
    expect(result.contact_person).toBeNull();
    expect(result.email).toBeNull();
    expect(result.phone).toBeNull();
  });

  it('should create a customer with partial fields', async () => {
    const result = await createCustomer(testInputPartial);

    expect(result.name).toEqual('Partial Customer');
    expect(result.contact_person).toEqual('Jane Doe');
    expect(result.email).toBeNull();
    expect(result.phone).toEqual('+1-555-9876');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save customer to database', async () => {
    const result = await createCustomer(testInputFull);

    // Query the database to verify persistence
    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, result.id))
      .execute();

    expect(customers).toHaveLength(1);
    const savedCustomer = customers[0];
    
    expect(savedCustomer.name).toEqual('Test Customer Corp');
    expect(savedCustomer.contact_person).toEqual('John Smith');
    expect(savedCustomer.email).toEqual('john.smith@testcustomer.com');
    expect(savedCustomer.phone).toEqual('+1-555-0123');
    expect(savedCustomer.created_at).toBeInstanceOf(Date);
  });

  it('should enforce unique name constraint', async () => {
    // Create first customer
    await createCustomer(testInputFull);

    // Attempt to create second customer with same name
    const duplicateName: CreateCustomerInput = {
      name: 'Test Customer Corp', // Same name as testInputFull
      contact_person: 'Different Person',
      email: 'different@email.com',
      phone: '+1-555-9999'
    };

    await expect(createCustomer(duplicateName))
      .rejects.toThrow(/duplicate key|unique constraint/i);
  });

  it('should handle invalid email format validation at database level', async () => {
    // Note: Email validation is handled by Zod schema before reaching handler
    // This test ensures the handler doesn't break with valid email formats
    const validEmailCustomer: CreateCustomerInput = {
      name: 'Valid Email Customer',
      contact_person: null,
      email: 'valid.email+test@domain.co.uk',
      phone: null
    };

    const result = await createCustomer(validEmailCustomer);
    expect(result.email).toEqual('valid.email+test@domain.co.uk');
  });

  it('should create multiple customers successfully', async () => {
    const customer1 = await createCustomer({
      name: 'Customer One',
      contact_person: null,
      email: null,
      phone: null
    });

    const customer2 = await createCustomer({
      name: 'Customer Two',
      contact_person: 'Contact Two',
      email: 'two@example.com',
      phone: null
    });

    // Verify both customers exist in database
    const allCustomers = await db.select()
      .from(customersTable)
      .execute();

    expect(allCustomers).toHaveLength(2);
    
    const customerIds = allCustomers.map(c => c.id);
    expect(customerIds).toContain(customer1.id);
    expect(customerIds).toContain(customer2.id);
    
    const customerNames = allCustomers.map(c => c.name);
    expect(customerNames).toContain('Customer One');
    expect(customerNames).toContain('Customer Two');
  });

  it('should handle long text fields appropriately', async () => {
    const longTextCustomer: CreateCustomerInput = {
      name: 'A'.repeat(100), // Long but reasonable name
      contact_person: 'B'.repeat(50),
      email: 'very.long.email.address@very-long-domain-name-example.com',
      phone: '+1-555-0123-ext-9999-department-sales'
    };

    const result = await createCustomer(longTextCustomer);
    
    expect(result.name).toEqual('A'.repeat(100));
    expect(result.contact_person).toEqual('B'.repeat(50));
    expect(result.email).toEqual('very.long.email.address@very-long-domain-name-example.com');
    expect(result.phone).toEqual('+1-555-0123-ext-9999-department-sales');
  });
});