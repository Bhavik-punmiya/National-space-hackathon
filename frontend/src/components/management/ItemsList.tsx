'use client';

// Updated ItemsList component to match our new implementation

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
    usage_limit: string | number | null;
    _key?: string;
}

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
    _key?: string;
}

type ItemType = Item | Container;

interface ItemsListProps {
  items: ItemType[];
  type: 'items' | 'containers';
  onDelete?: (key: string) => void;
  onSelect?: (item: ItemType) => void;
}

export default function ItemsList({ items, type, onDelete, onSelect }: ItemsListProps) {
  const isEmpty = items.length === 0;

  const renderEmptyState = () => (
    <div className="flex items-center justify-center h-[200px] text-center text-gray-400">
        {type === 'items'
            ? "No items added yet. Please add items manually or upload a CSV file."
            : "No containers added yet. Please add containers manually or upload a CSV file."
        }
    </div>
  );

  const renderTable = () => (
     <div className="overflow-x-auto overflow-y-auto max-h-[450px] custom-scrollbar border border-gray-700 rounded-lg">
        <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-700 sticky top-0">
                {type === 'items' ? (
                    <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">ID</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Name</th>
                        <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-20">Category</th>
                        <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-24">Subcategory</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Dimensions (L×W×H cm)</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Mass (kg)</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Temp Req</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Hazard</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Priority</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Expiry Date</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Usage</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Zone Pref</th>
                        {onDelete && (
                          <th scope="col" className="relative px-4 py-3 w-16"><span className="sr-only">Actions</span></th>
                        )}
                    </tr>
                ) : (
                    <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Container ID</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Name</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Type</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Zone</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Module</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Max Mass</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Access</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Active</th>
                        {onDelete && (
                          <th scope="col" className="relative px-4 py-3 w-16"><span className="sr-only">Actions</span></th>
                        )}
                    </tr>
                )}
            </thead>
            <tbody className="bg-gray-600 divide-y divide-gray-700">
                {type === 'items' 
                  ? items.map((item) => {
                      const typedItem = item as Item;
                      return (
                        <tr key={typedItem._key || typedItem.item_id} className={`hover:bg-gray-550 ${onSelect ? 'cursor-pointer' : ''}`} onClick={() => onSelect?.(item)}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200 font-mono">{typedItem.item_id}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-white font-medium">{typedItem.name}</td>
                          <td className="px-2 py-3 text-sm text-gray-200 max-w-20 truncate" title={typedItem.category}>{typedItem.category}</td>
                          <td className="px-2 py-3 text-sm text-gray-200 max-w-24 truncate" title={typedItem.subcategory}>{typedItem.subcategory}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200 font-mono">
                            {typedItem.depth_cm ?? '?'}×{typedItem.width_cm ?? '?'}×{typedItem.height_cm ?? '?'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">{typedItem.mass_kg ?? 'N/A'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">
                            <span className={`px-2 py-1 rounded text-xs ${
                              typedItem.temp_requirement === 'COLD' ? 'bg-blue-600 text-blue-100' :
                              typedItem.temp_requirement === 'WARM' ? 'bg-orange-600 text-orange-100' :
                              'bg-gray-600 text-gray-100'
                            }`}>
                              {typedItem.temp_requirement || 'AMBIENT'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">
                            <span className={`px-2 py-1 rounded text-xs ${
                              typedItem.hazardous_class === 'NONE' ? 'bg-green-600 text-green-100' :
                              typedItem.hazardous_class === 'FLAMMABLE' ? 'bg-red-600 text-red-100' :
                              typedItem.hazardous_class === 'TOXIC' ? 'bg-purple-600 text-purple-100' :
                              'bg-yellow-600 text-yellow-100'
                            }`}>
                              {typedItem.hazardous_class || 'NONE'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">
                            <span className={`font-semibold ${
                              (typedItem.priority || 50) >= 80 ? 'text-red-400' :
                              (typedItem.priority || 50) >= 60 ? 'text-yellow-400' :
                              'text-green-400'
                            }`}>
                              {typedItem.priority ?? 50}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">
                            <span className={`px-2 py-1 rounded text-xs ${
                              typedItem.status === 'ACTIVE' ? 'bg-green-600 text-green-100' :
                              typedItem.status === 'IN_USE' ? 'bg-blue-600 text-blue-100' :
                              typedItem.status?.includes('WASTE') ? 'bg-red-600 text-red-100' :
                              'bg-gray-600 text-gray-100'
                            }`}>
                              {typedItem.status || 'ACTIVE'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">
                            {typedItem.expiry_date ? new Date(typedItem.expiry_date).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">
                            {typedItem.maximum_uses ? 
                              `${typedItem.current_uses || 0}/${typedItem.maximum_uses}` : 
                              'N/A'
                            }
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">{typedItem.preferred_zone?.replace('_', ' ') ?? 'Any'}</td>
                          {onDelete && (
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDelete(typedItem._key || "");
                                }}
                                className="text-red-400 hover:text-red-300"
                              >
                                Delete
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  : items.map((container) => {
                      const typedContainer = container as Container;
                      return (
                        <tr key={typedContainer._key || typedContainer.container_id} className={`hover:bg-gray-550 ${onSelect ? 'cursor-pointer' : ''}`} onClick={() => onSelect?.(container)}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200 font-mono">{typedContainer.container_id}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-white font-medium">{typedContainer.name || typedContainer.container_id}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">
                            <span className={`px-2 py-1 rounded text-xs ${
                              typedContainer.type === 'LOCKER' ? 'bg-blue-600 text-blue-100' :
                              typedContainer.type === 'RACK_BAY' ? 'bg-green-600 text-green-100' :
                              typedContainer.type === 'CTB' ? 'bg-purple-600 text-purple-100' :
                              'bg-gray-600 text-gray-100'
                            }`}>
                              {typedContainer.type || 'LOCKER'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">{typedContainer.zone?.replace('_', ' ') ?? 'N/A'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">{typedContainer.module_id}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">
                            {typedContainer.max_mass ? `${typedContainer.current_mass || 0}/${typedContainer.max_mass} kg` : 'N/A'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">
                            <span className={`font-semibold ${
                              (typedContainer.access_index || 50) <= 20 ? 'text-green-400' :
                              (typedContainer.access_index || 50) <= 60 ? 'text-yellow-400' :
                              'text-red-400'
                            }`}>
                              {typedContainer.access_index ?? 50}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">
                            <span className={`px-2 py-1 rounded text-xs ${
                              typedContainer.is_active !== false ? 'bg-green-600 text-green-100' : 'bg-red-600 text-red-100'
                            }`}>
                              {typedContainer.is_active !== false ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          {onDelete && (
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDelete(typedContainer._key || "");
                                }}
                                className="text-red-400 hover:text-red-300"
                              >
                                Delete
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                }
            </tbody>
        </table>
    </div>
  );

  return (
    <div className="flex flex-col flex-grow min-h-0">
      {isEmpty ? renderEmptyState() : renderTable()}
    </div>
  );
}