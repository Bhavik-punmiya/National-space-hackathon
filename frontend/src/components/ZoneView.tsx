import React from 'react';
import { Zone, Container, Item } from '@/types/storage';

interface ZoneViewProps {
  zone: Zone;
}

export default function ZoneView({ zone }: ZoneViewProps) {
  return (
    <div className="bg-gray-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">{zone.name}</h2>
          <div className="flex gap-2 mt-2">
            <span className="px-3 py-1 text-sm bg-indigo-500 text-white rounded">
              {zone.containers.length} containers
            </span>
            <span className="px-3 py-1 text-sm bg-gray-600 text-gray-200 rounded">
              {zone.items.length} items
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {zone.containers.map(container => (
          <div key={container.id} className="bg-gray-800 rounded-lg p-4 border border-gray-600">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white">{container.name}</h3>
              <span className="px-2 py-1 text-xs bg-indigo-500 text-white rounded">
                {container.type}
              </span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-gray-300">Module</p>
                <p className="font-medium text-white">{container.module_id}</p>
              </div>
              
              <div>
                <p className="text-gray-300">Dimensions</p>
                <p className="font-medium text-white">
                  {container.width_cm} × {container.depth_cm} × {container.height_cm} cm
                </p>
              </div>
              
              <div>
                <p className="text-gray-300">Weight</p>
                <p className="font-medium text-white">
                  {container.currentWeight.toFixed(1)}/{container.maxWeight.toFixed(1)} kg
                </p>
              </div>
              
              <div>
                <p className="text-gray-300">Items</p>
                <p className="font-medium text-white">
                  {zone.items.filter(item => item.containerId === container.id).length} items
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {zone.containers.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <p>No containers in this zone</p>
        </div>
      )}
    </div>
  );
}
