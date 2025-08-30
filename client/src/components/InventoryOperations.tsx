import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Package, TruckIcon, RotateCcw, ArrowRightLeft, Wrench } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Item, Location, Supplier, Customer, ReceiveStockInput, IssueStockInput, AdjustStockInput, TransferStockInput, ProduceItemInput } from '../../../server/src/schema';

export function InventoryOperations() {
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Dialog states
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [produceDialogOpen, setProduceDialogOpen] = useState(false);

  // Form states
  const [receiveForm, setReceiveForm] = useState<ReceiveStockInput>({
    item_id: 0,
    location_id: 0,
    quantity: 0,
    supplier_id: undefined,
    reference: null
  });

  const [issueForm, setIssueForm] = useState<IssueStockInput>({
    item_id: 0,
    location_id: 0,
    quantity: 0,
    customer_id: undefined,
    reference: null
  });

  const [adjustForm, setAdjustForm] = useState<AdjustStockInput>({
    item_id: 0,
    location_id: 0,
    quantity: 0,
    reference: null
  });

  const [transferForm, setTransferForm] = useState<TransferStockInput>({
    item_id: 0,
    from_location_id: 0,
    to_location_id: 0,
    quantity: 0,
    reference: null
  });

  const [produceForm, setProduceForm] = useState<ProduceItemInput>({
    item_id: 0,
    location_id: 0,
    quantity: 0,
    reference: null
  });

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [itemsData, locationsData, suppliersData, customersData] = await Promise.all([
        trpc.getItems.query(),
        trpc.getLocations.query(),
        trpc.getSuppliers.query(),
        trpc.getCustomers.query()
      ]);
      setItems(itemsData);
      setLocations(locationsData);
      setSuppliers(suppliersData);
      setCustomers(customersData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetReceiveForm = () => {
    setReceiveForm({
      item_id: 0,
      location_id: 0,
      quantity: 0,
      supplier_id: undefined,
      reference: null
    });
  };

  const resetIssueForm = () => {
    setIssueForm({
      item_id: 0,
      location_id: 0,
      quantity: 0,
      customer_id: undefined,
      reference: null
    });
  };

  const resetAdjustForm = () => {
    setAdjustForm({
      item_id: 0,
      location_id: 0,
      quantity: 0,
      reference: null
    });
  };

  const resetTransferForm = () => {
    setTransferForm({
      item_id: 0,
      from_location_id: 0,
      to_location_id: 0,
      quantity: 0,
      reference: null
    });
  };

  const resetProduceForm = () => {
    setProduceForm({
      item_id: 0,
      location_id: 0,
      quantity: 0,
      reference: null
    });
  };

  const handleReceiveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await trpc.receiveStock.mutate(receiveForm);
      setReceiveDialogOpen(false);
      resetReceiveForm();
      // Optionally refresh data or show success message
    } catch (error) {
      console.error('Failed to receive stock:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleIssueStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await trpc.issueStock.mutate(issueForm);
      setIssueDialogOpen(false);
      resetIssueForm();
    } catch (error) {
      console.error('Failed to issue stock:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await trpc.adjustStock.mutate(adjustForm);
      setAdjustDialogOpen(false);
      resetAdjustForm();
    } catch (error) {
      console.error('Failed to adjust stock:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransferStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await trpc.transferStock.mutate(transferForm);
      setTransferDialogOpen(false);
      resetTransferForm();
    } catch (error) {
      console.error('Failed to transfer stock:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProduceItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await trpc.produceItem.mutate(produceForm);
      setProduceDialogOpen(false);
      resetProduceForm();
    } catch (error) {
      console.error('Failed to produce item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const manufacturedItems = items.filter((item: Item) => item.is_manufactured);

  const operationCards = [
    {
      title: 'Receive Stock',
      description: 'Record incoming inventory from suppliers',
      icon: <Package className="h-6 w-6 text-green-600" />,
      color: 'border-green-200 hover:border-green-300',
      bgColor: 'bg-green-50',
      action: () => setReceiveDialogOpen(true)
    },
    {
      title: 'Issue Stock',
      description: 'Record outgoing inventory to customers',
      icon: <TruckIcon className="h-6 w-6 text-blue-600" />,
      color: 'border-blue-200 hover:border-blue-300',
      bgColor: 'bg-blue-50',
      action: () => setIssueDialogOpen(true)
    },
    {
      title: 'Adjust Stock',
      description: 'Manually adjust inventory levels',
      icon: <RotateCcw className="h-6 w-6 text-orange-600" />,
      color: 'border-orange-200 hover:border-orange-300',
      bgColor: 'bg-orange-50',
      action: () => setAdjustDialogOpen(true)
    },
    {
      title: 'Transfer Stock',
      description: 'Move items between locations',
      icon: <ArrowRightLeft className="h-6 w-6 text-purple-600" />,
      color: 'border-purple-200 hover:border-purple-300',
      bgColor: 'bg-purple-50',
      action: () => setTransferDialogOpen(true)
    },
    {
      title: 'Produce Items',
      description: 'Manufacture items using Bill of Materials',
      icon: <Wrench className="h-6 w-6 text-red-600" />,
      color: 'border-red-200 hover:border-red-300',
      bgColor: 'bg-red-50',
      action: () => setProduceDialogOpen(true)
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Inventory Operations</h2>
        <p className="text-muted-foreground">
          Perform stock movements and inventory adjustments
        </p>
      </div>

      {/* Operation Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {operationCards.map((op, index) => (
          <Card 
            key={index} 
            className={`cursor-pointer transition-all ${op.color} ${op.bgColor}`}
            onClick={op.action}
          >
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  {op.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg mb-1">{op.title}</h3>
                  <p className="text-sm text-gray-600">{op.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Receive Stock Dialog */}
      <Dialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Receive Stock</DialogTitle>
            <DialogDescription>
              Record incoming inventory from suppliers
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReceiveStock} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Item *</Label>
                <Select 
                  value={receiveForm.item_id.toString()} 
                  onValueChange={(value) => setReceiveForm(prev => ({ ...prev, item_id: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((item: Item) => (
                      <SelectItem key={item.id} value={item.id.toString()}>
                        {item.name} ({item.sku})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Location *</Label>
                <Select 
                  value={receiveForm.location_id.toString()} 
                  onValueChange={(value) => setReceiveForm(prev => ({ ...prev, location_id: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location: Location) => (
                      <SelectItem key={location.id} value={location.id.toString()}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={receiveForm.quantity}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setReceiveForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Supplier</Label>
                <Select 
                  value={receiveForm.supplier_id?.toString() || ''} 
                  onValueChange={(value) => setReceiveForm(prev => ({ 
                    ...prev, 
                    supplier_id: value ? parseInt(value) : undefined 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier: Supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id.toString()}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reference</Label>
              <Input
                placeholder="PO number, delivery note, etc."
                value={receiveForm.reference || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setReceiveForm(prev => ({ ...prev, reference: e.target.value || null }))
                }
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Processing...' : 'Receive Stock'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Issue Stock Dialog */}
      <Dialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Issue Stock</DialogTitle>
            <DialogDescription>
              Record outgoing inventory to customers
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleIssueStock} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Item *</Label>
                <Select 
                  value={issueForm.item_id.toString()} 
                  onValueChange={(value) => setIssueForm(prev => ({ ...prev, item_id: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((item: Item) => (
                      <SelectItem key={item.id} value={item.id.toString()}>
                        {item.name} ({item.sku})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Location *</Label>
                <Select 
                  value={issueForm.location_id.toString()} 
                  onValueChange={(value) => setIssueForm(prev => ({ ...prev, location_id: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location: Location) => (
                      <SelectItem key={location.id} value={location.id.toString()}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={issueForm.quantity}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setIssueForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Customer</Label>
                <Select 
                  value={issueForm.customer_id?.toString() || ''} 
                  onValueChange={(value) => setIssueForm(prev => ({ 
                    ...prev, 
                    customer_id: value ? parseInt(value) : undefined 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer: Customer) => (
                      <SelectItem key={customer.id} value={customer.id.toString()}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reference</Label>
              <Input
                placeholder="Sales order, dispatch note, etc."
                value={issueForm.reference || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setIssueForm(prev => ({ ...prev, reference: e.target.value || null }))
                }
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Processing...' : 'Issue Stock'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Adjust Stock Dialog */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>
              Manually adjust inventory levels (positive for increase, negative for decrease)
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdjustStock} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Item *</Label>
                <Select 
                  value={adjustForm.item_id.toString()} 
                  onValueChange={(value) => setAdjustForm(prev => ({ ...prev, item_id: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((item: Item) => (
                      <SelectItem key={item.id} value={item.id.toString()}>
                        {item.name} ({item.sku})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Location *</Label>
                <Select 
                  value={adjustForm.location_id.toString()} 
                  onValueChange={(value) => setAdjustForm(prev => ({ ...prev, location_id: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location: Location) => (
                      <SelectItem key={location.id} value={location.id.toString()}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Adjustment Quantity *</Label>
              <Input
                type="number"
                step="1"
                placeholder="Positive to increase, negative to decrease"
                value={adjustForm.quantity}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setAdjustForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Reason/Reference *</Label>
              <Input
                placeholder="Reason for adjustment"
                value={adjustForm.reference || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setAdjustForm(prev => ({ ...prev, reference: e.target.value || null }))
                }
                required
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Processing...' : 'Adjust Stock'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transfer Stock Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Transfer Stock</DialogTitle>
            <DialogDescription>
              Move items between locations
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleTransferStock} className="space-y-4">
            <div className="space-y-2">
              <Label>Item *</Label>
              <Select 
                value={transferForm.item_id.toString()} 
                onValueChange={(value) => setTransferForm(prev => ({ ...prev, item_id: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select item" />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item: Item) => (
                    <SelectItem key={item.id} value={item.id.toString()}>
                      {item.name} ({item.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From Location *</Label>
                <Select 
                  value={transferForm.from_location_id.toString()} 
                  onValueChange={(value) => setTransferForm(prev => ({ ...prev, from_location_id: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="From location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location: Location) => (
                      <SelectItem key={location.id} value={location.id.toString()}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>To Location *</Label>
                <Select 
                  value={transferForm.to_location_id.toString()} 
                  onValueChange={(value) => setTransferForm(prev => ({ ...prev, to_location_id: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="To location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location: Location) => (
                      <SelectItem key={location.id} value={location.id.toString()}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Quantity *</Label>
              <Input
                type="number"
                min="1"
                step="1"
                value={transferForm.quantity}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setTransferForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Reference</Label>
              <Input
                placeholder="Transfer note, reason, etc."
                value={transferForm.reference || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setTransferForm(prev => ({ ...prev, reference: e.target.value || null }))
                }
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Processing...' : 'Transfer Stock'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Produce Items Dialog */}
      <Dialog open={produceDialogOpen} onOpenChange={setProduceDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Produce Items</DialogTitle>
            <DialogDescription>
              Manufacture items using Bill of Materials (components will be consumed automatically)
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleProduceItem} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Manufactured Item *</Label>
                <Select 
                  value={produceForm.item_id.toString()} 
                  onValueChange={(value) => setProduceForm(prev => ({ ...prev, item_id: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select manufactured item" />
                  </SelectTrigger>
                  <SelectContent>
                    {manufacturedItems.map((item: Item) => (
                      <SelectItem key={item.id} value={item.id.toString()}>
                        {item.name} ({item.sku})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Production Location *</Label>
                <Select 
                  value={produceForm.location_id.toString()} 
                  onValueChange={(value) => setProduceForm(prev => ({ ...prev, location_id: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location: Location) => (
                      <SelectItem key={location.id} value={location.id.toString()}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Production Quantity *</Label>
              <Input
                type="number"
                min="1"
                step="1"
                value={produceForm.quantity}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setProduceForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Reference</Label>
              <Input
                placeholder="Production order, batch number, etc."
                value={produceForm.reference || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setProduceForm(prev => ({ ...prev, reference: e.target.value || null }))
                }
              />
            </div>

            {manufacturedItems.length === 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  No manufactured items found. Create items with "is_manufactured" flag and define their Bill of Materials first.
                </p>
              </div>
            )}

            <DialogFooter>
              <Button type="submit" disabled={isLoading || manufacturedItems.length === 0}>
                {isLoading ? 'Processing...' : 'Produce Items'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}