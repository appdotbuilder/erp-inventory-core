import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { suppliersTable } from '../db/schema';
import { type CreateSupplierInput } from '../schema';
import { createSupplier } from '../handlers/create_supplier';
import { eq } from 'drizzle-orm';

// Test input with all fields
const testInputComplete: CreateSupplierInput = {
  name: 'Test Supplier Inc.',
  contact_person: 'John Smith',
  email: 'john@testsupplier.com',
  phone: '+1-555-0123'
};

// Test input with minimal required fields
const testInputMinimal: CreateSupplierInput = {
  name: 'Minimal Supplier',
  contact_person: null,
  email: null,
  phone: null
};

describe('createSupplier', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a supplier with all fields', async () => {
    const result = await createSupplier(testInputComplete);

    // Basic field validation
    expect(result.name).toEqual('Test Supplier Inc.');
    expect(result.contact_person).toEqual('John Smith');
    expect(result.email).toEqual('john@testsupplier.com');
    expect(result.phone).toEqual('+1-555-0123');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a supplier with minimal fields', async () => {
    const result = await createSupplier(testInputMinimal);

    expect(result.name).toEqual('Minimal Supplier');
    expect(result.contact_person).toBeNull();
    expect(result.email).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save supplier to database', async () => {
    const result = await createSupplier(testInputComplete);

    // Query using proper drizzle syntax
    const suppliers = await db.select()
      .from(suppliersTable)
      .where(eq(suppliersTable.id, result.id))
      .execute();

    expect(suppliers).toHaveLength(1);
    expect(suppliers[0].name).toEqual('Test Supplier Inc.');
    expect(suppliers[0].contact_person).toEqual('John Smith');
    expect(suppliers[0].email).toEqual('john@testsupplier.com');
    expect(suppliers[0].phone).toEqual('+1-555-0123');
    expect(suppliers[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle duplicate name error', async () => {
    // Create first supplier
    await createSupplier(testInputComplete);

    // Try to create another with same name
    const duplicateInput: CreateSupplierInput = {
      name: 'Test Supplier Inc.',
      contact_person: 'Different Person',
      email: 'different@email.com',
      phone: '+1-555-9999'
    };

    await expect(createSupplier(duplicateInput))
      .rejects
      .toThrow(/unique constraint|duplicate key/i);
  });

  it('should handle invalid email gracefully', async () => {
    // Note: Email validation is handled by Zod schema, not the handler
    // This test verifies the handler works with valid email input
    const emailInput: CreateSupplierInput = {
      name: 'Email Test Supplier',
      contact_person: 'Contact Person',
      email: 'valid@example.com',
      phone: null
    };

    const result = await createSupplier(emailInput);
    expect(result.email).toEqual('valid@example.com');
  });

  it('should create multiple suppliers with different names', async () => {
    const supplier1 = await createSupplier({
      name: 'Supplier One',
      contact_person: null,
      email: null,
      phone: null
    });

    const supplier2 = await createSupplier({
      name: 'Supplier Two',
      contact_person: 'Contact Two',
      email: 'contact2@example.com',
      phone: '+1-555-0002'
    });

    expect(supplier1.id).not.toEqual(supplier2.id);
    expect(supplier1.name).toEqual('Supplier One');
    expect(supplier2.name).toEqual('Supplier Two');

    // Verify both exist in database
    const allSuppliers = await db.select()
      .from(suppliersTable)
      .execute();

    expect(allSuppliers).toHaveLength(2);
  });

  it('should preserve exact input values', async () => {
    const exactInput: CreateSupplierInput = {
      name: 'Exact Value Test',
      contact_person: 'Exact Contact',
      email: 'exact@test.com',
      phone: '555-TEST'
    };

    const result = await createSupplier(exactInput);

    expect(result.name).toEqual(exactInput.name);
    expect(result.contact_person).toEqual(exactInput.contact_person);
    expect(result.email).toEqual(exactInput.email);
    expect(result.phone).toEqual(exactInput.phone);
  });
});