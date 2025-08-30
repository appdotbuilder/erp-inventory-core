import { type CreateLocationInput, type Location } from '../schema';

export async function createLocation(input: CreateLocationInput): Promise<Location> {
  // This is a placeholder declaration! Real code should be implemented here.
  // The goal of this handler is creating a new storage location and persisting it in the database.
  // Should validate that name is unique.
  return Promise.resolve({
    id: 0, // Placeholder ID
    name: input.name,
    description: input.description,
    created_at: new Date()
  } as Location);
}