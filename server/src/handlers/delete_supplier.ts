import { db } from '../db';
import { suppliersTable, stockMovementsTable } from '../db/schema';
import { eq, and, like } from 'drizzle-orm';

export const deleteSupplier = async (id: number): Promise<boolean> => {
  try {
    // First check if supplier exists
    const existingSupplier = await db.select()
      .from(suppliersTable)
      .where(eq(suppliersTable.id, id))
      .execute();

    if (existingSupplier.length === 0) {
      throw new Error(`Supplier with id ${id} not found`);
    }

    const supplier = existingSupplier[0];

    // Check for references in stock movements via reference field
    // Look for references that might contain the supplier name or id
    const referencedMovements = await db.select()
      .from(stockMovementsTable)
      .where(
        and(
          like(stockMovementsTable.reference, `%${supplier.name}%`),
          eq(stockMovementsTable.movement_type, 'Receipt')
        )
      )
      .execute();

    if (referencedMovements.length > 0) {
      throw new Error(`Cannot delete supplier: ${referencedMovements.length} stock movements reference this supplier`);
    }

    // Delete the supplier
    const result = await db.delete(suppliersTable)
      .where(eq(suppliersTable.id, id))
      .execute();

    return true;
  } catch (error) {
    console.error('Supplier deletion failed:', error);
    throw error;
  }
};