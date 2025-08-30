import { db } from '../db';
import { itemsTable, billOfMaterialsTable, stockMovementsTable } from '../db/schema';
import { type ProduceItemInput, type StockMovement } from '../schema';
import { eq, sql, and } from 'drizzle-orm';

export async function produceItem(input: ProduceItemInput): Promise<StockMovement[]> {
  try {
    // Verify the item exists and is manufactured
    const item = await db.select()
      .from(itemsTable)
      .where(eq(itemsTable.id, input.item_id))
      .execute();

    if (item.length === 0) {
      throw new Error(`Item with ID ${input.item_id} not found`);
    }

    if (!item[0].is_manufactured) {
      throw new Error(`Item ${item[0].name} is not marked as manufactured`);
    }

    // Get BOM for the item
    const bomComponents = await db.select({
      component_item_id: billOfMaterialsTable.component_item_id,
      quantity_per_unit: billOfMaterialsTable.quantity,
      component_name: itemsTable.name,
      component_sku: itemsTable.sku
    })
      .from(billOfMaterialsTable)
      .innerJoin(itemsTable, eq(billOfMaterialsTable.component_item_id, itemsTable.id))
      .where(eq(billOfMaterialsTable.parent_item_id, input.item_id))
      .execute();

    if (bomComponents.length === 0) {
      throw new Error(`No Bill of Materials found for item ${item[0].name}`);
    }

    // Calculate required component quantities
    const requiredComponents = bomComponents.map(comp => ({
      item_id: comp.component_item_id,
      name: comp.component_name,
      sku: comp.component_sku,
      required_quantity: parseFloat(comp.quantity_per_unit.toString()) * input.quantity
    }));

    // Check current stock levels for all components at the location
    const stockLevels: { item_id: number; current_quantity: string; name: string; sku: string; }[] = [];
    
    for (const component of requiredComponents) {
      const movements = await db.select({
        total_quantity: sql<string>`COALESCE(SUM(${stockMovementsTable.quantity}), '0')`.as('total_quantity')
      })
        .from(stockMovementsTable)
        .where(
          and(
            eq(stockMovementsTable.item_id, component.item_id),
            eq(stockMovementsTable.location_id, input.location_id)
          )
        )
        .execute();

      stockLevels.push({
        item_id: component.item_id,
        current_quantity: movements[0]?.total_quantity || '0',
        name: component.name,
        sku: component.sku
      });
    }

    // Validate sufficient stock for all components
    const insufficientStock: string[] = [];
    
    for (const required of requiredComponents) {
      const currentStock = stockLevels.find(stock => 
        stock.item_id === required.item_id
      );
      
      const available = currentStock ? parseFloat(currentStock.current_quantity) : 0;
      
      if (available < required.required_quantity) {
        insufficientStock.push(
          `${required.name} (${required.sku}): need ${required.required_quantity}, have ${available}`
        );
      }
    }

    if (insufficientStock.length > 0) {
      throw new Error(`Insufficient stock for components: ${insufficientStock.join('; ')}`);
    }

    // Create all stock movements in a transaction-like approach
    const movements: StockMovement[] = [];
    const currentDate = new Date();

    // 1. Create Production movement (positive quantity for produced item)
    const productionResult = await db.insert(stockMovementsTable)
      .values({
        item_id: input.item_id,
        location_id: input.location_id,
        movement_type: 'Production',
        quantity: input.quantity.toString(),
        date: currentDate,
        reference: input.reference
      })
      .returning()
      .execute();

    movements.push({
      ...productionResult[0],
      quantity: parseFloat(productionResult[0].quantity)
    });

    // 2. Create Consumption movements (negative quantities for components)
    for (const required of requiredComponents) {
      const consumptionResult = await db.insert(stockMovementsTable)
        .values({
          item_id: required.item_id,
          location_id: input.location_id,
          movement_type: 'Consumption',
          quantity: (-required.required_quantity).toString(), // Negative quantity
          date: currentDate,
          reference: input.reference ? `Production of ${item[0].name} - ${input.reference}` : `Production of ${item[0].name}`
        })
        .returning()
        .execute();

      movements.push({
        ...consumptionResult[0],
        quantity: parseFloat(consumptionResult[0].quantity)
      });
    }

    return movements;

  } catch (error) {
    console.error('Item production failed:', error);
    throw error;
  }
}