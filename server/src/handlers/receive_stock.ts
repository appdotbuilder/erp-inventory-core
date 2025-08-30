import { db } from '../db';
import { stockMovementsTable, itemsTable, locationsTable, suppliersTable } from '../db/schema';
import { type ReceiveStockInput, type StockMovement } from '../schema';
import { eq } from 'drizzle-orm';

export async function receiveStock(input: ReceiveStockInput): Promise<StockMovement> {
  try {
    // Verify item exists
    const item = await db.select()
      .from(itemsTable)
      .where(eq(itemsTable.id, input.item_id))
      .limit(1)
      .execute();

    if (item.length === 0) {
      throw new Error(`Item with id ${input.item_id} not found`);
    }

    // Verify location exists
    const location = await db.select()
      .from(locationsTable)
      .where(eq(locationsTable.id, input.location_id))
      .limit(1)
      .execute();

    if (location.length === 0) {
      throw new Error(`Location with id ${input.location_id} not found`);
    }

    // If supplier_id is provided, verify supplier exists and build reference
    let reference = input.reference;
    if (input.supplier_id) {
      const supplier = await db.select()
        .from(suppliersTable)
        .where(eq(suppliersTable.id, input.supplier_id))
        .limit(1)
        .execute();

      if (supplier.length === 0) {
        throw new Error(`Supplier with id ${input.supplier_id} not found`);
      }

      // Add supplier reference to the reference field
      const supplierRef = `Supplier: ${supplier[0].name} (ID: ${input.supplier_id})`;
      reference = reference ? `${reference} - ${supplierRef}` : supplierRef;
    }

    // Create stock movement record
    const result = await db.insert(stockMovementsTable)
      .values({
        item_id: input.item_id,
        location_id: input.location_id,
        movement_type: 'Receipt',
        quantity: input.quantity.toString(), // Convert number to string for numeric column
        date: new Date(),
        reference: reference
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const stockMovement = result[0];
    return {
      ...stockMovement,
      quantity: parseFloat(stockMovement.quantity) // Convert string back to number
    };
  } catch (error) {
    console.error('Stock receipt failed:', error);
    throw error;
  }
}