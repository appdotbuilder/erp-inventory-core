import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable } from '../db/schema';
import { type CreateCustomerInput } from '../schema';
import { getCustomers } from '../handlers/get_customers';

describe('getCustomers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no customers exist', async () => {
    const result = await getCustomers();

    expect(result).toEqual([]);
  });

  it('should return all customers', async () => {
    // Create test customers
    const customer1: CreateCustomerInput = {
      name: 'Acme Corp',
      contact_person: 'John Doe',
      email: 'john@acme.com',
      phone: '555-1234'
    };

    const customer2: CreateCustomerInput = {
      name: 'Tech Solutions',
      contact_person: 'Jane Smith',
      email: 'jane@techsolutions.com',
      phone: '555-5678'
    };

    const customer3: CreateCustomerInput = {
      name: 'Global Industries',
      contact_person: null,
      email: null,
      phone: null
    };

    await db.insert(customersTable).values([customer1, customer2, customer3]).execute();

    const result = await getCustomers();

    expect(result).toHaveLength(3);
    
    // Check first customer
    const acme = result.find(c => c.name === 'Acme Corp');
    expect(acme).toBeDefined();
    expect(acme!.contact_person).toEqual('John Doe');
    expect(acme!.email).toEqual('john@acme.com');
    expect(acme!.phone).toEqual('555-1234');
    expect(acme!.id).toBeDefined();
    expect(acme!.created_at).toBeInstanceOf(Date);

    // Check second customer
    const techSolutions = result.find(c => c.name === 'Tech Solutions');
    expect(techSolutions).toBeDefined();
    expect(techSolutions!.contact_person).toEqual('Jane Smith');
    expect(techSolutions!.email).toEqual('jane@techsolutions.com');
    expect(techSolutions!.phone).toEqual('555-5678');

    // Check third customer (with nullable fields)
    const globalIndustries = result.find(c => c.name === 'Global Industries');
    expect(globalIndustries).toBeDefined();
    expect(globalIndustries!.contact_person).toBeNull();
    expect(globalIndustries!.email).toBeNull();
    expect(globalIndustries!.phone).toBeNull();
  });

  it('should return customers ordered by creation time', async () => {
    const customer1: CreateCustomerInput = {
      name: 'First Customer',
      contact_person: 'Person A',
      email: 'a@first.com',
      phone: '555-0001'
    };

    const customer2: CreateCustomerInput = {
      name: 'Second Customer',
      contact_person: 'Person B',
      email: 'b@second.com',
      phone: '555-0002'
    };

    // Insert customers sequentially
    await db.insert(customersTable).values(customer1).execute();
    await new Promise(resolve => setTimeout(resolve, 10)); // Small delay to ensure different timestamps
    await db.insert(customersTable).values(customer2).execute();

    const result = await getCustomers();

    expect(result).toHaveLength(2);
    
    // Verify both customers are returned
    expect(result.some(c => c.name === 'First Customer')).toBe(true);
    expect(result.some(c => c.name === 'Second Customer')).toBe(true);
    
    // All customers should have valid timestamps
    result.forEach(customer => {
      expect(customer.created_at).toBeInstanceOf(Date);
      expect(customer.created_at.getTime()).toBeGreaterThan(0);
    });
  });

  it('should handle customers with various email formats', async () => {
    const customers: CreateCustomerInput[] = [
      {
        name: 'Customer With Email',
        contact_person: 'Contact Person',
        email: 'valid@email.com',
        phone: '555-1111'
      },
      {
        name: 'Customer Without Email',
        contact_person: 'Another Person',
        email: null,
        phone: '555-2222'
      }
    ];

    await db.insert(customersTable).values(customers).execute();

    const result = await getCustomers();

    expect(result).toHaveLength(2);
    
    const withEmail = result.find(c => c.name === 'Customer With Email');
    expect(withEmail!.email).toEqual('valid@email.com');
    
    const withoutEmail = result.find(c => c.name === 'Customer Without Email');
    expect(withoutEmail!.email).toBeNull();
  });

  it('should return customers with all required fields populated', async () => {
    const customer: CreateCustomerInput = {
      name: 'Complete Customer',
      contact_person: 'Full Contact',
      email: 'complete@customer.com',
      phone: '555-9999'
    };

    await db.insert(customersTable).values(customer).execute();

    const result = await getCustomers();

    expect(result).toHaveLength(1);
    
    const returnedCustomer = result[0];
    
    // Verify all schema fields are present
    expect(returnedCustomer.id).toBeDefined();
    expect(typeof returnedCustomer.id).toBe('number');
    expect(returnedCustomer.name).toBe('Complete Customer');
    expect(returnedCustomer.contact_person).toBe('Full Contact');
    expect(returnedCustomer.email).toBe('complete@customer.com');
    expect(returnedCustomer.phone).toBe('555-9999');
    expect(returnedCustomer.created_at).toBeInstanceOf(Date);
  });
});