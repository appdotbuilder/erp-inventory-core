import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { itemsTable, billOfMaterialsTable } from '../db/schema';
import { getBillOfMaterials } from '../handlers/get_bill_of_materials';

describe('getBillOfMaterials', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no BOMs exist', async () => {
    const result = await getBillOfMaterials();

    expect(result).toEqual([]);
  });

  it('should return all BOMs when no parentItemId is provided', async () => {
    // Create test items first
    const parentItems = await db.insert(itemsTable)
      .values([
        {
          name: 'Parent Item 1',
          sku: 'PARENT-001',
          description: 'A parent item',
          unit_of_measure: 'each',
          is_manufactured: true,
          reorder_level: '10',
          cost_price: '100.00',
          sale_price: '150.00'
        },
        {
          name: 'Parent Item 2',
          sku: 'PARENT-002',
          description: 'Another parent item',
          unit_of_measure: 'each',
          is_manufactured: true,
          reorder_level: '5',
          cost_price: '200.00',
          sale_price: '300.00'
        }
      ])
      .returning()
      .execute();

    const componentItems = await db.insert(itemsTable)
      .values([
        {
          name: 'Component Item 1',
          sku: 'COMP-001',
          description: 'A component item',
          unit_of_measure: 'each',
          is_manufactured: false,
          reorder_level: '50',
          cost_price: '20.00',
          sale_price: '30.00'
        },
        {
          name: 'Component Item 2',
          sku: 'COMP-002',
          description: 'Another component item',
          unit_of_measure: 'kg',
          is_manufactured: false,
          reorder_level: '100',
          cost_price: '10.00',
          sale_price: '15.00'
        }
      ])
      .returning()
      .execute();

    // Create BOMs
    await db.insert(billOfMaterialsTable)
      .values([
        {
          parent_item_id: parentItems[0].id,
          component_item_id: componentItems[0].id,
          quantity: '2.5000'
        },
        {
          parent_item_id: parentItems[0].id,
          component_item_id: componentItems[1].id,
          quantity: '1.0000'
        },
        {
          parent_item_id: parentItems[1].id,
          component_item_id: componentItems[0].id,
          quantity: '3.0000'
        }
      ])
      .execute();

    const result = await getBillOfMaterials();

    expect(result).toHaveLength(3);
    expect(result[0].parent_item_id).toEqual(parentItems[0].id);
    expect(result[0].component_item_id).toEqual(componentItems[0].id);
    expect(result[0].quantity).toEqual(2.5);
    expect(typeof result[0].quantity).toBe('number');
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should return BOMs for specific parent item when parentItemId is provided', async () => {
    // Create test items
    const parentItems = await db.insert(itemsTable)
      .values([
        {
          name: 'Parent Item 1',
          sku: 'PARENT-001',
          description: 'A parent item',
          unit_of_measure: 'each',
          is_manufactured: true,
          reorder_level: '10',
          cost_price: '100.00',
          sale_price: '150.00'
        },
        {
          name: 'Parent Item 2',
          sku: 'PARENT-002',
          description: 'Another parent item',
          unit_of_measure: 'each',
          is_manufactured: true,
          reorder_level: '5',
          cost_price: '200.00',
          sale_price: '300.00'
        }
      ])
      .returning()
      .execute();

    const componentItems = await db.insert(itemsTable)
      .values([
        {
          name: 'Component Item 1',
          sku: 'COMP-001',
          description: 'A component item',
          unit_of_measure: 'each',
          is_manufactured: false,
          reorder_level: '50',
          cost_price: '20.00',
          sale_price: '30.00'
        },
        {
          name: 'Component Item 2',
          sku: 'COMP-002',
          description: 'Another component item',
          unit_of_measure: 'kg',
          is_manufactured: false,
          reorder_level: '100',
          cost_price: '10.00',
          sale_price: '15.00'
        }
      ])
      .returning()
      .execute();

    // Create BOMs for both parents
    await db.insert(billOfMaterialsTable)
      .values([
        {
          parent_item_id: parentItems[0].id,
          component_item_id: componentItems[0].id,
          quantity: '2.5000'
        },
        {
          parent_item_id: parentItems[0].id,
          component_item_id: componentItems[1].id,
          quantity: '1.0000'
        },
        {
          parent_item_id: parentItems[1].id,
          component_item_id: componentItems[0].id,
          quantity: '3.0000'
        }
      ])
      .execute();

    // Get BOMs for only the first parent
    const result = await getBillOfMaterials(parentItems[0].id);

    expect(result).toHaveLength(2);
    result.forEach(bom => {
      expect(bom.parent_item_id).toEqual(parentItems[0].id);
      expect(typeof bom.quantity).toBe('number');
    });

    expect(result[0].component_item_id).toEqual(componentItems[0].id);
    expect(result[0].quantity).toEqual(2.5);
    expect(result[1].component_item_id).toEqual(componentItems[1].id);
    expect(result[1].quantity).toEqual(1.0);
  });

  it('should return empty array when parentItemId has no BOMs', async () => {
    // Create a parent item with no BOMs
    const parentItem = await db.insert(itemsTable)
      .values({
        name: 'Parent Item',
        sku: 'PARENT-001',
        description: 'A parent item',
        unit_of_measure: 'each',
        is_manufactured: true,
        reorder_level: '10',
        cost_price: '100.00',
        sale_price: '150.00'
      })
      .returning()
      .execute();

    const result = await getBillOfMaterials(parentItem[0].id);

    expect(result).toEqual([]);
  });

  it('should handle decimal quantities correctly', async () => {
    // Create test items
    const parentItem = await db.insert(itemsTable)
      .values({
        name: 'Parent Item',
        sku: 'PARENT-001',
        description: 'A parent item',
        unit_of_measure: 'each',
        is_manufactured: true,
        reorder_level: '10',
        cost_price: '100.00',
        sale_price: '150.00'
      })
      .returning()
      .execute();

    const componentItem = await db.insert(itemsTable)
      .values({
        name: 'Component Item',
        sku: 'COMP-001',
        description: 'A component item',
        unit_of_measure: 'kg',
        is_manufactured: false,
        reorder_level: '50',
        cost_price: '20.00',
        sale_price: '30.00'
      })
      .returning()
      .execute();

    // Create BOM with precise decimal quantity
    await db.insert(billOfMaterialsTable)
      .values({
        parent_item_id: parentItem[0].id,
        component_item_id: componentItem[0].id,
        quantity: '3.1416' // Pi for precision test
      })
      .execute();

    const result = await getBillOfMaterials(parentItem[0].id);

    expect(result).toHaveLength(1);
    expect(result[0].quantity).toEqual(3.1416);
    expect(typeof result[0].quantity).toBe('number');
    expect(result[0].parent_item_id).toEqual(parentItem[0].id);
    expect(result[0].component_item_id).toEqual(componentItem[0].id);
  });

  it('should return BOMs in insertion order', async () => {
    // Create test items
    const parentItem = await db.insert(itemsTable)
      .values({
        name: 'Parent Item',
        sku: 'PARENT-001',
        description: 'A parent item',
        unit_of_measure: 'each',
        is_manufactured: true,
        reorder_level: '10',
        cost_price: '100.00',
        sale_price: '150.00'
      })
      .returning()
      .execute();

    const componentItems = await db.insert(itemsTable)
      .values([
        {
          name: 'Component A',
          sku: 'COMP-A',
          description: 'First component',
          unit_of_measure: 'each',
          is_manufactured: false,
          reorder_level: '50',
          cost_price: '20.00',
          sale_price: '30.00'
        },
        {
          name: 'Component B',
          sku: 'COMP-B',
          description: 'Second component',
          unit_of_measure: 'kg',
          is_manufactured: false,
          reorder_level: '100',
          cost_price: '10.00',
          sale_price: '15.00'
        },
        {
          name: 'Component C',
          sku: 'COMP-C',
          description: 'Third component',
          unit_of_measure: 'liter',
          is_manufactured: false,
          reorder_level: '25',
          cost_price: '5.00',
          sale_price: '8.00'
        }
      ])
      .returning()
      .execute();

    // Insert BOMs in specific order
    const bomInserts = await db.insert(billOfMaterialsTable)
      .values([
        {
          parent_item_id: parentItem[0].id,
          component_item_id: componentItems[0].id,
          quantity: '1.0000'
        },
        {
          parent_item_id: parentItem[0].id,
          component_item_id: componentItems[1].id,
          quantity: '2.0000'
        },
        {
          parent_item_id: parentItem[0].id,
          component_item_id: componentItems[2].id,
          quantity: '3.0000'
        }
      ])
      .returning()
      .execute();

    const result = await getBillOfMaterials(parentItem[0].id);

    expect(result).toHaveLength(3);
    expect(result[0].id).toEqual(bomInserts[0].id);
    expect(result[1].id).toEqual(bomInserts[1].id);
    expect(result[2].id).toEqual(bomInserts[2].id);
    expect(result[0].quantity).toEqual(1.0);
    expect(result[1].quantity).toEqual(2.0);
    expect(result[2].quantity).toEqual(3.0);
  });
});