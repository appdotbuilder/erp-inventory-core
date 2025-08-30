import { db } from '../db';
import { billOfMaterialsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function deleteBillOfMaterial(id: number): Promise<boolean> {
  try {
    // First check if the BOM exists
    const existingBom = await db.select()
      .from(billOfMaterialsTable)
      .where(eq(billOfMaterialsTable.id, id))
      .execute();

    if (existingBom.length === 0) {
      return false; // BOM not found
    }

    // Delete the BOM entry
    const result = await db.delete(billOfMaterialsTable)
      .where(eq(billOfMaterialsTable.id, id))
      .execute();

    return true; // Successfully deleted
  } catch (error) {
    console.error('BOM deletion failed:', error);
    throw error;
  }
}