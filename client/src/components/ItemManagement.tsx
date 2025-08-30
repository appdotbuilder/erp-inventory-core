import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Package, Wrench } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Item, CreateItemInput, UpdateItemInput } from '../../../server/src/schema';

export function ItemManagement() {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateItemInput>({
    name: '',
    sku: '',
    description: null,
    unit_of_measure: '',
    is_manufactured: false,
    reorder_level: 0,
    cost_price: 0,
    sale_price: 0
  });

  const loadItems = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getItems.query();
      setItems(result);
    } catch (error) {
      console.error('Failed to load items:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const resetForm = () => {
    setFormData({
      name: '',
      sku: '',
      description: null,
      unit_of_measure: '',
      is_manufactured: false,
      reorder_level: 0,
      cost_price: 0,
      sale_price: 0
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const newItem = await trpc.createItem.mutate(formData);
      setItems((prev: Item[]) => [...prev, newItem]);
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setIsLoading(true);
    try {
      const updateData: UpdateItemInput = {
        id: editingItem.id,
        ...formData
      };
      const updatedItem = await trpc.updateItem.mutate(updateData);
      setItems((prev: Item[]) => 
        prev.map((item: Item) => item.id === editingItem.id ? updatedItem : item)
      );
      setEditingItem(null);
      resetForm();
    } catch (error) {
      console.error('Failed to update item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    setIsLoading(true);
    try {
      await trpc.deleteItem.mutate({ id });
      setItems((prev: Item[]) => prev.filter((item: Item) => item.id !== id));
    } catch (error) {
      console.error('Failed to delete item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startEdit = (item: Item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      sku: item.sku,
      description: item.description,
      unit_of_measure: item.unit_of_measure,
      is_manufactured: item.is_manufactured,
      reorder_level: item.reorder_level,
      cost_price: item.cost_price,
      sale_price: item.sale_price
    });
  };

  const ItemForm = ({ onSubmit, submitLabel }: { onSubmit: (e: React.FormEvent) => void; submitLabel: string }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Item Name *</Label>
          <Input
            id="name"
            placeholder="Enter item name"
            value={formData.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreateItemInput) => ({ ...prev, name: e.target.value }))
            }
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sku">SKU *</Label>
          <Input
            id="sku"
            placeholder="Enter SKU"
            value={formData.sku}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreateItemInput) => ({ ...prev, sku: e.target.value }))
            }
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Enter item description"
          value={formData.description || ''}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setFormData((prev: CreateItemInput) => ({ 
              ...prev, 
              description: e.target.value || null 
            }))
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="unit_of_measure">Unit of Measure *</Label>
          <Input
            id="unit_of_measure"
            placeholder="e.g., pcs, kg, lbs"
            value={formData.unit_of_measure}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreateItemInput) => ({ ...prev, unit_of_measure: e.target.value }))
            }
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reorder_level">Reorder Level</Label>
          <Input
            id="reorder_level"
            type="number"
            placeholder="0"
            value={formData.reorder_level}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreateItemInput) => ({ 
                ...prev, 
                reorder_level: parseInt(e.target.value) || 0 
              }))
            }
            min="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cost_price">Cost Price</Label>
          <Input
            id="cost_price"
            type="number"
            placeholder="0.00"
            value={formData.cost_price}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreateItemInput) => ({ 
                ...prev, 
                cost_price: parseFloat(e.target.value) || 0 
              }))
            }
            step="0.01"
            min="0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sale_price">Sale Price</Label>
          <Input
            id="sale_price"
            type="number"
            placeholder="0.00"
            value={formData.sale_price}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreateItemInput) => ({ 
                ...prev, 
                sale_price: parseFloat(e.target.value) || 0 
              }))
            }
            step="0.01"
            min="0"
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="is_manufactured"
          checked={formData.is_manufactured}
          onCheckedChange={(checked: boolean) =>
            setFormData((prev: CreateItemInput) => ({ ...prev, is_manufactured: checked }))
          }
        />
        <Label htmlFor="is_manufactured">This is a manufactured item</Label>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Item Management</h2>
          <p className="text-muted-foreground">
            Manage your inventory items, products, and raw materials
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Item</DialogTitle>
              <DialogDescription>
                Add a new item to your inventory system
              </DialogDescription>
            </DialogHeader>
            <ItemForm onSubmit={handleCreate} submitLabel="Create Item" />
          </DialogContent>
        </Dialog>
      </div>

      {/* Items List */}
      {isLoading && items.length === 0 ? (
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-1/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No items yet</h3>
            <p className="text-gray-600 mb-4">Get started by creating your first inventory item</p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Item
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {items.map((item: Item) => (
            <Card key={item.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{item.name}</h3>
                      <Badge variant="outline">{item.sku}</Badge>
                      {item.is_manufactured && (
                        <Badge className="bg-purple-100 text-purple-800">
                          <Wrench className="h-3 w-3 mr-1" />
                          Manufactured
                        </Badge>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-gray-600 mb-2">{item.description}</p>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Unit:</span>
                        <span className="ml-1 font-medium">{item.unit_of_measure}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Reorder Level:</span>
                        <span className="ml-1 font-medium">{item.reorder_level}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Cost:</span>
                        <span className="ml-1 font-medium">${item.cost_price.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Sale Price:</span>
                        <span className="ml-1 font-medium">${item.sale_price.toFixed(2)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      Created: {item.created_at.toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Dialog open={editingItem?.id === item.id} onOpenChange={(open) => !open && setEditingItem(null)}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                          <DialogTitle>Edit Item</DialogTitle>
                          <DialogDescription>
                            Update item information
                          </DialogDescription>
                        </DialogHeader>
                        <ItemForm onSubmit={handleUpdate} submitLabel="Update Item" />
                      </DialogContent>
                    </Dialog>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Item</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{item.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(item.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}