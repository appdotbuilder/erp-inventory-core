import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Package, Warehouse, Users, TruckIcon, BarChart3 } from 'lucide-react';

// Import components
import { Dashboard } from '@/components/Dashboard';
import { ItemManagement } from '@/components/ItemManagement';
import { LocationManagement } from '@/components/LocationManagement';
import { SupplierCustomerManagement } from '@/components/SupplierCustomerManagement';
import { InventoryOperations } from '@/components/InventoryOperations';
import { StockReporting } from '@/components/StockReporting';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <Package className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">ERP Inventory</h1>
                <p className="text-sm text-gray-600">Comprehensive Inventory Management System</p>
              </div>
            </div>
            <Badge variant="outline" className="text-green-600 border-green-600">
              Live System
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-6">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="items" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Items
            </TabsTrigger>
            <TabsTrigger value="locations" className="flex items-center gap-2">
              <Warehouse className="h-4 w-4" />
              Locations
            </TabsTrigger>
            <TabsTrigger value="contacts" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Contacts
            </TabsTrigger>
            <TabsTrigger value="operations" className="flex items-center gap-2">
              <TruckIcon className="h-4 w-4" />
              Operations
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <Dashboard />
          </TabsContent>

          <TabsContent value="items" className="space-y-6">
            <ItemManagement />
          </TabsContent>

          <TabsContent value="locations" className="space-y-6">
            <LocationManagement />
          </TabsContent>

          <TabsContent value="contacts" className="space-y-6">
            <SupplierCustomerManagement />
          </TabsContent>

          <TabsContent value="operations" className="space-y-6">
            <InventoryOperations />
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <StockReporting />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;