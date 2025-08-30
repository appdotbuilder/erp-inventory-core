import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, Package, Warehouse, AlertTriangle, TrendingUp, Filter } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { StockLevel, StockMovement, Item, Location, GetStockMovementsInput, MovementType } from '../../../server/src/schema';

export function StockReporting() {
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [levelFilters, setLevelFilters] = useState({
    itemId: undefined as number | undefined,
    locationId: undefined as number | undefined,
    showLowStock: false
  });

  const [movementFilters, setMovementFilters] = useState<GetStockMovementsInput>({
    item_id: undefined,
    location_id: undefined,
    movement_type: undefined,
    start_date: undefined,
    end_date: undefined
  });

  const loadReferenceData = useCallback(async () => {
    try {
      const [itemsData, locationsData] = await Promise.all([
        trpc.getItems.query(),
        trpc.getLocations.query()
      ]);
      setItems(itemsData);
      setLocations(locationsData);
    } catch (error) {
      console.error('Failed to load reference data:', error);
    }
  }, []);

  const loadStockLevels = useCallback(async () => {
    try {
      setIsLoading(true);
      const levels = await trpc.getStockLevels.query({
        itemId: levelFilters.itemId,
        locationId: levelFilters.locationId
      });
      
      let filteredLevels = levels;
      if (levelFilters.showLowStock) {
        filteredLevels = levels.filter((level: StockLevel) => level.current_quantity <= level.reorder_level);
      }
      
      setStockLevels(filteredLevels);
    } catch (error) {
      console.error('Failed to load stock levels:', error);
    } finally {
      setIsLoading(false);
    }
  }, [levelFilters]);

  const loadStockMovements = useCallback(async () => {
    try {
      setIsLoading(true);
      const movements = await trpc.getStockMovements.query(movementFilters);
      setStockMovements(movements);
    } catch (error) {
      console.error('Failed to load stock movements:', error);
    } finally {
      setIsLoading(false);
    }
  }, [movementFilters]);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  useEffect(() => {
    loadStockLevels();
  }, [loadStockLevels]);

  useEffect(() => {
    loadStockMovements();
  }, [loadStockMovements]);

  const clearLevelFilters = () => {
    setLevelFilters({
      itemId: undefined,
      locationId: undefined,
      showLowStock: false
    });
  };

  const clearMovementFilters = () => {
    setMovementFilters({
      item_id: undefined,
      location_id: undefined,
      movement_type: undefined,
      start_date: undefined,
      end_date: undefined
    });
  };

  const getMovementTypeColor = (type: MovementType) => {
    switch (type) {
      case 'Receipt':
        return 'bg-green-100 text-green-800';
      case 'Issue':
        return 'bg-blue-100 text-blue-800';
      case 'Adjustment':
        return 'bg-yellow-100 text-yellow-800';
      case 'Transfer In':
        return 'bg-purple-100 text-purple-800';
      case 'Transfer Out':
        return 'bg-purple-100 text-purple-800';
      case 'Production':
        return 'bg-indigo-100 text-indigo-800';
      case 'Consumption':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const lowStockCount = stockLevels.filter((level: StockLevel) => level.current_quantity <= level.reorder_level).length;
  const totalStockValue = stockLevels.reduce((sum, level) => {
    const item = items.find(i => i.id === level.item_id);
    return sum + (level.current_quantity * (item?.cost_price || 0));
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Stock Reports & Analytics</h2>
        <p className="text-muted-foreground">
          View current stock levels and analyze inventory movements
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock Locations</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stockLevels.length}</div>
            <p className="text-xs text-muted-foreground">
              Item-location combinations
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{lowStockCount}</div>
            <p className="text-xs text-muted-foreground">
              Below reorder level
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalStockValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              At cost price
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Movements</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stockMovements.length}</div>
            <p className="text-xs text-muted-foreground">
              Stock transactions
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="levels" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="levels">Current Stock Levels</TabsTrigger>
          <TabsTrigger value="movements">Stock Movements</TabsTrigger>
        </TabsList>

        <TabsContent value="levels" className="space-y-4">
          {/* Stock Levels Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filter Stock Levels
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Item</Label>
                  <Select 
                    value={levelFilters.itemId?.toString() || 'all'} 
                    onValueChange={(value) => setLevelFilters(prev => ({ 
                      ...prev, 
                      itemId: value === 'all' ? undefined : parseInt(value) 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All items" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All items</SelectItem>
                      {items.map((item: Item) => (
                        <SelectItem key={item.id} value={item.id.toString()}>
                          {item.name} ({item.sku})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Select 
                    value={levelFilters.locationId?.toString() || 'all'} 
                    onValueChange={(value) => setLevelFilters(prev => ({ 
                      ...prev, 
                      locationId: value === 'all' ? undefined : parseInt(value) 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All locations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All locations</SelectItem>
                      {locations.map((location: Location) => (
                        <SelectItem key={location.id} value={location.id.toString()}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Stock Status</Label>
                  <Select 
                    value={levelFilters.showLowStock ? 'low' : 'all'} 
                    onValueChange={(value) => setLevelFilters(prev => ({ 
                      ...prev, 
                      showLowStock: value === 'low' 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All stock</SelectItem>
                      <SelectItem value="low">Low stock only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>&nbsp;</Label>
                  <Button onClick={clearLevelFilters} variant="outline" className="w-full">
                    Clear Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stock Levels Table */}
          <Card>
            <CardHeader>
              <CardTitle>Stock Levels</CardTitle>
              <CardDescription>
                Current inventory levels across all locations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading...</div>
              ) : stockLevels.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No stock levels found matching your filters</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead className="text-right">Current Stock</TableHead>
                        <TableHead className="text-right">Reorder Level</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockLevels.map((level: StockLevel, index: number) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{level.item_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{level.item_sku}</Badge>
                          </TableCell>
                          <TableCell>{level.location_name}</TableCell>
                          <TableCell className="text-right">
                            {level.current_quantity} {level.unit_of_measure}
                          </TableCell>
                          <TableCell className="text-right">
                            {level.reorder_level} {level.unit_of_measure}
                          </TableCell>
                          <TableCell>
                            {level.current_quantity <= level.reorder_level ? (
                              <Badge className="bg-red-100 text-red-800">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Low Stock
                              </Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-800">OK</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements" className="space-y-4">
          {/* Stock Movements Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filter Stock Movements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="space-y-2">
                  <Label>Item</Label>
                  <Select 
                    value={movementFilters.item_id?.toString() || 'all'} 
                    onValueChange={(value) => setMovementFilters(prev => ({ 
                      ...prev, 
                      item_id: value === 'all' ? undefined : parseInt(value) 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All items" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All items</SelectItem>
                      {items.map((item: Item) => (
                        <SelectItem key={item.id} value={item.id.toString()}>
                          {item.name} ({item.sku})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Select 
                    value={movementFilters.location_id?.toString() || 'all'} 
                    onValueChange={(value) => setMovementFilters(prev => ({ 
                      ...prev, 
                      location_id: value === 'all' ? undefined : parseInt(value) 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All locations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All locations</SelectItem>
                      {locations.map((location: Location) => (
                        <SelectItem key={location.id} value={location.id.toString()}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Movement Type</Label>
                  <Select 
                    value={movementFilters.movement_type || 'all'} 
                    onValueChange={(value) => setMovementFilters(prev => ({ 
                      ...prev, 
                      movement_type: value === 'all' ? undefined : value as MovementType 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      <SelectItem value="Receipt">Receipt</SelectItem>
                      <SelectItem value="Issue">Issue</SelectItem>
                      <SelectItem value="Adjustment">Adjustment</SelectItem>
                      <SelectItem value="Transfer In">Transfer In</SelectItem>
                      <SelectItem value="Transfer Out">Transfer Out</SelectItem>
                      <SelectItem value="Production">Production</SelectItem>
                      <SelectItem value="Consumption">Consumption</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={movementFilters.start_date ? movementFilters.start_date.toISOString().split('T')[0] : ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setMovementFilters(prev => ({ 
                        ...prev, 
                        start_date: e.target.value ? new Date(e.target.value) : undefined 
                      }))
                    }
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={movementFilters.end_date ? movementFilters.end_date.toISOString().split('T')[0] : ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setMovementFilters(prev => ({ 
                        ...prev, 
                        end_date: e.target.value ? new Date(e.target.value) : undefined 
                      }))
                    }
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>&nbsp;</Label>
                  <Button onClick={clearMovementFilters} variant="outline" className="w-full">
                    Clear Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stock Movements Table */}
          <Card>
            <CardHeader>
              <CardTitle>Stock Movements History</CardTitle>
              <CardDescription>
                Historical stock transactions and movements
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading...</div>
              ) : stockMovements.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No stock movements found matching your filters</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead>Reference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockMovements.map((movement: StockMovement) => {
                        const item = items.find(i => i.id === movement.item_id);
                        const location = locations.find(l => l.id === movement.location_id);
                        return (
                          <TableRow key={movement.id}>
                            <TableCell>
                              {movement.date.toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{item?.name || 'Unknown Item'}</div>
                                {item && (
                                  <Badge variant="outline" className="text-xs">
                                    {item.sku}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{location?.name || 'Unknown Location'}</TableCell>
                            <TableCell>
                              <Badge className={getMovementTypeColor(movement.movement_type)}>
                                {movement.movement_type}
                              </Badge>
                            </TableCell>
                            <TableCell className={`text-right font-medium ${
                              movement.quantity > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {movement.quantity > 0 ? '+' : ''}{movement.quantity} {item?.unit_of_measure || ''}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {movement.reference || '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}