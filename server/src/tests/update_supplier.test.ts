import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { suppliersTable } from '../db/schema';
import { type UpdateSupplierInput, type CreateSupplierInput } from '../schema';
import { updateSupplier } from '../handlers/update_supplier';
import { eq } from 'drizzle-orm';

// Helper function to create a test supplier
const createTestSupplier = async (supplierData: CreateSupplierInput) => {
  const result = await db.insert(suppliersTable)
    .values({
      name: supplierData.name,
      contact_person: supplierData.contact_person,
      email: supplierData.email,
      phone: supplierData.phone
    })
    .returning()
    .execute();
  
  return result[0];
};

const testSupplierInput: CreateSupplierInput = {
  name: 'Test Supplier',
  contact_person: 'John Doe',
  email: 'john@testsupplier.com',
  phone: '+1234567890'
};

describe('updateSupplier', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update all supplier fields', async () => {
    // Create initial supplier
    const createdSupplier = await createTestSupplier(testSupplierInput);

    const updateInput: UpdateSupplierInput = {
      id: createdSupplier.id,
      name: 'Updated Supplier Name',
      contact_person: 'Jane Smith',
      email: 'jane@updatedsupplier.com',
      phone: '+9876543210'
    };

    const result = await updateSupplier(updateInput);

    // Verify returned data
    expect(result.id).toEqual(createdSupplier.id);
    expect(result.name).toEqual('Updated Supplier Name');
    expect(result.contact_person).toEqual('Jane Smith');
    expect(result.email).toEqual('jane@updatedsupplier.com');
    expect(result.phone).toEqual('+9876543210');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update only specified fields', async () => {
    // Create initial supplier
    const createdSupplier = await createTestSupplier(testSupplierInput);

    const updateInput: UpdateSupplierInput = {
      id: createdSupplier.id,
      name: 'Partially Updated Name'
      // Only updating name, other fields should remain unchanged
    };

    const result = await updateSupplier(updateInput);

    // Verify only name was updated
    expect(result.id).toEqual(createdSupplier.id);
    expect(result.name).toEqual('Partially Updated Name');
    expect(result.contact_person).toEqual(testSupplierInput.contact_person);
    expect(result.email).toEqual(testSupplierInput.email);
    expect(result.phone).toEqual(testSupplierInput.phone);
    expect(result.created_at).toEqual(createdSupplier.created_at);
  });

  it('should save changes to database', async () => {
    // Create initial supplier
    const createdSupplier = await createTestSupplier(testSupplierInput);

    const updateInput: UpdateSupplierInput = {
      id: createdSupplier.id,
      name: 'Database Updated Name',
      email: 'updated@database.com'
    };

    await updateSupplier(updateInput);

    // Query database directly to verify changes
    const suppliers = await db.select()
      .from(suppliersTable)
      .where(eq(suppliersTable.id, createdSupplier.id))
      .execute();

    expect(suppliers).toHaveLength(1);
    expect(suppliers[0].name).toEqual('Database Updated Name');
    expect(suppliers[0].email).toEqual('updated@database.com');
    expect(suppliers[0].contact_person).toEqual(testSupplierInput.contact_person);
    expect(suppliers[0].phone).toEqual(testSupplierInput.phone);
  });

  it('should handle null values correctly', async () => {
    // Create initial supplier
    const createdSupplier = await createTestSupplier(testSupplierInput);

    const updateInput: UpdateSupplierInput = {
      id: createdSupplier.id,
      contact_person: null,
      email: null,
      phone: null
    };

    const result = await updateSupplier(updateInput);

    // Verify null values were set
    expect(result.id).toEqual(createdSupplier.id);
    expect(result.name).toEqual(testSupplierInput.name); // Unchanged
    expect(result.contact_person).toBeNull();
    expect(result.email).toBeNull();
    expect(result.phone).toBeNull();
  });

  it('should return unchanged supplier when no fields provided', async () => {
    // Create initial supplier
    const createdSupplier = await createTestSupplier(testSupplierInput);

    const updateInput: UpdateSupplierInput = {
      id: createdSupplier.id
      // No fields to update
    };

    const result = await updateSupplier(updateInput);

    // Verify nothing changed
    expect(result.id).toEqual(createdSupplier.id);
    expect(result.name).toEqual(testSupplierInput.name);
    expect(result.contact_person).toEqual(testSupplierInput.contact_person);
    expect(result.email).toEqual(testSupplierInput.email);
    expect(result.phone).toEqual(testSupplierInput.phone);
    expect(result.created_at).toEqual(createdSupplier.created_at);
  });

  it('should throw error when supplier not found', async () => {
    const updateInput: UpdateSupplierInput = {
      id: 99999, // Non-existent ID
      name: 'Should Not Work'
    };

    await expect(updateSupplier(updateInput)).rejects.toThrow(/supplier with id 99999 not found/i);
  });

  it('should throw error when updating name to duplicate', async () => {
    // Create two suppliers
    const supplier1 = await createTestSupplier(testSupplierInput);
    const supplier2 = await createTestSupplier({
      name: 'Another Supplier',
      contact_person: null,
      email: null,
      phone: null
    });

    const updateInput: UpdateSupplierInput = {
      id: supplier2.id,
      name: supplier1.name // Try to use duplicate name
    };

    // Should throw unique constraint error
    await expect(updateSupplier(updateInput)).rejects.toThrow();
  });

  it('should handle email-only updates', async () => {
    // Create initial supplier with null email
    const createdSupplier = await createTestSupplier({
      name: 'Email Test Supplier',
      contact_person: null,
      email: null,
      phone: null
    });

    const updateInput: UpdateSupplierInput = {
      id: createdSupplier.id,
      email: 'newemail@test.com'
    };

    const result = await updateSupplier(updateInput);

    expect(result.email).toEqual('newemail@test.com');
    expect(result.name).toEqual('Email Test Supplier');
    expect(result.contact_person).toBeNull();
    expect(result.phone).toBeNull();
  });
});