'use client'

import { useState } from 'react';

interface Container {
  container_id: string;
  name: string | null;
  type: string | null;
  zone: string | null;
  module_id: string;
  width_cm: number | null;
  depth_cm: number | null;
  height_cm: number | null;
  // Enhanced fields from models_db.py
  open_face: string | null;
  max_mass: number | null;
  current_mass: number | null;
  access_index: number | null;
  parent_container_id: string | null;
  is_active: boolean | null;
  description: string | null;
  created_at: string | null;
  last_accessed: string | null;
}

interface AddContainerModalProps {
  onClose: () => void;
  onSubmit: (container: Omit<Container, '_key'>) => void;
}

// Enhanced enums from models_db.py
const CONTAINER_TYPES = [
  { value: 'CTB', label: 'Cargo Transfer Bag' },
  { value: 'LOCKER', label: 'Standard Locker' },
  { value: 'RACK_BAY', label: 'Rack Bay Storage' },
  { value: 'FREE_VOLUME', label: 'Open Storage Area' },
  { value: 'VEHICLE', label: 'Vehicle Storage' },
  { value: 'TRASH_BAG', label: 'Waste Container' },
  { value: 'DRAWER', label: 'Drawer Storage' },
  { value: 'CABINET', label: 'Cabinet Storage' }
];

const ACCESS_FACES = [
  { value: '+X', label: '+X (Positive X)' },
  { value: '+Y', label: '+Y (Positive Y)' },
  { value: '+Z', label: '+Z (Positive Z)' },
  { value: '-X', label: '-X (Negative X)' },
  { value: '-Y', label: '-Y (Negative Y)' },
  { value: '-Z', label: '-Z (Negative Z)' }
];

const ZONES = [
  'Airlock', 'Cockpit', 'Command_Center', 'Crew_Quarters', 'Engine_Bay',
  'Engineering_Bay', 'External_Storage', 'Greenhouse', 'Lab', 'Life_Support',
  'Maintenance_Bay', 'Medical_Bay', 'Power_Bay', 'Sanitation_Bay', 'Storage_Bay'
];

const MODULES = ['M1', 'M2', 'M3'];

export default function AddContainerModal({ onClose, onSubmit }: AddContainerModalProps): JSX.Element {
  const [formData, setFormData] = useState<Omit<Container, '_key'>>({
    container_id: `M1-${ZONES[0].substring(0,2).toUpperCase()}${Date.now().toString(36).slice(-3)}`,
    name: '',
    type: 'LOCKER',
    zone: 'Storage_Bay',
    module_id: 'M1',
    width_cm: 50,
    depth_cm: 30,
    height_cm: 40,
    // Enhanced fields
    open_face: '+X',
    max_mass: 25.0,
    current_mass: 0.0,
    access_index: 50,
    parent_container_id: null,
    is_active: true,
    description: '',
    created_at: new Date().toISOString(),
    last_accessed: null
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Format data properly before submission with enhanced fields
    const formattedData = {
      ...formData,
      // Ensure numerical values are numbers
      width_cm: typeof formData.width_cm === 'string' ? parseFloat(formData.width_cm) : formData.width_cm,
      depth_cm: typeof formData.depth_cm === 'string' ? parseFloat(formData.depth_cm) : formData.depth_cm,
      height_cm: typeof formData.height_cm === 'string' ? parseFloat(formData.height_cm) : formData.height_cm,
      max_mass: typeof formData.max_mass === 'string' ? parseFloat(formData.max_mass) : formData.max_mass,
      current_mass: typeof formData.current_mass === 'string' ? parseFloat(formData.current_mass) : formData.current_mass,
      access_index: typeof formData.access_index === 'string' ? parseInt(formData.access_index, 10) : formData.access_index,
      // Ensure container name defaults to ID if empty
      name: formData.name || `${formData.type?.replace('_', ' ')} ${formData.container_id}`,
      // Ensure created_at is current time
      created_at: new Date().toISOString(),
    };
    
    onSubmit(formattedData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-900/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-6 max-w-3xl w-full shadow-xl border border-gray-700 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-6">Add New Container (Enhanced)</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information Section */}
          <div className="bg-gray-700 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-gray-300 text-sm block mb-1">Container ID</label>
                <input
                  type="text"
                  value={formData.container_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, container_id: e.target.value }))}
                  className="w-full bg-gray-600 rounded-md px-3 py-2 text-white border border-gray-500"
                  required
                />
              </div>
              <div>
                <label className="text-gray-300 text-sm block mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-gray-600 rounded-md px-3 py-2 text-white border border-gray-500"
                  placeholder="Auto-generated if empty"
                />
              </div>
              <div>
                <label className="text-gray-300 text-sm block mb-1">Type</label>
                <select
                  value={formData.type || 'LOCKER'}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full bg-gray-600 rounded-md px-3 py-2 text-white border border-gray-500"
                  required
                >
                  {CONTAINER_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-gray-300 text-sm block mb-1">Zone</label>
                <select
                  value={formData.zone || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, zone: e.target.value || null }))}
                  className="w-full bg-gray-600 rounded-md px-3 py-2 text-white border border-gray-500"
                  required
                >
                  <option value="">Select Zone</option>
                  {ZONES.map(zone => (
                    <option key={zone} value={zone}>{zone.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-gray-300 text-sm block mb-1">Module</label>
                <select
                  value={formData.module_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, module_id: e.target.value }))}
                  className="w-full bg-gray-600 rounded-md px-3 py-2 text-white border border-gray-500"
                  required
                >
                  {MODULES.map(module => (
                    <option key={module} value={module}>{module}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Physical Properties Section */}
          <div className="bg-gray-700 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Physical Properties</h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-gray-300 text-sm block mb-1">Width (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.width_cm || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, width_cm: e.target.value ? Number(e.target.value) : null }))}
                  className="w-full bg-gray-600 rounded-md px-3 py-2 text-white border border-gray-500"
                  required
                />
              </div>
              <div>
                <label className="text-gray-300 text-sm block mb-1">Depth (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.depth_cm || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, depth_cm: e.target.value ? Number(e.target.value) : null }))}
                  className="w-full bg-gray-600 rounded-md px-3 py-2 text-white border border-gray-500"
                  required
                />
              </div>
              <div>
                <label className="text-gray-300 text-sm block mb-1">Height (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.height_cm || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, height_cm: e.target.value ? Number(e.target.value) : null }))}
                  className="w-full bg-gray-600 rounded-md px-3 py-2 text-white border border-gray-500"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-gray-300 text-sm block mb-1">Max Mass (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.max_mass || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_mass: e.target.value ? Number(e.target.value) : null }))}
                  className="w-full bg-gray-600 rounded-md px-3 py-2 text-white border border-gray-500"
                />
              </div>
              <div>
                <label className="text-gray-300 text-sm block mb-1">Current Mass (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.current_mass || 0}
                  onChange={(e) => setFormData(prev => ({ ...prev, current_mass: e.target.value ? Number(e.target.value) : 0 }))}
                  className="w-full bg-gray-600 rounded-md px-3 py-2 text-white border border-gray-500"
                />
              </div>
            </div>
          </div>

          {/* Enhanced Properties Section */}
          <div className="bg-gray-700 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Enhanced Properties</h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-gray-300 text-sm block mb-1">Open Face</label>
                <select
                  value={formData.open_face || '+X'}
                  onChange={(e) => setFormData(prev => ({ ...prev, open_face: e.target.value }))}
                  className="w-full bg-gray-600 rounded-md px-3 py-2 text-white border border-gray-500"
                >
                  {ACCESS_FACES.map(face => (
                    <option key={face.value} value={face.value}>{face.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-gray-300 text-sm block mb-1">Access Index (0-100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.access_index || 50}
                  onChange={(e) => setFormData(prev => ({ ...prev, access_index: e.target.value ? Number(e.target.value) : 50 }))}
                  className="w-full bg-gray-600 rounded-md px-3 py-2 text-white border border-gray-500"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active !== false}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="mr-2"
                />
                <label htmlFor="is_active" className="text-gray-300 text-sm">Active Container</label>
              </div>
            </div>
            <div>
              <label className="text-gray-300 text-sm block mb-1">Description</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full bg-gray-600 rounded-md px-3 py-2 text-white border border-gray-500"
                rows={3}
                placeholder="Additional notes or description"
              />
            </div>
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
              Add Enhanced Container
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
