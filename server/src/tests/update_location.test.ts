import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { locationsTable } from '../db/schema';
import { type UpdateLocationInput } from '../schema';
import { updateLocation } from '../handlers/update_location';
import { eq } from 'drizzle-orm';

// Test inputs
const testLocationInput = {
  name: 'Test Location',
  description: 'A location for testing'
};

const updateInputName: UpdateLocationInput = {
  id: 1,
  name: 'Updated Location Name'
};

const updateInputDescription: UpdateLocationInput = {
  id: 1,
  description: 'Updated description'
};

const updateInputBoth: UpdateLocationInput = {
  id: 1,
  name: 'Updated Location',
  description: 'Updated description for location'
};

const updateInputNull: UpdateLocationInput = {
  id: 1,
  description: null
};

describe('updateLocation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update location name only', async () => {
    // Create a test location first
    const created = await db.insert(locationsTable)
      .values(testLocationInput)
      .returning()
      .execute();

    const locationId = created[0].id;
    const updateInput = { ...updateInputName, id: locationId };

    const result = await updateLocation(updateInput);

    expect(result.id).toEqual(locationId);
    expect(result.name).toEqual('Updated Location Name');
    expect(result.description).toEqual('A location for testing'); // Should remain unchanged
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update location description only', async () => {
    // Create a test location first
    const created = await db.insert(locationsTable)
      .values(testLocationInput)
      .returning()
      .execute();

    const locationId = created[0].id;
    const updateInput = { ...updateInputDescription, id: locationId };

    const result = await updateLocation(updateInput);

    expect(result.id).toEqual(locationId);
    expect(result.name).toEqual('Test Location'); // Should remain unchanged
    expect(result.description).toEqual('Updated description');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update both name and description', async () => {
    // Create a test location first
    const created = await db.insert(locationsTable)
      .values(testLocationInput)
      .returning()
      .execute();

    const locationId = created[0].id;
    const updateInput = { ...updateInputBoth, id: locationId };

    const result = await updateLocation(updateInput);

    expect(result.id).toEqual(locationId);
    expect(result.name).toEqual('Updated Location');
    expect(result.description).toEqual('Updated description for location');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should set description to null', async () => {
    // Create a test location first
    const created = await db.insert(locationsTable)
      .values(testLocationInput)
      .returning()
      .execute();

    const locationId = created[0].id;
    const updateInput = { ...updateInputNull, id: locationId };

    const result = await updateLocation(updateInput);

    expect(result.id).toEqual(locationId);
    expect(result.name).toEqual('Test Location'); // Should remain unchanged
    expect(result.description).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save updated location to database', async () => {
    // Create a test location first
    const created = await db.insert(locationsTable)
      .values(testLocationInput)
      .returning()
      .execute();

    const locationId = created[0].id;
    const updateInput = { ...updateInputBoth, id: locationId };

    await updateLocation(updateInput);

    // Verify the changes were saved to database
    const locations = await db.select()
      .from(locationsTable)
      .where(eq(locationsTable.id, locationId))
      .execute();

    expect(locations).toHaveLength(1);
    expect(locations[0].name).toEqual('Updated Location');
    expect(locations[0].description).toEqual('Updated description for location');
  });

  it('should return unchanged location when no fields provided', async () => {
    // Create a test location first
    const created = await db.insert(locationsTable)
      .values(testLocationInput)
      .returning()
      .execute();

    const locationId = created[0].id;
    const updateInput = { id: locationId }; // No fields to update

    const result = await updateLocation(updateInput);

    expect(result.id).toEqual(locationId);
    expect(result.name).toEqual('Test Location');
    expect(result.description).toEqual('A location for testing');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should throw error when location does not exist', async () => {
    const updateInput = { ...updateInputName, id: 999 }; // Non-existent ID

    await expect(updateLocation(updateInput)).rejects.toThrow(/location not found/i);
  });

  it('should throw error when updating to duplicate name', async () => {
    // Create two test locations
    const location1 = await db.insert(locationsTable)
      .values({ name: 'Location 1', description: 'First location' })
      .returning()
      .execute();

    const location2 = await db.insert(locationsTable)
      .values({ name: 'Location 2', description: 'Second location' })
      .returning()
      .execute();

    const updateInput = {
      id: location2[0].id,
      name: 'Location 1' // Try to use name that already exists
    };

    // Should throw error due to unique constraint
    await expect(updateLocation(updateInput)).rejects.toThrow();
  });
});