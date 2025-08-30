import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Warehouse } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Location, CreateLocationInput, UpdateLocationInput } from '../../../server/src/schema';

export function LocationManagement() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateLocationInput>({
    name: '',
    description: null
  });

  const loadLocations = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getLocations.query();
      setLocations(result);
    } catch (error) {
      console.error('Failed to load locations:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: null
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const newLocation = await trpc.createLocation.mutate(formData);
      setLocations((prev: Location[]) => [...prev, newLocation]);
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create location:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLocation) return;

    setIsLoading(true);
    try {
      const updateData: UpdateLocationInput = {
        id: editingLocation.id,
        ...formData
      };
      const updatedLocation = await trpc.updateLocation.mutate(updateData);
      setLocations((prev: Location[]) => 
        prev.map((location: Location) => location.id === editingLocation.id ? updatedLocation : location)
      );
      setEditingLocation(null);
      resetForm();
    } catch (error) {
      console.error('Failed to update location:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    setIsLoading(true);
    try {
      await trpc.deleteLocation.mutate({ id });
      setLocations((prev: Location[]) => prev.filter((location: Location) => location.id !== id));
    } catch (error) {
      console.error('Failed to delete location:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startEdit = (location: Location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      description: location.description
    });
  };

  const LocationForm = ({ onSubmit, submitLabel }: { onSubmit: (e: React.FormEvent) => void; submitLabel: string }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Location Name *</Label>
        <Input
          id="name"
          placeholder="Enter location name"
          value={formData.name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: CreateLocationInput) => ({ ...prev, name: e.target.value }))
          }
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Enter location description"
          value={formData.description || ''}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setFormData((prev: CreateLocationInput) => ({ 
              ...prev, 
              description: e.target.value || null 
            }))
          }
        />
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
          <h2 className="text-2xl font-bold tracking-tight">Location Management</h2>
          <p className="text-muted-foreground">
            Manage your warehouse locations and storage areas
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Location
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Location</DialogTitle>
              <DialogDescription>
                Add a new storage location to your warehouse system
              </DialogDescription>
            </DialogHeader>
            <LocationForm onSubmit={handleCreate} submitLabel="Create Location" />
          </DialogContent>
        </Dialog>
      </div>

      {/* Locations List */}
      {isLoading && locations.length === 0 ? (
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                  <div className="h-3 bg-gray-200 rounded w-1/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : locations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Warehouse className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No locations yet</h3>
            <p className="text-gray-600 mb-4">Create your first storage location to start organizing inventory</p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Location
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {locations.map((location: Location) => (
            <Card key={location.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Warehouse className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-lg">{location.name}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Dialog open={editingLocation?.id === location.id} onOpenChange={(open) => !open && setEditingLocation(null)}>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(location)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                          <DialogTitle>Edit Location</DialogTitle>
                          <DialogDescription>
                            Update location information
                          </DialogDescription>
                        </DialogHeader>
                        <LocationForm onSubmit={handleUpdate} submitLabel="Update Location" />
                      </DialogContent>
                    </Dialog>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Location</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{location.name}"? This action cannot be undone and will affect any existing stock records.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(location.id)}
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
              <CardContent className="pt-0">
                {location.description ? (
                  <CardDescription className="mb-3">
                    {location.description}
                  </CardDescription>
                ) : (
                  <CardDescription className="mb-3 italic text-gray-400">
                    No description provided
                  </CardDescription>
                )}
                <p className="text-xs text-gray-400">
                  Created: {location.created_at.toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}