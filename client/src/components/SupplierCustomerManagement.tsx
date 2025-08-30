import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Truck, Users, Mail, Phone, User } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Supplier, Customer, CreateSupplierInput, CreateCustomerInput, UpdateSupplierInput, UpdateCustomerInput } from '../../../server/src/schema';

export function SupplierCustomerManagement() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateSupplierDialogOpen, setIsCreateSupplierDialogOpen] = useState(false);
  const [isCreateCustomerDialogOpen, setIsCreateCustomerDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form states
  const [supplierFormData, setSupplierFormData] = useState<CreateSupplierInput>({
    name: '',
    contact_person: null,
    email: null,
    phone: null
  });

  const [customerFormData, setCustomerFormData] = useState<CreateCustomerInput>({
    name: '',
    contact_person: null,
    email: null,
    phone: null
  });

  const loadSuppliers = useCallback(async () => {
    try {
      const result = await trpc.getSuppliers.query();
      setSuppliers(result);
    } catch (error) {
      console.error('Failed to load suppliers:', error);
    }
  }, []);

  const loadCustomers = useCallback(async () => {
    try {
      const result = await trpc.getCustomers.query();
      setCustomers(result);
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([loadSuppliers(), loadCustomers()]).finally(() => {
      setIsLoading(false);
    });
  }, [loadSuppliers, loadCustomers]);

  const resetSupplierForm = () => {
    setSupplierFormData({
      name: '',
      contact_person: null,
      email: null,
      phone: null
    });
  };

  const resetCustomerForm = () => {
    setCustomerFormData({
      name: '',
      contact_person: null,
      email: null,
      phone: null
    });
  };

  // Supplier handlers
  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const newSupplier = await trpc.createSupplier.mutate(supplierFormData);
      setSuppliers((prev: Supplier[]) => [...prev, newSupplier]);
      setIsCreateSupplierDialogOpen(false);
      resetSupplierForm();
    } catch (error) {
      console.error('Failed to create supplier:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;

    setIsLoading(true);
    try {
      const updateData: UpdateSupplierInput = {
        id: editingSupplier.id,
        ...supplierFormData
      };
      const updatedSupplier = await trpc.updateSupplier.mutate(updateData);
      setSuppliers((prev: Supplier[]) => 
        prev.map((supplier: Supplier) => supplier.id === editingSupplier.id ? updatedSupplier : supplier)
      );
      setEditingSupplier(null);
      resetSupplierForm();
    } catch (error) {
      console.error('Failed to update supplier:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSupplier = async (id: number) => {
    setIsLoading(true);
    try {
      await trpc.deleteSupplier.mutate({ id });
      setSuppliers((prev: Supplier[]) => prev.filter((supplier: Supplier) => supplier.id !== id));
    } catch (error) {
      console.error('Failed to delete supplier:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Customer handlers
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const newCustomer = await trpc.createCustomer.mutate(customerFormData);
      setCustomers((prev: Customer[]) => [...prev, newCustomer]);
      setIsCreateCustomerDialogOpen(false);
      resetCustomerForm();
    } catch (error) {
      console.error('Failed to create customer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    setIsLoading(true);
    try {
      const updateData: UpdateCustomerInput = {
        id: editingCustomer.id,
        ...customerFormData
      };
      const updatedCustomer = await trpc.updateCustomer.mutate(updateData);
      setCustomers((prev: Customer[]) => 
        prev.map((customer: Customer) => customer.id === editingCustomer.id ? updatedCustomer : customer)
      );
      setEditingCustomer(null);
      resetCustomerForm();
    } catch (error) {
      console.error('Failed to update customer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCustomer = async (id: number) => {
    setIsLoading(true);
    try {
      await trpc.deleteCustomer.mutate({ id });
      setCustomers((prev: Customer[]) => prev.filter((customer: Customer) => customer.id !== id));
    } catch (error) {
      console.error('Failed to delete customer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setSupplierFormData({
      name: supplier.name,
      contact_person: supplier.contact_person,
      email: supplier.email,
      phone: supplier.phone
    });
  };

  const startEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setCustomerFormData({
      name: customer.name,
      contact_person: customer.contact_person,
      email: customer.email,
      phone: customer.phone
    });
  };

  const SupplierForm = ({ onSubmit, submitLabel }: { onSubmit: (e: React.FormEvent) => void; submitLabel: string }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="supplier-name">Supplier Name *</Label>
        <Input
          id="supplier-name"
          placeholder="Enter supplier name"
          value={supplierFormData.name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setSupplierFormData((prev: CreateSupplierInput) => ({ ...prev, name: e.target.value }))
          }
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="supplier-contact">Contact Person</Label>
        <Input
          id="supplier-contact"
          placeholder="Enter contact person name"
          value={supplierFormData.contact_person || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setSupplierFormData((prev: CreateSupplierInput) => ({ 
              ...prev, 
              contact_person: e.target.value || null 
            }))
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="supplier-email">Email</Label>
          <Input
            id="supplier-email"
            type="email"
            placeholder="Enter email address"
            value={supplierFormData.email || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSupplierFormData((prev: CreateSupplierInput) => ({ 
                ...prev, 
                email: e.target.value || null 
              }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="supplier-phone">Phone</Label>
          <Input
            id="supplier-phone"
            placeholder="Enter phone number"
            value={supplierFormData.phone || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSupplierFormData((prev: CreateSupplierInput) => ({ 
                ...prev, 
                phone: e.target.value || null 
              }))
            }
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );

  const CustomerForm = ({ onSubmit, submitLabel }: { onSubmit: (e: React.FormEvent) => void; submitLabel: string }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="customer-name">Customer Name *</Label>
        <Input
          id="customer-name"
          placeholder="Enter customer name"
          value={customerFormData.name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setCustomerFormData((prev: CreateCustomerInput) => ({ ...prev, name: e.target.value }))
          }
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="customer-contact">Contact Person</Label>
        <Input
          id="customer-contact"
          placeholder="Enter contact person name"
          value={customerFormData.contact_person || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setCustomerFormData((prev: CreateCustomerInput) => ({ 
              ...prev, 
              contact_person: e.target.value || null 
            }))
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="customer-email">Email</Label>
          <Input
            id="customer-email"
            type="email"
            placeholder="Enter email address"
            value={customerFormData.email || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setCustomerFormData((prev: CreateCustomerInput) => ({ 
                ...prev, 
                email: e.target.value || null 
              }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customer-phone">Phone</Label>
          <Input
            id="customer-phone"
            placeholder="Enter phone number"
            value={customerFormData.phone || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setCustomerFormData((prev: CreateCustomerInput) => ({ 
                ...prev, 
                phone: e.target.value || null 
              }))
            }
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );

  const ContactCard = ({ 
    contact, 
    icon, 
    onEdit, 
    onDelete 
  }: { 
    contact: Supplier | Customer; 
    icon: React.ReactNode;
    onEdit: () => void;
    onDelete: () => void;
  }) => (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle className="text-lg">{contact.name}</CardTitle>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Contact</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{contact.name}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDelete}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {contact.contact_person && (
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-gray-500" />
            <span>{contact.contact_person}</span>
          </div>
        )}
        {contact.email && (
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-gray-500" />
            <span>{contact.email}</span>
          </div>
        )}
        {contact.phone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-gray-500" />
            <span>{contact.phone}</span>
          </div>
        )}
        <p className="text-xs text-gray-400 mt-3">
          Created: {contact.created_at.toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Supplier & Customer Management</h2>
        <p className="text-muted-foreground">
          Manage your business contacts and relationships
        </p>
      </div>

      <Tabs defaultValue="suppliers" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="suppliers" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Suppliers
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Customers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="suppliers" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Suppliers</h3>
              <p className="text-sm text-muted-foreground">
                Manage your supplier relationships
              </p>
            </div>
            <Dialog open={isCreateSupplierDialogOpen} onOpenChange={setIsCreateSupplierDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Supplier
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create New Supplier</DialogTitle>
                  <DialogDescription>
                    Add a new supplier to your system
                  </DialogDescription>
                </DialogHeader>
                <SupplierForm onSubmit={handleCreateSupplier} submitLabel="Create Supplier" />
              </DialogContent>
            </Dialog>
          </div>

          {suppliers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Truck className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No suppliers yet</h3>
                <p className="text-gray-600 mb-4">Add your first supplier to start managing purchases</p>
                <Button onClick={() => setIsCreateSupplierDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Supplier
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {suppliers.map((supplier: Supplier) => (
                <ContactCard
                  key={supplier.id}
                  contact={supplier}
                  icon={<Truck className="h-5 w-5 text-blue-600" />}
                  onEdit={() => startEditSupplier(supplier)}
                  onDelete={() => handleDeleteSupplier(supplier.id)}
                />
              ))}
            </div>
          )}

          <Dialog open={editingSupplier !== null} onOpenChange={(open) => !open && setEditingSupplier(null)}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Edit Supplier</DialogTitle>
                <DialogDescription>
                  Update supplier information
                </DialogDescription>
              </DialogHeader>
              <SupplierForm onSubmit={handleUpdateSupplier} submitLabel="Update Supplier" />
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Customers</h3>
              <p className="text-sm text-muted-foreground">
                Manage your customer relationships
              </p>
            </div>
            <Dialog open={isCreateCustomerDialogOpen} onOpenChange={setIsCreateCustomerDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Customer
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create New Customer</DialogTitle>
                  <DialogDescription>
                    Add a new customer to your system
                  </DialogDescription>
                </DialogHeader>
                <CustomerForm onSubmit={handleCreateCustomer} submitLabel="Create Customer" />
              </DialogContent>
            </Dialog>
          </div>

          {customers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No customers yet</h3>
                <p className="text-gray-600 mb-4">Add your first customer to start managing sales</p>
                <Button onClick={() => setIsCreateCustomerDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Customer
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {customers.map((customer: Customer) => (
                <ContactCard
                  key={customer.id}
                  contact={customer}
                  icon={<Users className="h-5 w-5 text-green-600" />}
                  onEdit={() => startEditCustomer(customer)}
                  onDelete={() => handleDeleteCustomer(customer.id)}
                />
              ))}
            </div>
          )}

          <Dialog open={editingCustomer !== null} onOpenChange={(open) => !open && setEditingCustomer(null)}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Edit Customer</DialogTitle>
                <DialogDescription>
                  Update customer information
                </DialogDescription>
              </DialogHeader>
              <CustomerForm onSubmit={handleUpdateCustomer} submitLabel="Update Customer" />
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}