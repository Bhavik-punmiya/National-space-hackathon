'use client'

import { useState } from 'react';

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
}

interface AddItemModalProps {
  onClose: () => void;
  onSubmit: (item: Omit<Item, '_key'>) => void;
}

const ZONES = [
  'Crew Quarters',
  'Storage Bay',
  'Medical Bay',
  'Science Lab',
  'Air Lock',
  'Control Room',
  'Engine Room',
  'Cargo Hold'
];

const CATEGORIES = [
  'Medical Supplies',
  'Food & Water',
  'Tools & Equipment',
  'Electronics',
  'Clothing & Personal',
  'Scientific Instruments',
  'Safety Equipment',
  'Spare Parts'
];

const SUBCATEGORIES = {
  'Medical Supplies': ['Medications', 'First Aid', 'Surgical Tools', 'Diagnostic Equipment'],
  'Food & Water': ['Dehydrated Food', 'Fresh Food', 'Water Containers', 'Supplements'],
  'Tools & Equipment': ['Hand Tools', 'Power Tools', 'Maintenance Equipment', 'Construction Tools'],
  'Electronics': ['Computers', 'Communication Devices', 'Sensors', 'Batteries'],
  'Clothing & Personal': ['Space Suits', 'Regular Clothing', 'Hygiene Products', 'Personal Items'],
  'Scientific Instruments': ['Lab Equipment', 'Measurement Devices', 'Research Tools', 'Sample Containers'],
  'Safety Equipment': ['Fire Extinguishers', 'Emergency Kits', 'Safety Harnesses', 'Alarm Systems'],
  'Spare Parts': ['Mechanical Parts', 'Electrical Components', 'Structural Elements', 'Hydraulic Parts']
};

export default function AddItemModal({ onClose, onSubmit }: AddItemModalProps) {
  const [formData, setFormData] = useState<Omit<Item, '_key'>>({
    item_id: `item_${Date.now()}`,
    name: '',
    category: 'Medical Supplies',
    subcategory: 'Medications',
    width_cm: 100,
    depth_cm: 100,
    height_cm: 100,
    mass_kg: 1,
    priority: 50,
    expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    usage_limit: '100',
    preferred_zone: null
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Format data properly before submission
    const formattedData = {
      ...formData,
      // Ensure numerical values are numbers
      width_cm: typeof formData.width_cm === 'string' ? parseFloat(formData.width_cm) : formData.width_cm,
      depth_cm: typeof formData.depth_cm === 'string' ? parseFloat(formData.depth_cm) : formData.depth_cm,
      height_cm: typeof formData.height_cm === 'string' ? parseFloat(formData.height_cm) : formData.height_cm,
      mass_kg: typeof formData.mass_kg === 'string' ? parseFloat(formData.mass_kg) : formData.mass_kg,
      priority: typeof formData.priority === 'string' ? parseInt(formData.priority, 10) : formData.priority,
      // Ensure date is in ISO format with Z timezone
      expiry_date: formData.expiry_date ? `${new Date(formData.expiry_date).toISOString().split('.')[0]}Z` : null,
      // Ensure usage_limit is a string
      usage_limit: formData.usage_limit,
    };
    
    onSubmit(formattedData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-900/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-6">Add New Item</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-300 text-sm block mb-1">Item ID</label>
              <input
                type="text"
                value={formData.item_id}
                onChange={(e) => setFormData(prev => ({ ...prev, item_id: e.target.value }))}
                className="w-full bg-gray-700 rounded-md px-3 py-2 text-white border border-gray-600"
                required
              />
            </div>
            <div>
              <label className="text-gray-300 text-sm block mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-gray-700 rounded-md px-3 py-2 text-white border border-gray-600"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-300 text-sm block mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => {
                  const category = e.target.value;
                  setFormData(prev => ({ 
                    ...prev, 
                    category,
                    subcategory: SUBCATEGORIES[category as keyof typeof SUBCATEGORIES]?.[0] || 'Unknown'
                  }));
                }}
                className="w-full bg-gray-700 rounded-md px-3 py-2 text-white border border-gray-600"
                required
              >
                {CATEGORIES.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-gray-300 text-sm block mb-1">Subcategory</label>
              <select
                value={formData.subcategory}
                onChange={(e) => setFormData(prev => ({ ...prev, subcategory: e.target.value }))}
                className="w-full bg-gray-700 rounded-md px-3 py-2 text-white border border-gray-600"
                required
              >
                {SUBCATEGORIES[formData.category as keyof typeof SUBCATEGORIES]?.map(subcategory => (
                  <option key={subcategory} value={subcategory}>{subcategory}</option>
                )) || []}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-gray-300 text-sm block mb-1">Width (cm)</label>
              <input
                type="number"
                value={formData.width_cm || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, width_cm: e.target.value ? Number(e.target.value) : null }))}
                className="w-full bg-gray-700 rounded-md px-3 py-2 text-white border border-gray-600"
                required
              />
            </div>
            <div>
              <label className="text-gray-300 text-sm block mb-1">Depth (cm)</label>
              <input
                type="number"
                value={formData.depth_cm || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, depth_cm: e.target.value ? Number(e.target.value) : null }))}
                className="w-full bg-gray-700 rounded-md px-3 py-2 text-white border border-gray-600"
                required
              />
            </div>
            <div>
              <label className="text-gray-300 text-sm block mb-1">Height (cm)</label>
              <input
                type="number"
                value={formData.height_cm || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, height_cm: e.target.value ? Number(e.target.value) : null }))}
                className="w-full bg-gray-700 rounded-md px-3 py-2 text-white border border-gray-600"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-300 text-sm block mb-1">Mass (kg)</label>
              <input
                type="number"
                step="0.1"
                value={formData.mass_kg || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, mass_kg: e.target.value ? Number(e.target.value) : null }))}
                className="w-full bg-gray-700 rounded-md px-3 py-2 text-white border border-gray-600"
                required
              />
            </div>
            <div>
              <label className="text-gray-300 text-sm block mb-1">Priority (1-100)</label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.priority || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value ? Number(e.target.value) : null }))}
                className="w-full bg-gray-700 rounded-md px-3 py-2 text-white border border-gray-600"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-300 text-sm block mb-1">Expiry Date</label>
              <input
                type="date"
                value={formData.expiry_date?.split('T')[0] || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  expiry_date: e.target.value ? `${new Date(e.target.value).toISOString().split('.')[0]}Z` : null 
                }))}
                className="w-full bg-gray-700 rounded-md px-3 py-2 text-white border border-gray-600"
              />
            </div>
            <div>
              <label className="text-gray-300 text-sm block mb-1">Usage Limit</label>
              <input
                type="text"
                value={formData.usage_limit || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, usage_limit: e.target.value || null }))}
                className="w-full bg-gray-700 rounded-md px-3 py-2 text-white border border-gray-600"
                placeholder="e.g., 100 or N/A"
              />
            </div>
          </div>

          <div>
            <label className="text-gray-300 text-sm block mb-1">Preferred Zone</label>
            <select
              value={formData.preferred_zone || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, preferred_zone: e.target.value || null }))}
              className="w-full bg-gray-700 rounded-md px-3 py-2 text-white border border-gray-600"
            >
              <option value="">No Preference</option>
              {ZONES.map(zone => (
                <option key={zone} value={zone}>{zone}</option>
              ))}
            </select>
          </div>

          <div className="pt-4 flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white"
            >
              Add Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
