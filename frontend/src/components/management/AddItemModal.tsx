'use client'

import { useState } from 'react';
import type { JSX } from 'react';

interface Item {
  item_id: string;
  name: string;
  category: string;
  subcategory: string;
  width_cm: number | null;
  depth_cm: number | null;
  height_cm: number | null;
  mass_kg: number | null;
  // Enhanced fields from models_db.py
  temp_requirement: string | null;
  lot_number: string | null;
  current_location: string | null;
  orientation_allowed: boolean | null;
  hazardous_class: string | null;
  tags_id: string | null; // JSON string array
  priority: number | null;
  expiry_date: string | null;
  maximum_uses: number | null;
  current_uses: number | null;
  usage_remaining: number | null;
  usage_frequency: number | null;
  preferred_zone: string | null;
  status: string | null;
  // Legacy field for compatibility
  usage_limit: string | null;
}

interface AddItemModalProps {
  onClose: () => void;
  onSubmit: (item: Omit<Item, '_key'>) => void;
}

// Enhanced enums from models_db.py
const TEMPERATURE_REQUIREMENTS = [
  { value: 'COLD', label: 'Cold (Refrigeration)' },
  { value: 'AMBIENT', label: 'Ambient (Room Temperature)' },
  { value: 'WARM', label: 'Warm (Heated Environment)' },
  { value: 'N/A', label: 'No Specific Requirement' }
];

const HAZARDOUS_CLASSES = [
  { value: 'NONE', label: 'Non-hazardous' },
  { value: 'FLAMMABLE', label: 'Flammable' },
  { value: 'CORROSIVE', label: 'Corrosive' },
  { value: 'BIOHAZARD', label: 'Biohazard' },
  { value: 'TOXIC', label: 'Toxic' },
  { value: 'RADIOACTIVE', label: 'Radioactive' },
  { value: 'PRESSURIZED', label: 'Pressurized' }
];

const ITEM_STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'IN_USE', label: 'In Use' },
  { value: 'PLANNED', label: 'Planned' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'WASTE_EXPIRED', label: 'Waste (Expired)' },
  { value: 'WASTE_DEPLETED', label: 'Waste (Depleted)' },
  { value: 'WASTE', label: 'Waste' },
  { value: 'DISPOSED', label: 'Disposed' },
  { value: 'LOST', label: 'Lost' },
  { value: 'BROKEN', label: 'Broken' }
];

const ZONES = [
  'Airlock', 'Cockpit', 'Command_Center', 'Crew_Quarters', 'Engine_Bay',
  'Engineering_Bay', 'External_Storage', 'Greenhouse', 'Lab', 'Life_Support',
  'Maintenance_Bay', 'Medical_Bay', 'Power_Bay', 'Sanitation_Bay', 'Storage_Bay'
];

const CATEGORIES = [
  'Medical', 'Food', 'Equipment', 'Experiment_Sample', 'Life_Support_System',
  'Crew_Supplies', 'Maintenance_Tools', 'Scientific_Research_Supplies',
  'Essential_Supplies', 'Structural_and_Spacecraft_Components',
  'Entertainment_and_Leisure_Items'
];

const SUBCATEGORIES = {
  'Medical': ['Antibiotic_Supply', 'Emergency_Oxygen_Mask', 'First_Aid_Kit', 'Medical_Scanner'],
  'Food': ['Food_Packet', 'Protein_Bars', 'Water_Bottle', 'Water_Purification_Unit'],
  'Equipment': ['3D_Printer', 'Battery_Pack', 'Circuit_Board', 'Space_Suit', 'EV_Suit_Battery', 'Gyroscope_Module', 'Tether_Reel', 'Helmet_Visor', 'Lab_Microscope', 'Laptop', 'LED_Work_Light', 'Navigation_Module', 'Scientific_Sensor', 'Solar_Panel', 'Tool_Kit', 'Vacuum_Sealed_Tools'],
  'Experiment_Sample': ['Asteroid_Sample_Container', 'Microgravity_Lab_Kit', 'Research_Samples', 'Seed_Packets'],
  'Life_Support_System': ['Fire_Extinguisher', 'Radiation_Shield', 'CO2_Scrubber', 'Cooling_System', 'Emergency_Beacon', 'Oxygen_Cylinder', 'Pressure_Regulator', 'Waste_Management_Kit', 'Communication_Device', 'Handheld_Spectrometer', 'Thruster_Fuel'],
  'Crew_Supplies': ['Personal_Hygiene_Products', 'Clothing', 'Medical_Supplies'],
  'Maintenance_Tools': ['Screwdrivers', 'Drills', 'Spacewalk_Tools'],
  'Scientific_Research_Supplies': ['Scientific_Instruments', 'Sensors', 'Sample_Storage_Containers', 'Data_Storage_Devices'],
  'Essential_Supplies': ['Oxygen_Tanks', 'Carbon_Dioxide_Scrubbers', 'Water_Filtration_System', 'Waste_Disposal_Systems', 'Gym_Equipment'],
  'Structural_and_Spacecraft_Components': ['Spare_Parts', 'Panels', 'Beams', 'Replacement_Hardware_for_Modules', 'Docking_Ports_and_Connections'],
  'Entertainment_and_Leisure_Items': ['Books', 'Movies_Music_Devices', 'Recreation_Materials']
};

export default function AddItemModal({ onClose, onSubmit }: AddItemModalProps): JSX.Element {
  const [formData, setFormData] = useState<Omit<Item, '_key'>>({
    item_id: `item_${Date.now()}`,
    name: '',
    category: 'Medical',
    subcategory: 'Antibiotic_Supply',
    width_cm: 20,
    depth_cm: 15,
    height_cm: 10,
    mass_kg: 1,
    // Enhanced fields
    temp_requirement: 'AMBIENT',
    lot_number: `LOT${new Date().getFullYear()}-${Math.floor(Math.random() * 999).toString().padStart(3, '0')}`,
    current_location: null,
    orientation_allowed: true,
    hazardous_class: 'NONE',
    tags_id: JSON.stringify([`BAR${Math.floor(Math.random() * 900000) + 100000}`]),
    priority: 50,
    expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    maximum_uses: 100,
    current_uses: 0,
    usage_remaining: 100,
    usage_frequency: 0.1,
    preferred_zone: null,
    status: 'ACTIVE',
    // Legacy compatibility
    usage_limit: '100'
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
      mass_kg: typeof formData.mass_kg === 'string' ? parseFloat(formData.mass_kg) : formData.mass_kg,
      priority: typeof formData.priority === 'string' ? parseInt(formData.priority, 10) : formData.priority,
      maximum_uses: typeof formData.maximum_uses === 'string' ? parseInt(formData.maximum_uses, 10) : formData.maximum_uses,
      current_uses: typeof formData.current_uses === 'string' ? parseInt(formData.current_uses, 10) : formData.current_uses,
      usage_frequency: typeof formData.usage_frequency === 'string' ? parseFloat(formData.usage_frequency) : formData.usage_frequency,
      // Ensure date is in ISO format with Z timezone
      expiry_date: formData.expiry_date ? `${new Date(formData.expiry_date).toISOString().split('.')[0]}Z` : null,
      // Ensure usage_limit is a string (legacy compatibility)
      usage_limit: formData.maximum_uses ? String(formData.maximum_uses) : formData.usage_limit,
      // Calculate usage_remaining based on maximum_uses and current_uses
      usage_remaining: formData.maximum_uses && formData.current_uses 
        ? (typeof formData.maximum_uses === 'number' ? formData.maximum_uses : parseInt(String(formData.maximum_uses), 10)) - 
          (typeof formData.current_uses === 'number' ? formData.current_uses : parseInt(String(formData.current_uses), 10))
        : (typeof formData.usage_remaining === 'string' ? parseInt(formData.usage_remaining, 10) : formData.usage_remaining),
    };
    
    onSubmit(formattedData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-900/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full shadow-xl border border-gray-700 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-6">Add New Item (Enhanced)</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information Section */}
          <div className="bg-gray-700 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-gray-300 text-sm block mb-1">Item ID</label>
                <input
                  type="text"
                  value={formData.item_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, item_id: e.target.value }))}
                  className="w-full bg-gray-600 rounded-md px-3 py-2 text-white border border-gray-500"
                  required
                />
              </div>
              <div>
                <label className="text-gray-300 text-sm block mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-gray-600 rounded-md px-3 py-2 text-white border border-gray-500"
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
                  className="w-full bg-gray-600 rounded-md px-3 py-2 text-white border border-gray-500"
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
                  className="w-full bg-gray-600 rounded-md px-3 py-2 text-white border border-gray-500"
                  required
                >
                  {SUBCATEGORIES[formData.category as keyof typeof SUBCATEGORIES]?.map(subcategory => (
                    <option key={subcategory} value={subcategory}>{subcategory}</option>
                  )) || []}
                </select>
              </div>
            </div>
          </div>

          {/* Physical Properties Section */}
          <div className="bg-gray-700 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Physical Properties</h3>
            <div className="grid grid-cols-4 gap-4">
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
              <div>
                <label className="text-gray-300 text-sm block mb-1">Mass (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.mass_kg || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, mass_kg: e.target.value ? Number(e.target.value) : null }))}
                  className="w-full bg-gray-600 rounded-md px-3 py-2 text-white border border-gray-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Enhanced Properties Section */}
          <div className="bg-gray-700 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Enhanced Properties</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-gray-300 text-sm block mb-1">Temperature Requirement</label>
                <select
                  value={formData.temp_requirement || 'AMBIENT'}
                  onChange={(e) => setFormData(prev => ({ ...prev, temp_requirement: e.target.value }))}
                  className="w-full bg-gray-600 rounded-md px-3 py-2 text-white border border-gray-500"
                >
                  {TEMPERATURE_REQUIREMENTS.map(temp => (
                    <option key={temp.value} value={temp.value}>{temp.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-gray-300 text-sm block mb-1">Hazardous Class</label>
                <select
                  value={formData.hazardous_class || 'NONE'}
                  onChange={(e) => setFormData(prev => ({ ...prev, hazardous_class: e.target.value }))}
                  className="w-full bg-gray-600 rounded-md px-3 py-2 text-white border border-gray-500"
                >
                  {HAZARDOUS_CLASSES.map(hazard => (
                    <option key={hazard.value} value={hazard.value}>{hazard.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-gray-300 text-sm block mb-1">Lot Number</label>
                <input
                  type="text"
                  value={formData.lot_number || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, lot_number: e.target.value }))}
                  className="w-full bg-gray-600 rounded-md px-3 py-2 text-white border border-gray-500"
                  placeholder="LOT2024-001"
                />
              </div>
              <div>
                <label className="text-gray-300 text-sm block mb-1">Status</label>
                <select
                  value={formData.status || 'ACTIVE'}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full bg-gray-600 rounded-md px-3 py-2 text-white border border-gray-500"
                >
                  {ITEM_STATUSES.map(status => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="orientation_allowed"
                  checked={formData.orientation_allowed !== false}
                  onChange={(e) => setFormData(prev => ({ ...prev, orientation_allowed: e.target.checked }))}
                  className="mr-2"
                />
                <label htmlFor="orientation_allowed" className="text-gray-300 text-sm">Allow Rotation</label>
              </div>
            </div>
          </div>

          {/* Usage & Lifecycle Section */}
          <div className="bg-gray-700 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Usage & Lifecycle</h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-gray-300 text-sm block mb-1">Priority (1-100)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.priority || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value ? Number(e.target.value) : null }))}
                  className="w-full bg-gray-600 rounded-md px-3 py-2 text-white border border-gray-500"
                  required
                />
              </div>
              <div>
                <label className="text-gray-300 text-sm block mb-1">Maximum Uses</label>
                <input
                  type="number"
                  value={formData.maximum_uses || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, maximum_uses: e.target.value ? Number(e.target.value) : null }))}
                  className="w-full bg-gray-600 rounded-md px-3 py-2 text-white border border-gray-500"
                />
              </div>
              <div>
                <label className="text-gray-300 text-sm block mb-1">Current Uses</label>
                <input
                  type="number"
                  min="0"
                  value={formData.current_uses || 0}
                  onChange={(e) => setFormData(prev => ({ ...prev, current_uses: e.target.value ? Number(e.target.value) : 0 }))}
                  className="w-full bg-gray-600 rounded-md px-3 py-2 text-white border border-gray-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-gray-300 text-sm block mb-1">Usage Frequency (per day)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.usage_frequency || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, usage_frequency: e.target.value ? Number(e.target.value) : null }))}
                  className="w-full bg-gray-600 rounded-md px-3 py-2 text-white border border-gray-500"
                  placeholder="0.1"
                />
              </div>
              <div>
                <label className="text-gray-300 text-sm block mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={formData.expiry_date?.split('T')[0] || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    expiry_date: e.target.value ? `${new Date(e.target.value).toISOString().split('.')[0]}Z` : null 
                  }))}
                  className="w-full bg-gray-600 rounded-md px-3 py-2 text-white border border-gray-500"
                />
              </div>
            </div>
          </div>

          {/* Storage Preferences Section */}
          <div className="bg-gray-700 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Storage Preferences</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-gray-300 text-sm block mb-1">Preferred Zone</label>
                <select
                  value={formData.preferred_zone || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, preferred_zone: e.target.value || null }))}
                  className="w-full bg-gray-600 rounded-md px-3 py-2 text-white border border-gray-500"
                >
                  <option value="">No Preference</option>
                  {ZONES.map(zone => (
                    <option key={zone} value={zone}>{zone.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-gray-300 text-sm block mb-1">Tags/IDs (JSON)</label>
                <input
                  type="text"
                  value={formData.tags_id || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, tags_id: e.target.value }))}
                  className="w-full bg-gray-600 rounded-md px-3 py-2 text-white border border-gray-500"
                  placeholder='["BAR123456", "RFID789"]'
                />
              </div>
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
              Add Enhanced Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
