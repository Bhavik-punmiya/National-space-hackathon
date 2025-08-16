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
    priority: number | null;
    expiry_date: string | null;
    usage_limit: string | number | null;
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
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Category</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Subcategory</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Dimensions (H×W×D cm)</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Mass (kg)</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Priority</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Expiry</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Usage</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Zone Pref.</th>
                        {onDelete && (
                          <th scope="col" className="relative px-4 py-3 w-16"><span className="sr-only">Actions</span></th>
                        )}
                    </tr>
                ) : (
                    <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Container ID</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Module</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Zone</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Dimensions (H×W×D cm)</th>
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
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">{typedItem.item_id}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-white font-medium">{typedItem.name}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">{typedItem.category}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">{typedItem.subcategory}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">
                              {typedItem.height_cm ?? '?' }×{typedItem.width_cm ?? '?' }×{typedItem.depth_cm ?? '?'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">{typedItem.mass_kg ?? 'N/A'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">{typedItem.priority ?? 'N/A'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">
                               {typedItem.expiry_date ? new Date(typedItem.expiry_date).toLocaleDateString() : 'N/A'}
                          </td>
                           <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">
                              {typedItem.usage_limit ? `${typedItem.usage_limit}${typeof typedItem.usage_limit === 'number' ? ' uses' : ''}` : 'N/A'}
                          </td>
                           <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">{typedItem.preferred_zone ?? 'Any'}</td>
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
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">{typedContainer.container_id}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">{typedContainer.module_id}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-white font-medium">{typedContainer.zone ?? 'N/A'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">
                              {typedContainer.height_cm ?? '?' }×{typedContainer.width_cm ?? '?' }×{typedContainer.depth_cm ?? '?'}
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