import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Warehouse, AlertTriangle, TrendingUp } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { DashboardMetrics, StockLevel } from '../../../server/src/schema';

export function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [lowStockItems, setLowStockItems] = useState<StockLevel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Load dashboard metrics
      const metricsData = await trpc.getDashboardMetrics.query();
      setMetrics(metricsData);

      // Load stock levels to identify low stock items
      const stockLevels = await trpc.getStockLevels.query({});
      const lowStock = stockLevels.filter(
        (level: StockLevel) => level.current_quantity <= level.reorder_level
      );
      setLowStockItems(lowStock);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  if (isLoading || !metrics) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="space-y-0 pb-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const metricCards = [
    {
      title: 'Total Items',
      value: metrics.total_items,
      description: 'Active inventory items',
      icon: Package,
      color: 'text-blue-600'
    },
    {
      title: 'Storage Locations',
      value: metrics.total_locations,
      description: 'Warehouse locations',
      icon: Warehouse,
      color: 'text-green-600'
    },
    {
      title: 'Low Stock Items',
      value: metrics.low_stock_items,
      description: 'Below reorder level',
      icon: AlertTriangle,
      color: 'text-red-600'
    },
    {
      title: 'Recent Movements',
      value: metrics.recent_movements,
      description: 'Last 7 days',
      icon: TrendingUp,
      color: 'text-purple-600'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Metrics Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((metric, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.title}
              </CardTitle>
              <metric.icon className={`h-4 w-4 ${metric.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-xs text-muted-foreground">
                {metric.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Low Stock Alert
            </CardTitle>
            <CardDescription>
              Items that are at or below their reorder level
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowStockItems.slice(0, 5).map((item: StockLevel, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.item_name}</span>
                      <Badge variant="outline" className="text-xs">
                        {item.item_sku}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Location: {item.location_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-red-600">
                      {item.current_quantity} {item.unit_of_measure}
                    </div>
                    <p className="text-xs text-gray-500">
                      Reorder at: {item.reorder_level}
                    </p>
                  </div>
                </div>
              ))}
              {lowStockItems.length > 5 && (
                <p className="text-center text-sm text-gray-500 pt-2">
                  And {lowStockItems.length - 5} more items...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Status */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>
              Current system health and information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Database Status</span>
                <Badge className="bg-green-100 text-green-800">Connected</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">API Status</span>
                <Badge className="bg-green-100 text-green-800">Operational</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Last Data Sync</span>
                <span className="text-sm text-gray-600">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common inventory operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                📦 Navigate to Operations tab to:
              </p>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Receive new stock</li>
                <li>• Issue items to customers</li>
                <li>• Transfer between locations</li>
                <li>• Adjust inventory levels</li>
                <li>• Produce manufactured items</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}