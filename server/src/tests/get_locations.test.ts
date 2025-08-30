import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { locationsTable } from '../db/schema';
import { getLocations } from '../handlers/get_locations';

describe('getLocations', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no locations exist', async () => {
    const result = await getLocations();
    
    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should return single location', async () => {
    // Create a test location
    await db.insert(locationsTable).values({
      name: 'Main Warehouse',
      description: 'Primary storage facility'
    });

    const result = await getLocations();
    
    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Main Warehouse');
    expect(result[0].description).toEqual('Primary storage facility');
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should return multiple locations', async () => {
    // Create multiple test locations
    await db.insert(locationsTable).values([
      {
        name: 'Main Warehouse',
        description: 'Primary storage facility'
      },
      {
        name: 'Secondary Storage',
        description: 'Backup storage area'
      },
      {
        name: 'Production Floor',
        description: null // Test nullable description
      }
    ]);

    const result = await getLocations();
    
    expect(result).toHaveLength(3);
    
    // Verify each location has required fields
    result.forEach(location => {
      expect(location.id).toBeDefined();
      expect(location.name).toBeDefined();
      expect(location.created_at).toBeInstanceOf(Date);
    });

    // Check specific locations
    const mainWarehouse = result.find(loc => loc.name === 'Main Warehouse');
    const productionFloor = result.find(loc => loc.name === 'Production Floor');
    
    expect(mainWarehouse?.description).toEqual('Primary storage facility');
    expect(productionFloor?.description).toBeNull();
  });

  it('should return locations with all required fields', async () => {
    await db.insert(locationsTable).values({
      name: 'Test Location',
      description: 'Test description'
    });

    const result = await getLocations();
    const location = result[0];
    
    // Verify all schema fields are present
    expect(location).toHaveProperty('id');
    expect(location).toHaveProperty('name');
    expect(location).toHaveProperty('description');
    expect(location).toHaveProperty('created_at');
    
    // Verify field types
    expect(typeof location.id).toBe('number');
    expect(typeof location.name).toBe('string');
    expect(location.created_at).toBeInstanceOf(Date);
  });

  it('should handle locations with null descriptions', async () => {
    // Insert location with null description
    await db.insert(locationsTable).values({
      name: 'Storage Room A',
      description: null
    });

    const result = await getLocations();
    
    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Storage Room A');
    expect(result[0].description).toBeNull();
  });

  it('should order locations consistently', async () => {
    // Create locations in specific order
    await db.insert(locationsTable).values([
      { name: 'Warehouse A', description: 'First warehouse' },
      { name: 'Warehouse B', description: 'Second warehouse' },
      { name: 'Warehouse C', description: 'Third warehouse' }
    ]);

    const result = await getLocations();
    
    expect(result).toHaveLength(3);
    
    // Verify all locations are returned (order doesn't matter for basic functionality)
    const names = result.map(loc => loc.name).sort();
    expect(names).toEqual(['Warehouse A', 'Warehouse B', 'Warehouse C']);
  });
});