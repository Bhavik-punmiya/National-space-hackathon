"use client";

import { useState, useEffect, useRef, ChangeEvent } from 'react';
import Link from 'next/link';
import { Plus, Upload, ChevronDown, Send, Package, ArrowRightCircle } from 'lucide-react';
import Papa from 'papaparse';
import toast, { Toaster } from 'react-hot-toast';
import ItemsList from '@/components/management/ItemsList';
import AddItemModal from '@/components/management/AddItemModal';
import AddContainerModal from '@/components/management/AddContainerModal';

interface Item {
  item_id: string;
  name: string;
  category: string;
  subcategory: string;
  width_cm: number | null;
  depth_cm: number | null;
  height_cm: number | null;
  mass_kg: number | null;
  priority: number | null;
  expiry_date: string | null;
  usage_limit: string | null;
  preferred_zone: string | null;
  _key?: string;
}

interface Container {
  container_id: string;
  zone: string | null;
  module_id: string;
  width_cm: number | null;
  depth_cm: number | null;
  height_cm: number | null;
  _key?: string;
}

interface DropdownButtonProps {
  label: string;
  icon: React.ReactNode;
  bgColor: string;
  hoverColor: string;
  options: { label: string; onClick: () => void }[];
}

// Add interfaces for placement data
interface PlacementPosition {
  startCoordinates: { width: number; depth: number; height: number };
  endCoordinates: { width: number; depth: number; height: number };
}

interface PlacementItem {
  item_id: string;
  container_id: string;
  position: PlacementPosition;
}

interface RearrangementItem {
  item_id: string;
  fromContainerId: string;
  toContainerId: string;
  position: PlacementPosition;
}

interface PlacementResponse {
  success: boolean;
  placements: PlacementItem[];
  rearrangements: RearrangementItem[];
  error: string | null;
}

function DropdownButton({ label, icon, bgColor, hoverColor, options }: DropdownButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 ${bgColor} ${hoverColor} rounded-lg text-white transition-colors`}
      >
        {icon} {label} <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute z-20 mt-2 w-48 rounded-md shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
            {options.map((option) => (
              <button
                key={option.label}
                onClick={() => {
                  option.onClick();
                  setIsOpen(false);
                }}
                className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                role="menuitem"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ManagementPage() {
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showAddContainerModal, setShowAddContainerModal] = useState(false);
  const [listView, setListView] = useState<'items' | 'containers'>('items');

  // Initialize with empty arrays
  const [items, setItems] = useState<Item[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);

  const [isLoadingPlacement, setIsLoadingPlacement] = useState(false);
  const [placementStatus, setPlacementStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Add state for placement response
  const [placementResponse, setPlacementResponse] = useState<PlacementResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'setup' | 'placements' | 'rearrangements'>('setup');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const itemCsvInputRef = useRef<HTMLInputElement>(null);
  const containerCsvInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>,
    type: 'item' | 'container'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const loadingToast = toast.loading(`Parsing ${type} CSV file...`, {
      duration: Infinity // Prevent auto-dismissing
    });

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        console.log(`Parsed ${type} CSV:`, results.data);
        if (type === 'item') {
          processItemCsvData(results.data as any[]);
        } else {
          processContainerCsvData(results.data as any[]);
        }
        if (event.target) {
          event.target.value = '';
        }
        toast.dismiss(loadingToast);
        toast.success(`Successfully imported ${type}s from CSV`);
      },
      error: (error: any) => {
        console.error(`Error parsing ${type} CSV:`, error);
        toast.dismiss(loadingToast);
        toast.error(`Error parsing ${type} CSV: ${error.message}`);
        if (event.target) {
          event.target.value = '';
        }
      },
    });
  };

  const processItemCsvData = (data: Record<string, string>[]) => {
    const newItems: Item[] = data.map((row, index) => ({
      _key: `csv-${Date.now()}-${index}`,
      item_id: row['item_id'] || `generated-${Date.now()}-${index}`,
      name: row['name'] || 'Unnamed Item',
      category: row['category'] || 'Unknown',
      subcategory: row['subcategory'] || 'Unknown',
      width_cm: parseFloat(row['width_cm']) || null,
      depth_cm: parseFloat(row['depth_cm']) || null,
      height_cm: parseFloat(row['height_cm']) || null,
      mass_kg: parseFloat(row['mass_kg']) || null,
      priority: parseInt(row['priority'], 10) || null,
      expiry_date: row['expiry_date'] && row['expiry_date'].toUpperCase() !== 'N/A' ? new Date(row['expiry_date']).toISOString() : null,
      usage_limit: row['usage_limit'] ? String(row['usage_limit']) : null,
      preferred_zone: row['preferred_zone'] || null,
    })).filter(item => item.name !== 'Unnamed Item');

    // Ensure usage_limit is always a string in the state
    const processedItems = newItems.map(item => ({
      ...item,
      usage_limit: item.usage_limit ? String(item.usage_limit) : null
    }));
    setItems(prevItems => [...prevItems, ...processedItems]);
    toast.success(`Added ${newItems.length} items`);
  };

  const processContainerCsvData = (data: Record<string, string>[]) => {
    const newContainers: Container[] = data.map((row, index) => ({
      _key: `csv-cont-${Date.now()}-${index}`,
      container_id: row['container_id'] || `generated-cont-${Date.now()}-${index}`,
      zone: row['zone'] || 'Default Zone',
      module_id: row['module_id'] || 'M1',
      width_cm: parseFloat(row['width_cm']) || null,
      depth_cm: parseFloat(row['depth_cm']) || null,
      height_cm: parseFloat(row['height_cm']) || null,
    })).filter(cont => cont.zone !== 'Default Zone');

    setContainers(prevContainers => [...prevContainers, ...newContainers]);
    toast.success(`Added ${newContainers.length} containers`);
  };

  const handleAddItemManually = (newItem: Omit<Item, '_key'>) => {
    // Format the date as ISO string if it exists
    const formattedItem = {
      ...newItem,
      expiry_date: newItem.expiry_date ? new Date(newItem.expiry_date).toISOString() : null,
      usage_limit: newItem.usage_limit ? String(newItem.usage_limit) : null,
    };
    
    setItems(prevItems => [...prevItems, { ...formattedItem, _key: `manual-${Date.now()}` }]);
    toast.success(`Added item: ${newItem.name}`);
  };

  const handleAddContainerManually = (newContainer: Omit<Container, '_key'>) => {
    // Ensure all numerical values are proper numbers, not strings
    const formattedContainer = {
      ...newContainer,
      width_cm: typeof newContainer.width_cm === 'string' ? parseFloat(newContainer.width_cm) : newContainer.width_cm,
      depth_cm: typeof newContainer.depth_cm === 'string' ? parseFloat(newContainer.depth_cm) : newContainer.depth_cm,
      height_cm: typeof newContainer.height_cm === 'string' ? parseFloat(newContainer.height_cm) : newContainer.height_cm,
    };
    
    setContainers(prevContainers => [...prevContainers, { ...formattedContainer, _key: `manual-cont-${Date.now()}` }]);
    toast.success(`Added container: ${newContainer.container_id}`);
  };

  const handlePlacement = async () => {
    setIsLoadingPlacement(true);
    setPlacementStatus(null);
    const batchSize = 2000;
    let processedItems: Item[] = [];
    let remainingItems = [...items];

    // Show loading toast that persists until explicitly dismissed
    const loadingToast = toast.loading('Calculating optimal placement...', {
      duration: Infinity // This will prevent the toast from auto-dismissing
    });

    try {
      while (remainingItems.length > 0) {
        const batch = remainingItems.slice(0, batchSize);
        remainingItems = remainingItems.slice(batchSize);

        // Ensure all items have properly formatted data
        const formattedItems = batch.map(item => ({
          item_id: item.item_id,
          name: item.name,
          category: item.category,
          subcategory: item.subcategory,
          width_cm: Number(item.width_cm),
          depth_cm: Number(item.depth_cm),
          height_cm: Number(item.height_cm),
          mass_kg: Number(item.mass_kg),
          priority: Number(item.priority),
          // Format date with Z timezone indicator
          expiry_date: item.expiry_date ? item.expiry_date.endsWith('Z') ? item.expiry_date : `${new Date(item.expiry_date).toISOString().split('.')[0]}Z` : null,
          usage_limit: item.usage_limit ? String(item.usage_limit) : null,
          preferred_zone: item.preferred_zone,
        })).filter(item => 
          item.item_id && 
          item.name && 
          !isNaN(item.width_cm) && 
          !isNaN(item.depth_cm) && 
          !isNaN(item.height_cm) && 
          !isNaN(item.mass_kg) && 
          !isNaN(item.priority)
        );

        // Ensure all containers have properly formatted data
        const formattedContainers = containers.map(cont => ({
          container_id: cont.container_id,
          zone: cont.zone,
          module_id: cont.module_id,
          width_cm: Number(cont.width_cm),
          depth_cm: Number(cont.depth_cm),
          height_cm: Number(cont.height_cm),
        })).filter(cont => 
          cont.container_id && 
          cont.zone && 
          !isNaN(cont.width_cm) && 
          !isNaN(cont.depth_cm) && 
          !isNaN(cont.height_cm)
        );

        const apiPayload = {
          items: formattedItems,
          containers: formattedContainers,
        };

        console.log("Sending to Placement API (Batch):", JSON.stringify(apiPayload, null, 2));
        console.log("Sample usage_limit values:", formattedItems.slice(0, 3).map(item => ({ item_id: item.item_id, usage_limit: item.usage_limit, type: typeof item.usage_limit })));

        const apiUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8000';
        const response = await fetch(`${apiUrl}/api/placement`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(apiPayload),
        });

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`API Error ${response.status}: ${errorData}`);
        }

        const result = await response.json();
        console.log('Placement API Success (Batch):', result);
        processedItems = [...processedItems, ...batch];
        
        // Store the placement response
        setPlacementResponse(result);
        // Switch to placements tab
        setActiveTab('placements');
      }
      
      // Dismiss loading toast and show success toast
      toast.dismiss(loadingToast);
      toast.success(`Placement calculated successfully for ${processedItems.length} items!`);
      
      setPlacementStatus({ type: 'success', message: 'Placement calculated successfully for all batches!' });
    } catch (error: any) {
      // Dismiss loading toast and show error toast
      toast.dismiss(loadingToast);
      toast.error(`Placement failed: ${error.message}`);
      
      console.error('Placement API Failed:', error);
      setPlacementStatus({ type: 'error', message: `Placement failed: ${error.message}` });
    } finally {
      setIsLoadingPlacement(false);
    }
  };

  // Helper function to format position coordinates
  const formatPosition = (position: PlacementPosition) => {
    const { startCoordinates, endCoordinates } = position;
    return `${startCoordinates.width}x${startCoordinates.depth}x${startCoordinates.height} → ${endCoordinates.width}x${endCoordinates.depth}x${endCoordinates.height}`;
  };

  // Get paginated data for current view
  const getPaginatedData = () => {
    if (!placementResponse) return [];
    
    const data = activeTab === 'placements' 
      ? placementResponse.placements 
      : placementResponse.rearrangements;
    
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    
    return data.slice(startIdx, endIdx);
  };

  // Get total pages for pagination
  const getTotalPages = () => {
    if (!placementResponse) return 1;
    
    const totalItems = activeTab === 'placements' 
      ? placementResponse.placements.length 
      : placementResponse.rearrangements.length;
    
    return Math.ceil(totalItems / itemsPerPage);
  };

  return (
    <div className="w-full h-full min-h-[100vh] bg-gray-800 text-gray-100 rounded-lg shadow-xl overflow-hidden">
      {/* Toaster for notifications */}
      {/* <Toaster
        position="top-right"
        toastOptions={{
          success: {
            style: {
              background: '#1E40AF',
              color: 'white',
            },
          },
          error: {
            style: {
              background: '#991B1B',
              color: 'white',
            },
          },
          loading: {
            style: {
              background: '#374151',
              color: 'white',
            },
          },
        }}
      /> */}

      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={itemCsvInputRef}
        style={{ display: 'none' }}
        accept=".csv"
        onChange={(e) => handleFileChange(e, 'item')}
      />
      <input
        type="file"
        ref={containerCsvInputRef}
        style={{ display: 'none' }}
        accept=".csv"
        onChange={(e) => handleFileChange(e, 'container')}
      />

      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-md bg-blue-600 flex items-center justify-center">
            <Package size={20} className="text-white" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Inventory Management System
          </h2>
        </div>
        <div className="text-md px-3 mr-2 py-1 rounded-md bg-gray-700 text-gray-300">
          {items.length} items / {containers.length} containers
        </div>
      </div>

      {/* Main content */}
      <div className="p-6">
        {/* Tabs Navigation */}
        <div className="flex border-b border-gray-700 mb-6">
          <button
            onClick={() => setActiveTab('setup')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'setup'
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Inventory Setup
          </button>
          <button
            onClick={() => setActiveTab('placements')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'placements'
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-gray-300'
            }`}
            disabled={!placementResponse}
          >
            Placements ({placementResponse?.placements.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('rearrangements')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'rearrangements'
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-gray-300'
            }`}
            disabled={!placementResponse}
          >
            Rearrangements ({placementResponse?.rearrangements.length || 0})
          </button>
        </div>

        {activeTab === 'setup' && (
          <>
            <div className="flex justify-between items-center mb-6">
              <div className="space-x-2">
                <button
                  className={`px-4 py-2 rounded-md ${
                    listView === 'items'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  onClick={() => setListView('items')}
                >
                  Items
                </button>
                <button
                  className={`px-4 py-2 rounded-md ${
                    listView === 'containers'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  onClick={() => setListView('containers')}
                >
                  Containers
                </button>
              </div>

              <div className="flex space-x-2">
                <DropdownButton
                  label="Add"
                  icon={<Plus className="h-4 w-4" />}
                  bgColor="bg-green-600"
                  hoverColor="hover:bg-green-700"
                  options={[
                    { label: 'Add Item Manually', onClick: () => setShowAddItemModal(true) },
                    { label: 'Add Container Manually', onClick: () => setShowAddContainerModal(true) },
                  ]}
                />

                <DropdownButton
                  label="Import"
                  icon={<Upload className="h-4 w-4" />}
                  bgColor="bg-purple-600"
                  hoverColor="hover:bg-purple-700"
                  options={[
                    { label: 'Import Items from CSV', onClick: () => itemCsvInputRef.current?.click() },
                    { label: 'Import Containers from CSV', onClick: () => containerCsvInputRef.current?.click() },
                  ]}
                />

                <button
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
                  onClick={handlePlacement}
                  disabled={isLoadingPlacement || items.length === 0 || containers.length === 0}
                >
                  <Send className="h-4 w-4" /> Calculate Placement
                </button>
              </div>
            </div>

            {/* Display items or containers based on the selected view */}
            <ItemsList
              items={listView === 'items' ? items : containers}
              type={listView}
              onDelete={(itemKey) => {
                if (listView === 'items') {
                  setItems(items.filter(item => item._key !== itemKey));
                } else {
                  setContainers(containers.filter(container => container._key !== itemKey));
                }
              }}
            />

            {/* Status message */}
            {placementStatus && (
              <div className={`mt-4 p-3 rounded-md ${placementStatus.type === 'success' ? 'bg-green-800' : 'bg-red-800'}`}>
                {placementStatus.message}
              </div>
            )}
          </>
        )}

        {/* Placements View */}
        {activeTab === 'placements' && placementResponse && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Placement Details</h3>
            
            <div className="overflow-x-auto bg-gray-700 rounded-lg">
              <table className="min-w-full divide-y divide-gray-600">
                <thead className="bg-gray-600">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Step</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Item</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Container</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Position</th>
                  </tr>
                </thead>
                <tbody className="bg-gray-700 divide-y divide-gray-600">
                                     {(getPaginatedData() as PlacementItem[]).map((placement, index) => (
                     <tr key={`${placement.item_id}-${index}`} className="hover:bg-gray-650">
                       <td className="px-4 py-3 text-sm font-medium text-white">
                         {(currentPage - 1) * itemsPerPage + index + 1}
                       </td>
                       <td className="px-4 py-3 text-sm font-medium">
                         <span className="px-2 py-1 bg-gray-600 text-gray-200 text-xs font-mono rounded">
                           {placement.item_id}
                         </span>
                       </td>
                       <td className="px-4 py-3 text-sm">
                         <span className="px-2 py-1 bg-blue-600 text-gray-200 text-xs font-mono rounded">
                           {placement.container_id}
                         </span>
                       </td>
                      <td className="px-4 py-3 text-sm text-gray-300 font-mono">
                        {formatPosition(placement.position)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {getTotalPages() > 1 && (
              <div className="flex justify-center mt-4 space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 bg-gray-700 rounded-md disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-3 py-1 bg-gray-700 rounded-md">
                  {currentPage} of {getTotalPages()}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, getTotalPages()))}
                  disabled={currentPage === getTotalPages()}
                  className="px-3 py-1 bg-gray-700 rounded-md disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* Rearrangements View */}
        {activeTab === 'rearrangements' && placementResponse && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Rearrangements Details</h3>
            
            {placementResponse.rearrangements.length === 0 ? (
              <div className="bg-gray-700 p-4 rounded-lg text-gray-300">
                No rearrangements needed.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto bg-gray-700 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-600">
                    <thead className="bg-gray-600">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Step</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Item</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">From Container</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">To Container</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Position</th>
                      </tr>
                    </thead>
                    <tbody className="bg-gray-700 divide-y divide-gray-600">
                                             {(getPaginatedData() as RearrangementItem[]).map((rearrangement, index) => (
                         <tr key={`${rearrangement.item_id}-${index}`} className="hover:bg-gray-650">
                           <td className="px-4 py-3 text-sm font-medium text-white">
                             {(currentPage - 1) * itemsPerPage + index + 1}
                           </td>
                           <td className="px-4 py-3 text-sm font-medium">
                             <span className="px-2 py-1 bg-gray-600 text-gray-200 text-xs font-mono rounded">
                               {rearrangement.item_id}
                             </span>
                           </td>
                          <td className="px-4 py-3 text-sm">
                            <span className="px-2 py-1 bg-purple-600 text-gray-200 text-xs font-mono rounded">
                              {rearrangement.fromContainerId}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className="px-2 py-1 bg-blue-600 text-gray-200 text-xs font-mono rounded">
                              {rearrangement.toContainerId}
                            </span>
                            <ArrowRightCircle className="inline ml-1 h-4 w-4" />
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-300 font-mono">
                            {formatPosition(rearrangement.position)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {getTotalPages() > 1 && (
                  <div className="flex justify-center mt-4 space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 bg-gray-700 rounded-md disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1 bg-gray-700 rounded-md">
                      {currentPage} of {getTotalPages()}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, getTotalPages()))}
                      disabled={currentPage === getTotalPages()}
                      className="px-3 py-1 bg-gray-700 rounded-md disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Modals */}
        {showAddItemModal && (
          <AddItemModal
            onClose={() => setShowAddItemModal(false)}
            onSubmit={handleAddItemManually}
          />
        )}
        {showAddContainerModal && (
          <AddContainerModal
            onClose={() => setShowAddContainerModal(false)}
            onSubmit={handleAddContainerManually}
          />
        )}
      </div>
    </div>
  );
}