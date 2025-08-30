import { db } from '../db';
import { customersTable } from '../db/schema';
import { type UpdateCustomerInput, type Customer } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateCustomer(input: UpdateCustomerInput): Promise<Customer> {
  try {
    // First, verify the customer exists
    const existingCustomer = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, input.id))
      .execute();

    if (existingCustomer.length === 0) {
      throw new Error(`Customer with id ${input.id} not found`);
    }

    // Prepare update values, only include fields that are provided
    const updateValues: Partial<typeof customersTable.$inferInsert> = {};
    
    if (input.name !== undefined) updateValues.name = input.name;
    if (input.contact_person !== undefined) updateValues.contact_person = input.contact_person;
    if (input.email !== undefined) updateValues.email = input.email;
    if (input.phone !== undefined) updateValues.phone = input.phone;

    // Update the customer record
    const result = await db.update(customersTable)
      .set(updateValues)
      .where(eq(customersTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Customer update failed:', error);
    throw error;
  }
}