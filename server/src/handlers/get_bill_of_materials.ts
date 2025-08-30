import { db } from '../db';
import { billOfMaterialsTable } from '../db/schema';
import { type BillOfMaterial } from '../schema';
import { eq } from 'drizzle-orm';

export const getBillOfMaterials = async (parentItemId?: number): Promise<BillOfMaterial[]> => {
  try {
    let results;

    // Build the query conditionally
    if (parentItemId !== undefined) {
      results = await db.select()
        .from(billOfMaterialsTable)
        .where(eq(billOfMaterialsTable.parent_item_id, parentItemId))
        .execute();
    } else {
      results = await db.select()
        .from(billOfMaterialsTable)
        .execute();
    }

    // Convert numeric fields back to numbers before returning
    return results.map(bom => ({
      ...bom,
      quantity: parseFloat(bom.quantity) // Convert numeric to number
    }));
  } catch (error) {
    console.error('Get bill of materials failed:', error);
    throw error;
  }
};