'use client'

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Package, Map } from 'lucide-react';

interface Container {
  id: string;
  name: string;
  type: string;
  zoneId: string;
  module_id: string;
  width_cm: number;
  depth_cm: number;
  height_cm: number;
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
}

interface ApiResponse {
  containers: Container[];
  items: Item[];
}

export default function ZonePage() {
  const params = useParams();
  const [containers, setContainers] = useState<Container[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params?.id) return;

    // Fetch data from API
    setLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/frontend/placements`)
      .then(response => response.json())
      .then((data: ApiResponse) => {
        const zoneContainers = data.containers.filter(c => c.zoneId === params.id);
        setContainers(zoneContainers);
        setItems(data.items);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching placement data:', error);
        setLoading(false);
      });
  }, [params?.id]);

  // Get count of items in a container
  const getItemCount = (containerId: string) => {
    return items.filter(item => item.containerId === containerId).length;
  };

  // Calculate total weight of items in a container
  const getContainerWeight = (containerId: string) => {
    return items
      .filter(item => item.containerId === containerId)
      .reduce((total, item) => total + (item.mass_kg || 0), 0);
  };

  if (!params?.id) return null;

  // Format zone name for display
  const formatZoneName = (zoneId: string) => {
    return zoneId.replace(/_/g, ' ');
  };

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
                  <Map size={18} className="text-white" />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-white">
                  Zone: {formatZoneName(Array.isArray(params.id) ? params.id[0] : params.id)}
                </h1>
                <div className="text-sm text-gray-300 ml-4">
                  <span className="bg-indigo-600 px-2 py-1 rounded mr-2">
                    {containers.length} containers
                  </span>
                  <span className="bg-gray-600 px-2 py-1 rounded">
                    {items.length} total items
                  </span>
                </div>
              </div>
              <div className="flex items-center">
                <div className="text-md px-3 mr-3 py-1 rounded-md bg-gray-700 text-gray-300">
                  {containers.length} containers
                </div>
                <Link 
                  href="/"
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-white transition-colors duration-200"
                >
                  ← Back to Map
                </Link>
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : (
            /* Container Cards Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {containers.map(container => (
                <Link 
                  key={container.id}
                  href={`/container/${container.id}`}
                  className="inventory-card bg-gray-700 hover:bg-gray-600 rounded-xl overflow-hidden transition-all duration-300 border border-gray-600 hover:border-indigo-400 shadow-lg hover:shadow-xl group"
                >
                  {/* Header Section */}
                  <div className="p-3 border-b border-gray-600">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h2 className="text-base font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                          {container.name}
                        </h2>
                        <p className="text-xs text-gray-400 font-mono">{container.id}</p>
                      </div>
                      <span className="px-2 py-1 text-xs bg-indigo-500 text-white rounded-full font-semibold ml-2 flex-shrink-0">
                        {container.type}
                      </span>
                    </div>
                    
                    {/* Type and Module Tags */}
                    <div className="flex flex-wrap gap-1">
                      <span className="px-2 py-1 text-xs bg-indigo-500 text-white rounded-md font-medium">
                        {container.type}
                      </span>
                      <span className="px-2 py-1 text-xs bg-gray-600 text-gray-200 rounded-md font-medium">
                        {container.module_id}
                      </span>
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="p-3 space-y-3">
                    {/* Dimensions and Weight - Combined */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-800 rounded-lg p-2">
                        <h3 className="text-xs font-medium text-gray-300 mb-1">Dimensions</h3>
                        <div className="grid grid-cols-3 gap-1 text-center text-xs">
                          <div>
                            <p className="text-gray-400">W</p>
                            <p className="font-semibold text-white">{container.width_cm}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">D</p>
                            <p className="font-semibold text-white">{container.depth_cm}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">H</p>
                            <p className="font-semibold text-white">{container.height_cm}</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-800 rounded-lg p-2">
                        <h3 className="text-xs font-medium text-gray-300 mb-1">Weight & Items</h3>
                        <div className="space-y-1 text-center">
                          <p className="text-sm font-bold text-white">
                            {getContainerWeight(container.id).toFixed(1)}/{container.maxWeight.toFixed(1)} kg
                          </p>
                          <p className="text-sm font-bold text-green-300">{getItemCount(container.id)} items</p>
                        </div>
                      </div>
                    </div>

                    {/* Action Indicator */}
                    <div className="flex items-center justify-center text-indigo-400 group-hover:text-indigo-300 transition-colors">
                      <Package size={16} className="mr-2" />
                      <span className="text-xs font-medium">View Details</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
