import { db } from '../db';
import { itemsTable, locationsTable, stockMovementsTable, customersTable } from '../db/schema';
import { type IssueStockInput, type StockMovement } from '../schema';
import { eq, and, sum } from 'drizzle-orm';

export async function issueStock(input: IssueStockInput): Promise<StockMovement> {
  try {
    // Verify that the item exists
    const item = await db.select()
      .from(itemsTable)
      .where(eq(itemsTable.id, input.item_id))
      .limit(1)
      .execute();

    if (item.length === 0) {
      throw new Error(`Item with ID ${input.item_id} does not exist`);
    }

    // Verify that the location exists
    const location = await db.select()
      .from(locationsTable)
      .where(eq(locationsTable.id, input.location_id))
      .limit(1)
      .execute();

    if (location.length === 0) {
      throw new Error(`Location with ID ${input.location_id} does not exist`);
    }

    // If customer_id is provided, verify the customer exists
    if (input.customer_id) {
      const customer = await db.select()
        .from(customersTable)
        .where(eq(customersTable.id, input.customer_id))
        .limit(1)
        .execute();

      if (customer.length === 0) {
        throw new Error(`Customer with ID ${input.customer_id} does not exist`);
      }
    }

    // Calculate current stock level at the location
    const stockQuery = await db.select({
      total: sum(stockMovementsTable.quantity)
    })
      .from(stockMovementsTable)
      .where(
        and(
          eq(stockMovementsTable.item_id, input.item_id),
          eq(stockMovementsTable.location_id, input.location_id)
        )
      )
      .execute();

    const currentStock = parseFloat(stockQuery[0]?.total || '0');

    // Check if sufficient stock is available
    if (currentStock < input.quantity) {
      throw new Error(
        `Insufficient stock. Available: ${currentStock}, Requested: ${input.quantity}`
      );
    }

    // Build reference string with customer info if provided
    let reference = input.reference;
    if (input.customer_id) {
      const customerRef = `Customer ID: ${input.customer_id}`;
      reference = reference ? `${reference} - ${customerRef}` : customerRef;
    }

    // Create the stock movement record
    const result = await db.insert(stockMovementsTable)
      .values({
        item_id: input.item_id,
        location_id: input.location_id,
        movement_type: 'Issue',
        quantity: (-input.quantity).toString(), // Negative for outgoing stock
        date: new Date(),
        reference: reference
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const stockMovement = result[0];
    return {
      ...stockMovement,
      quantity: parseFloat(stockMovement.quantity)
    };
  } catch (error) {
    console.error('Stock issuance failed:', error);
    throw error;
  }
}