import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { locationsTable } from '../db/schema';
import { type CreateLocationInput } from '../schema';
import { createLocation } from '../handlers/create_location';
import { eq } from 'drizzle-orm';

// Simple test input with description
const testInputWithDescription: CreateLocationInput = {
  name: 'Test Warehouse',
  description: 'A warehouse for testing purposes'
};

// Test input without description (null)
const testInputWithoutDescription: CreateLocationInput = {
  name: 'Main Storage',
  description: null
};

describe('createLocation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a location with description', async () => {
    const result = await createLocation(testInputWithDescription);

    // Basic field validation
    expect(result.name).toEqual('Test Warehouse');
    expect(result.description).toEqual('A warehouse for testing purposes');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a location without description', async () => {
    const result = await createLocation(testInputWithoutDescription);

    // Basic field validation
    expect(result.name).toEqual('Main Storage');
    expect(result.description).toBeNull();
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save location to database', async () => {
    const result = await createLocation(testInputWithDescription);

    // Query using proper drizzle syntax
    const locations = await db.select()
      .from(locationsTable)
      .where(eq(locationsTable.id, result.id))
      .execute();

    expect(locations).toHaveLength(1);
    expect(locations[0].name).toEqual('Test Warehouse');
    expect(locations[0].description).toEqual('A warehouse for testing purposes');
    expect(locations[0].created_at).toBeInstanceOf(Date);
  });

  it('should enforce unique name constraint', async () => {
    // Create first location
    await createLocation(testInputWithDescription);

    // Try to create another location with the same name
    const duplicateInput: CreateLocationInput = {
      name: 'Test Warehouse', // Same name as first location
      description: 'Another warehouse'
    };

    await expect(createLocation(duplicateInput)).rejects.toThrow(/unique/i);
  });

  it('should handle empty description correctly', async () => {
    const inputWithEmptyString: CreateLocationInput = {
      name: 'Empty Description Location',
      description: ''
    };

    const result = await createLocation(inputWithEmptyString);

    expect(result.name).toEqual('Empty Description Location');
    expect(result.description).toEqual('');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should generate sequential IDs for multiple locations', async () => {
    const location1 = await createLocation({
      name: 'Location 1',
      description: null
    });

    const location2 = await createLocation({
      name: 'Location 2', 
      description: null
    });

    expect(location1.id).toBeDefined();
    expect(location2.id).toBeDefined();
    expect(location2.id).toBeGreaterThan(location1.id);
  });
});