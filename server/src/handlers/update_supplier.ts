import { db } from '../db';
import { suppliersTable } from '../db/schema';
import { type UpdateSupplierInput, type Supplier } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateSupplier(input: UpdateSupplierInput): Promise<Supplier> {
  try {
    // First verify the supplier exists
    const existingSupplier = await db.select()
      .from(suppliersTable)
      .where(eq(suppliersTable.id, input.id))
      .execute();

    if (existingSupplier.length === 0) {
      throw new Error(`Supplier with ID ${input.id} not found`);
    }

    // Build update object with only provided fields
    const updateData: Record<string, any> = {};
    
    if (input.name !== undefined) {
      updateData['name'] = input.name;
    }
    if (input.contact_person !== undefined) {
      updateData['contact_person'] = input.contact_person;
    }
    if (input.email !== undefined) {
      updateData['email'] = input.email;
    }
    if (input.phone !== undefined) {
      updateData['phone'] = input.phone;
    }

    // If no fields to update, return existing supplier
    if (Object.keys(updateData).length === 0) {
      return existingSupplier[0];
    }

    // Update the supplier
    const result = await db.update(suppliersTable)
      .set(updateData)
      .where(eq(suppliersTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Supplier update failed:', error);
    throw error;
  }
}