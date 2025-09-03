'use client'

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import ContainerItemViewer3D from '@/components/ContainerItemViewer3D';
import { Package, Box, ArrowLeft, Archive } from 'lucide-react';

interface Container {
  id: string;
  name: string;
  type: string;
  zoneId: string;
  module_id: string;
  width_cm: number;
  depth_cm: number;
  height_cm: number;
  capacity: number;
  start_width: number;
  start_depth: number;
  start_height: number;
  end_width: number;
  end_depth: number;
  end_height: number;
  currentWeight: number;
  maxWeight: number;
}

interface Item {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  containerId: string;
  mass_kg: number;
  width_cm: number;
  depth_cm: number;
  height_cm: number;
  priority: number;
  expiry_date: string;
  preferred_zone: string;
  temp_requirement: string;
  hazardous_class: string;
  maximum_uses: number;
  current_uses: number;
  usage_frequency: number;
  lot_number: string;
  orientation_allowed: boolean;
  tags_id: string[];
  x?: number;
  y?: number;
  z?: number;
}

interface ApiResponse {
  containers: Container[];
  items: Item[];
}

export default function ContainerPage() {
  const params = useParams();
  const [items, setItems] = useState<Item[]>([]);
  const [container, setContainer] = useState<Container | null>(null);
  const [loading, setLoading] = useState(true);

  // Calculate total weight of items in the container
  const calculateTotalWeight = () => {
    return items.reduce((total, item) => total + (item.mass_kg || 0), 0);
  };

  useEffect(() => {
    if (!params?.id) return;
    
    setLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/frontend/placements`)
      .then(response => response.json())
      .then((data: ApiResponse) => {
        const containerItems = data.items.filter(i => i.containerId === params.id);
        setItems(containerItems);
        
        const foundContainer = data.containers.find(c => c.id === params.id);
        setContainer(foundContainer || null);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching placement data:', error);
        setLoading(false);
      });
  }, [params?.id]);

  if (!params?.id) return null;

  return (
    <div className="w-full h-full min-h-screen bg-gray-800 text-gray-100">
      {/* Main content with scroll */}
      <div className="h-screen overflow-y-auto">
        <div className="container mx-auto p-8">
          {/* Header */}
          <div className="sticky top-0 z-20 bg-gray-800 border-b border-gray-700 p-4 rounded-lg shadow-xl mb-8">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-md bg-indigo-500 flex items-center justify-center">
                  <Archive size={18} className="text-white" />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-white">
                  {container?.name || 'Container Details'}
                </h1>
                {container && (
                  <div className="text-sm text-gray-300 ml-4">
                    <span className="bg-indigo-600 px-2 py-1 rounded mr-2">{container.type}</span>
                    <span className="bg-gray-600 px-2 py-1 rounded mr-2">Module: {container.module_id}</span>
                    <span className="bg-gray-600 px-2 py-1 rounded">
                      {calculateTotalWeight().toFixed(1)}/{container.maxWeight.toFixed(1)} kg
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center">
                <div className="text-md px-3 mr-3 py-1 rounded-md bg-gray-700 text-gray-300">
                  {items.length} items
                </div>
                {container && (
                  <Link 
                    href={`/zone/${container.zoneId}`}
                    className="px-4 py-2 mr-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-white transition-colors duration-200"
                  >
                    ← Back to Zone
                  </Link>
                )}
                <Link 
                  href="/"
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-white transition-colors duration-200"
                >
                  <ArrowLeft size={16} className="inline mr-1" /> Back to Map
                </Link>
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
              {items.map(item => (
                <div key={item.id} className="inventory-card bg-gray-700 rounded-xl overflow-hidden border border-gray-600 hover:border-indigo-400 transition-all duration-200 shadow-lg hover:shadow-xl">
                  {/* Header Section */}
                  <div className="p-3 border-b border-gray-600">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h2 className="text-base font-semibold text-white truncate">{item.name}</h2>
                        <p className="text-xs text-gray-400 font-mono">{item.id}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.hazardous_class && item.hazardous_class !== 'NONE' && (
                          <span className="px-2 py-1 text-xs rounded-full font-semibold bg-red-600 text-white">
                            ⚠️ {item.hazardous_class}
                          </span>
                        )}
                        <span className={`priority-badge px-2 py-1 text-xs rounded-full font-semibold flex-shrink-0 ${
                          getPriorityColor(item.priority)
                        }`}>
                          {item.priority}
                        </span>
                      </div>
                    </div>
                    
                    {/* Category Tags */}
                    <div className="flex flex-wrap gap-1">
                      <span className="px-2 py-1 text-xs bg-gray-600 text-gray-200 rounded-md font-medium">
                        {item.category}
                      </span>
                      <span className="px-2 py-1 text-xs bg-gray-500 text-gray-200 rounded-md font-medium">
                        {item.subcategory}
                      </span>
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="p-3 space-y-3">
                    {/* Dimensions and Position - Combined */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-800 rounded-lg p-2">
                        <h3 className="text-xs font-medium text-gray-300 mb-1">Dimensions</h3>
                        <div className="grid grid-cols-3 gap-1 text-center text-xs">
                          <div>
                            <p className="text-gray-400">L</p>
                            <p className="font-semibold text-white">{item.depth_cm}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">W</p>
                            <p className="font-semibold text-white">{item.width_cm}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">H</p>
                            <p className="font-semibold text-white">{item.height_cm}</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-800 rounded-lg p-2">
                        <h3 className="text-xs font-medium text-gray-300 mb-1">Position</h3>
                        <div className="grid grid-cols-3 gap-1 text-center text-xs">
                          <div>
                            <p className="text-gray-400">X</p>
                            <p className="font-semibold text-indigo-300">{item.x?.toFixed(1) || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">Y</p>
                            <p className="font-semibold text-indigo-300">{item.y?.toFixed(1) || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">Z</p>
                            <p className="font-semibold text-indigo-300">{item.z?.toFixed(1) || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Mass, Usage, and Zone - Combined */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-gray-800 rounded-lg p-2 text-center">
                        <h3 className="text-xs font-medium text-gray-300 mb-1">Mass</h3>
                        <p className="text-sm font-bold text-white">{item.mass_kg} kg</p>
                      </div>
                      <div className="bg-gray-800 rounded-lg p-2 text-center">
                        <h3 className="text-xs font-medium text-gray-300 mb-1">Usage</h3>
                        <p className="text-sm font-bold text-green-300">
                          {item.current_uses}/{item.maximum_uses || '∞'}
                        </p>
                      </div>
                      {item.preferred_zone && (
                        <div className="bg-gray-800 rounded-lg p-2 text-center">
                          <h3 className="text-xs font-medium text-gray-300 mb-1">Zone</h3>
                          <p className="text-xs font-semibold text-blue-300">{item.preferred_zone.replace('_', ' ')}</p>
                        </div>
                      )}
                    </div>

                    {/* Additional Info - Compact */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-800 rounded-lg p-2">
                        <h3 className="text-xs font-medium text-gray-300 mb-1">Expires</h3>
                        {item.expiry_date ? (
                          <p className={`text-xs font-semibold ${
                            isNearExpiry(item.expiry_date) ? 'text-red-400' : 'text-green-300'
                          }`}>
                            {new Date(item.expiry_date).toLocaleDateString()}
                          </p>
                        ) : (
                          <p className="text-xs font-semibold text-gray-400">No Expiry</p>
                        )}
                      </div>
                      {item.temp_requirement ? (
                        <div className="bg-gray-800 rounded-lg p-2">
                          <h3 className="text-xs font-medium text-gray-300 mb-1">Temp</h3>
                          <p className="text-xs font-semibold text-cyan-300">{item.temp_requirement}</p>
                        </div>
                      ) : (
                        <div className="bg-gray-800 rounded-lg p-2">
                          <h3 className="text-xs font-medium text-gray-300 mb-1">Temp</h3>
                          <p className="text-xs font-semibold text-gray-400">N/A</p>
                        </div>
                      )}
                    </div>


                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 3D Viewer Section */}
          {container && (
            <div className="bg-gray-700 rounded-lg p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">3D Container View</h2>
                <div className="text-sm text-gray-300">
                  {items.length} items • {calculateTotalWeight().toFixed(1)}/{container.maxWeight.toFixed(1)} kg • {container.width_cm}×{container.depth_cm}×{container.height_cm} cm
                </div>
              </div>
              
              {items.length > 0 ? (
                <div className="h-96 bg-gray-800 rounded-lg overflow-hidden">
                  <ContainerItemViewer3D 
                    items={items}
                    container={container}
                  />
                </div>
              ) : (
                <div className="h-96 bg-gray-800 rounded-lg flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <Package size={48} className="mx-auto mb-4" />
                    <p>No items in this container</p>
                    <p className="text-sm">Items will appear here when placed</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* No Items State */}
          {!loading && items.length === 0 && container && (
            <div className="mt-12 text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-600 flex items-center justify-center">
                <Package size={24} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-300 mb-2">No Items in Container</h3>
              <p className="text-gray-400">This container is currently empty</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getPriorityColor(priority: number) {
  if (priority >= 90) return 'bg-red-600 text-white';
  if (priority >= 75) return 'bg-orange-500 text-white';
  if (priority >= 50) return 'bg-yellow-500 text-yellow-900';
  if (priority >= 25) return 'bg-blue-500 text-white';
  return 'bg-green-500 text-white';
}

interface ExpiryCheck {
  (date: string): boolean;
}

const isNearExpiry: ExpiryCheck = (date) => {
  const expiryDate = new Date(date);
  const today = new Date();
  const daysUntilExpiry = (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  return daysUntilExpiry < 30;
}

