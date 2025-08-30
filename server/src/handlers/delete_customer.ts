import { db } from '../db';
import { customersTable, stockMovementsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteCustomer = async (id: number): Promise<boolean> => {
  try {
    // First, check if the customer exists
    const existingCustomers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, id))
      .execute();

    if (existingCustomers.length === 0) {
      throw new Error('Customer not found');
    }

    // Check if customer is referenced in stock movements
    // While there's no direct foreign key, customers might be referenced in the reference field
    const customerName = existingCustomers[0].name;
    const referencingMovements = await db.select()
      .from(stockMovementsTable)
      .where(eq(stockMovementsTable.reference, customerName))
      .execute();

    if (referencingMovements.length > 0) {
      throw new Error('Cannot delete customer: customer is referenced in stock movements');
    }

    // Delete the customer
    const result = await db.delete(customersTable)
      .where(eq(customersTable.id, id))
      .execute();

    return true;
  } catch (error) {
    console.error('Customer deletion failed:', error);
    throw error;
  }
};