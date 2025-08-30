import { db } from '../db';
import { locationsTable } from '../db/schema';
import { type Location } from '../schema';

export const getLocations = async (): Promise<Location[]> => {
  try {
    const results = await db.select()
      .from(locationsTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get locations:', error);
    throw error;
  }
};