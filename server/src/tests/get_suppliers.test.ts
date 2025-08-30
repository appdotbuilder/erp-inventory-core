import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { suppliersTable } from '../db/schema';
import { type CreateSupplierInput } from '../schema';
import { getSuppliers } from '../handlers/get_suppliers';

// Test supplier data
const testSupplier1: CreateSupplierInput = {
  name: 'Acme Corp',
  contact_person: 'John Doe',
  email: 'john@acme.com',
  phone: '555-0123'
};

const testSupplier2: CreateSupplierInput = {
  name: 'Global Supply Co',
  contact_person: null,
  email: 'info@globalsupply.com',
  phone: null
};

const testSupplier3: CreateSupplierInput = {
  name: 'Tech Solutions Ltd',
  contact_person: 'Jane Smith',
  email: null,
  phone: '555-0456'
};

describe('getSuppliers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no suppliers exist', async () => {
    const result = await getSuppliers();

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should return all suppliers from database', async () => {
    // Create test suppliers
    await db.insert(suppliersTable)
      .values([testSupplier1, testSupplier2, testSupplier3])
      .execute();

    const result = await getSuppliers();

    expect(result).toHaveLength(3);
    
    // Verify supplier names are present
    const supplierNames = result.map(s => s.name);
    expect(supplierNames).toContain('Acme Corp');
    expect(supplierNames).toContain('Global Supply Co');
    expect(supplierNames).toContain('Tech Solutions Ltd');
  });

  it('should return suppliers with correct data structure', async () => {
    // Create a supplier with all fields
    await db.insert(suppliersTable)
      .values(testSupplier1)
      .execute();

    const result = await getSuppliers();

    expect(result).toHaveLength(1);
    const supplier = result[0];

    // Verify all required fields are present
    expect(supplier.id).toBeDefined();
    expect(typeof supplier.id).toBe('number');
    expect(supplier.name).toBe('Acme Corp');
    expect(supplier.contact_person).toBe('John Doe');
    expect(supplier.email).toBe('john@acme.com');
    expect(supplier.phone).toBe('555-0123');
    expect(supplier.created_at).toBeInstanceOf(Date);
  });

  it('should handle suppliers with nullable fields', async () => {
    // Create supplier with some null fields
    await db.insert(suppliersTable)
      .values(testSupplier2)
      .execute();

    const result = await getSuppliers();

    expect(result).toHaveLength(1);
    const supplier = result[0];

    expect(supplier.name).toBe('Global Supply Co');
    expect(supplier.contact_person).toBeNull();
    expect(supplier.email).toBe('info@globalsupply.com');
    expect(supplier.phone).toBeNull();
  });

  it('should return suppliers sorted by database insertion order', async () => {
    // Insert suppliers in specific order
    await db.insert(suppliersTable).values(testSupplier1).execute();
    await db.insert(suppliersTable).values(testSupplier2).execute();
    await db.insert(suppliersTable).values(testSupplier3).execute();

    const result = await getSuppliers();

    expect(result).toHaveLength(3);
    
    // Verify order (by id, which should reflect insertion order)
    expect(result[0].name).toBe('Acme Corp');
    expect(result[1].name).toBe('Global Supply Co');
    expect(result[2].name).toBe('Tech Solutions Ltd');
    
    // Verify ids are in ascending order
    expect(result[0].id < result[1].id).toBe(true);
    expect(result[1].id < result[2].id).toBe(true);
  });

  it('should handle large number of suppliers', async () => {
    // Create many suppliers
    const manySuppliers: CreateSupplierInput[] = Array.from({ length: 50 }, (_, i) => ({
      name: `Supplier ${i + 1}`,
      contact_person: `Contact ${i + 1}`,
      email: `contact${i + 1}@supplier.com`,
      phone: `555-${String(i + 1).padStart(4, '0')}`
    }));

    await db.insert(suppliersTable)
      .values(manySuppliers)
      .execute();

    const result = await getSuppliers();

    expect(result).toHaveLength(50);
    
    // Verify first and last suppliers
    expect(result[0].name).toBe('Supplier 1');
    expect(result[49].name).toBe('Supplier 50');
    
    // Verify all have required fields
    result.forEach(supplier => {
      expect(supplier.id).toBeDefined();
      expect(supplier.name).toBeDefined();
      expect(supplier.created_at).toBeInstanceOf(Date);
    });
  });
});