import { db } from '../db';
import { locationsTable } from '../db/schema';
import { type UpdateLocationInput, type Location } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateLocation(input: UpdateLocationInput): Promise<Location> {
  try {
    // First, verify the location exists
    const existingLocation = await db.select()
      .from(locationsTable)
      .where(eq(locationsTable.id, input.id))
      .execute();

    if (existingLocation.length === 0) {
      throw new Error('Location not found');
    }

    // Build update object with only provided fields
    const updateData: Partial<typeof locationsTable.$inferInsert> = {};
    
    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    
    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    // If no fields to update, return existing location
    if (Object.keys(updateData).length === 0) {
      return existingLocation[0];
    }

    // Update the location
    const result = await db.update(locationsTable)
      .set(updateData)
      .where(eq(locationsTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Location update failed:', error);
    throw error;
  }
}