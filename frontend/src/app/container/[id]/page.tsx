'use client'

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import StarBackground from '@/components/StarBackground';
import ItemViewer3D from '@/components/ItemViewer3D';

interface Item {
  id: string;
  name: string;
  priority: number;
  category?: string;
  quantity?: number;
  position_start_width: number;
  position_start_depth: number;
  position_start_height: number;
  position_end_width: number;
  position_end_depth: number;
  position_end_height: number;
  mass: number;
  usageCount: number;
  usageLimit: number | null;
  expirationDate: string | null;
  containerId: string;
  preferredZone: string;
  width: number;
  depth: number;
  height: number;
}

export default function ContainerPage() {
  const params = useParams();
  const router = useRouter();
  const [container, setContainer] = useState<any>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params?.id) return;
    
    async function fetchData() {
      setIsLoading(true);
      try {
        const response = await fetch('https://national-space-hackathon-1-91717359690.us-central1.run.app/api/frontend/placements');
        
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        
        // Find the container with the matching ID
        const containerData = data.containers.find((c: any) => c.id === params.id);
        if (!containerData) {
          throw new Error(`Container with ID ${params.id} not found`);
        }
        
        // Default the zone name to "Empty" if it doesn't exist
        if (!containerData.zoneId) {
          containerData.zoneId = "Empty";
        }
        
        // Find all items in this container
        const containerItems = data.items
          .filter((item: any) => item.containerId === params.id)
          .map((item: any) => ({
            ...item,
            category: item.category || "General Equipment",
            quantity: item.quantity || 1,
          }));
        
        setContainer(containerData);
        setItems(containerItems);
        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        setIsLoading(false);
      }
    }

    fetchData();
  }, [params?.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status"></div>
          <p className="mt-4 text-xl">Loading container data...</p>
        </div>
      </div>
    );
  }

  if (error || !container) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <div className="text-center max-w-md mx-auto p-6 bg-gray-900 rounded-xl shadow-xl border border-gray-800">
          <h2 className="text-xl font-bold text-red-500 mb-4">Error Loading Container</h2>
          <p className="mb-4">{error || "Container not found"}</p>
          <button 
            onClick={() => router.push('/iss')} 
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Return to ISS Map
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black">
      <StarBackground />
      
      {/* Main content with scroll */}
      <div className="relative z-10 h-screen overflow-y-auto">
        <div className="container mx-auto p-8">
          <div className="sticky top-0 z-20 backdrop-blur-md bg-black/30 p-4 rounded-lg shadow-xl mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-white">
                  {container.name}
                </h1>
                <p className="text-blue-400">Zone: {container.zoneId || 'Empty'}</p>
              </div>
              <div className="space-x-4">
                <Link 
                  href="/iss"
                  className="px-4 py-2 backdrop-blur-sm bg-white/20 hover:bg-white/30 rounded-lg text-white transition-all"
                >
                  ← Back to Map
                </Link>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="bg-white/10 p-3 rounded-lg">
                <span className="text-gray-400 text-sm">Dimensions</span>
                <p className="text-white font-semibold">
                  {container.width} × {container.depth} × {container.height} cm
                </p>
              </div>
              <div className="bg-white/10 p-3 rounded-lg">
                <span className="text-gray-400 text-sm">Type</span>
                <p className="text-white font-semibold">{container.type || "Standard Container"}</p>
              </div>
              <div className="bg-white/10 p-3 rounded-lg">
                <span className="text-gray-400 text-sm">Items</span>
                <p className="text-white font-semibold">{items.length}</p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
            {items.map(item => (
              <div key={item.id} className="backdrop-blur-md bg-white/10 rounded-lg overflow-hidden border border-white/20">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-white/90">{item.name}</h2>
                    <span className={`px-3 py-1 text-sm rounded-full ${
                      getPriorityColor(item.priority)
                    }`}>
                      Priority {item.priority}
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-white/70">Category</p>
                        <p className="font-medium text-white/90">{item.category}</p>
                      </div>
                      <div>
                        <p className="text-white/70">Quantity</p>
                        <p className="font-medium text-white/90">{item.quantity} units</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-white/70">Position</p>
                      <div className="text-sm bg-white/5 p-2 rounded">
                        <p>Start: ({item.position_start_width}, {item.position_start_depth}, {item.position_start_height})</p>
                        <p>End: ({item.position_end_width}, {item.position_end_depth}, {item.position_end_height})</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-white/70">Mass</p>
                        <p className="font-medium text-white/90">{item.mass} kg</p>
                      </div>
                      <div>
                        <p className="text-white/70">Usage</p>
                        <p className="font-medium text-white/90">
                          {item.usageCount}/{item.usageLimit !== null ? item.usageLimit : '∞'}
                        </p>
                      </div>
                    </div>

                    {item.expirationDate && (
                      <div className="pt-2">
                        <p className="text-white/70">Expiration Date</p>
                        <p className={`font-medium ${
                          isNearExpiry(item.expirationDate) ? 'text-red-400' : 'text-white/90'
                        }`}>
                          {formatDate(item.expirationDate)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 3D Items Viewer */}
          {items.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-white mb-6">
                3D Items Visualization
              </h2>
              <div className="bg-white/5 backdrop-blur-lg rounded-xl p-1">
                <ItemViewer3D items={items} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getPriorityColor(priority: number) {
  const colors = {
    1: 'bg-gray-400 text-gray-900',
    2: 'bg-blue-400 text-blue-900',
    3: 'bg-green-400 text-green-900',
    4: 'bg-yellow-400 text-yellow-900',
    5: 'bg-orange-400 text-orange-900'
  };
  
  if (priority >= 95) return 'bg-red-500 text-white';
  if (priority >= 90) return 'bg-red-400 text-red-900';
  if (priority >= 85) return 'bg-orange-400 text-orange-900';
  if (priority >= 80) return 'bg-yellow-400 text-yellow-900';
  if (priority >= 75) return 'bg-blue-400 text-blue-900';
  return 'bg-green-400 text-green-900';
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  } catch (e) {
    return dateString;
  }
}

function isNearExpiry(dateString: string | null): boolean {
  if (!dateString) return false;
  
  try {
    const expiryDate = new Date(dateString);
    const today = new Date();
    const daysUntilExpiry = (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry < 30;
  } catch (e) {
    return false;
  }
}
