import React from 'react';
import { Container, Item } from '@/types/storage';

interface ContainerViewProps {
  container: Container;
  items: Item[];
}

export default function ContainerView({ container, items }: ContainerViewProps) {
  return (
    <div className="bg-gray-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-white">{container.name}</h2>
          <div className="flex gap-2 mt-1">
            <span className="px-2 py-1 text-xs bg-indigo-500 text-white rounded">
              {container.type}
            </span>
            <span className="px-2 py-1 text-xs bg-gray-600 text-gray-200 rounded">
              {container.module_id}
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className="px-3 py-1 text-sm bg-indigo-500 text-white rounded-full">
            {items.length} items
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-300">Dimensions</p>
            <p className="font-medium text-white">
              {container.width_cm}w × {container.depth_cm}d × {container.height_cm}h
            </p>
          </div>
          <div>
            <p className="text-gray-300">Weight</p>
            <p className="font-medium text-white">
              {container.currentWeight.toFixed(1)}/{container.maxWeight.toFixed(1)} kg
            </p>
          </div>
        </div>

        {/* Items List */}
        {items.length > 0 ? (
          <div>
            <p className="text-gray-300 mb-2">Items:</p>
            <div className="space-y-2">
              {items.map(item => (
                <div key={item.id} className="bg-gray-800 p-3 rounded">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-white">{item.name}</h3>
                      <div className="flex gap-2 mt-1">
                        <span className="px-2 py-1 text-xs bg-blue-500 text-white rounded">
                          {item.category}
                        </span>
                        <span className="px-2 py-1 text-xs bg-gray-600 text-gray-200 rounded">
                          {item.subcategory}
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-white">{item.mass_kg} kg</p>
                      <p className="text-gray-300">P{item.priority}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-400">
            <p>No items in this container</p>
          </div>
        )}
      </div>
    </div>
  );
}
