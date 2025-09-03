"use client";
import React from "react";
import { Package, Zap, Clock, AlertTriangle, X } from "lucide-react";

interface Item {
  itemId: string;
  name: string;
  category?: string;
  subcategory?: string;
  usage_frequency?: number;
  maximum_uses?: number;
  current_uses?: number;
  expiry_date?: string;
}

interface SelectedItemsProps {
  selectedItems: Item[];
  handleRemoveItem: (itemId: string) => void;
}

export function SelectedItems({
  selectedItems,
  handleRemoveItem,
}: SelectedItemsProps) {
  const getItemStatusIcon = (item: Item) => {
    if (item.expiry_date && item.expiry_date !== "N/A") {
      const expiryDate = new Date(item.expiry_date);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry <= 7) return <AlertTriangle size={14} className="text-red-400" />;
      if (daysUntilExpiry <= 15) return <AlertTriangle size={14} className="text-orange-400" />;
      if (daysUntilExpiry <= 30) return <AlertTriangle size={14} className="text-yellow-400" />;
    }
    
    if (item.maximum_uses && item.current_uses) {
      const remainingUses = item.maximum_uses - item.current_uses;
      if (remainingUses <= 3) return <Zap size={14} className="text-red-400" />;
      if (remainingUses <= 10) return <Zap size={14} className="text-orange-400" />;
    }
    
    return <Package size={14} className="text-indigo-400" />;
  };

  const getItemStatusText = (item: Item) => {
    if (item.expiry_date && item.expiry_date !== "N/A") {
      const expiryDate = new Date(item.expiry_date);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry <= 7) return `Expires in ${daysUntilExpiry} days`;
      if (daysUntilExpiry <= 15) return `Expires in ${daysUntilExpiry} days`;
      if (daysUntilExpiry <= 30) return `Expires in ${daysUntilExpiry} days`;
    }
    
    if (item.maximum_uses && item.current_uses) {
      const remainingUses = item.maximum_uses - item.current_uses;
      if (remainingUses <= 3) return `${remainingUses} uses left`;
      if (remainingUses <= 10) return `${remainingUses} uses left`;
    }
    
    return "";
  };

  const getStatusBadgeColor = (item: Item) => {
    if (item.expiry_date && item.expiry_date !== "N/A") {
      const expiryDate = new Date(item.expiry_date);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry <= 7) return "border-red-500 bg-red-500/10";
      if (daysUntilExpiry <= 15) return "border-orange-500 bg-orange-500/10";
      if (daysUntilExpiry <= 30) return "border-yellow-500 bg-yellow-500/10";
    }
    
    if (item.maximum_uses && item.current_uses) {
      const remainingUses = item.maximum_uses - item.current_uses;
      if (remainingUses <= 3) return "border-red-500 bg-red-500/10";
      if (remainingUses <= 10) return "border-orange-500 bg-orange-500/10";
    }
    
    return "border-indigo-500 bg-indigo-500/10";
  };

  return (
    selectedItems.length > 0 && (
      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Selected Items ({selectedItems.length})</h4>
        <div className="flex flex-wrap gap-3 w-full">
          {selectedItems.map((item) => (
            <div
              key={item.itemId}
              className={`bg-gray-800 text-gray-100 px-4 py-3 rounded-md flex items-center border-2 ${getStatusBadgeColor(item)} shadow-sm transition-all duration-200 hover:scale-105`}
            >
              {getItemStatusIcon(item)}
              <div className="ml-3 flex-1">
                <div className="font-medium text-sm">{item.name}</div>
                <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                  <span className="font-mono">{item.itemId}</span>
                  {item.category && (
                    <>
                      <span>•</span>
                      <span>{item.category}</span>
                    </>
                  )}
                  {item.subcategory && (
                    <>
                      <span>•</span>
                      <span>{item.subcategory}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                  {item.usage_frequency && (
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {item.usage_frequency}/day
                    </span>
                  )}
                  {item.maximum_uses && item.current_uses && (
                    <span className="flex items-center gap-1">
                      <Zap size={12} />
                      {item.current_uses}/{item.maximum_uses}
                    </span>
                  )}
                </div>
                {getItemStatusText(item) && (
                  <div className="text-xs text-amber-400 mt-1 font-medium">
                    {getItemStatusText(item)}
                  </div>
                )}
              </div>
              <button
                onClick={() => handleRemoveItem(item.itemId)}
                className="ml-3 text-gray-400 hover:text-red-400 focus:outline-none rounded-full hover:bg-red-500/10 p-1 transition-colors"
                title="Remove item"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  );
}
