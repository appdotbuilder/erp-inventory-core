import { db } from '../db';
import { suppliersTable } from '../db/schema';
import { type CreateSupplierInput, type Supplier } from '../schema';

export const createSupplier = async (input: CreateSupplierInput): Promise<Supplier> => {
  try {
    // Insert supplier record
    const result = await db.insert(suppliersTable)
      .values({
        name: input.name,
        contact_person: input.contact_person,
        email: input.email,
        phone: input.phone
      })
      .returning()
      .execute();

    // Return the created supplier
    const supplier = result[0];
    return {
      ...supplier,
      created_at: supplier.created_at
    };
  } catch (error) {
    console.error('Supplier creation failed:', error);
    throw error;
  }
};