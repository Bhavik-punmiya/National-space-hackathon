"use client";
import React, { useCallback, useRef, useState } from "react";
import { Package, Zap, Clock, AlertTriangle } from "lucide-react";
import { Command as CommandPrimitive } from "cmdk";
import {
  CommandGroup,
  CommandItem,
  CommandList,
  CommandInput,
} from "@/components/ui/command";

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

interface SearchBarProps {
  selectedItems: Item[];
  setSelectedItems: React.Dispatch<React.SetStateAction<Item[]>>;
  items: Item[]; // Updated from dummyItems
  isOpen: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export function SearchBar({
  selectedItems,
  setSelectedItems,
  items,
  isOpen,
  setOpen,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const commandRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState<string>(""); // Added for filtering

  const handleSelectOption = useCallback(
    (item: Item) => {
      if (!selectedItems.find((i) => i.itemId === item.itemId)) {
        setSelectedItems((prev) => [...prev, item]);
      }
      setOpen(false);
      if (inputRef.current) {
        inputRef.current.blur();
        inputRef.current.value = "";
        setSearchTerm(""); // Reset search term
      }
    },
    [selectedItems, setOpen, setSelectedItems]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const input = inputRef.current;
      if (!input) return;

      if (event.key === "Enter" && input.value) {
        const optionToSelect = items.find(
          (item) => item.name.toLowerCase() === input.value.toLowerCase()
        );
        if (optionToSelect) {
          handleSelectOption(optionToSelect);
          input.blur();
        }
      }

      if (event.key === "Escape") {
        input.blur();
        setOpen(false);
      }
    },
    [handleSelectOption, items, setOpen]
  );

  const handleBlur = useCallback(() => {
    setTimeout(() => {
      setOpen(false);
    }, 100); // Delay to allow click events
  }, [setOpen]);

  const handleFocus = useCallback(() => {
    setOpen(true);
  }, [setOpen]);

  const filteredItems = items.filter(
    (item) =>
      !selectedItems.find((i) => i.itemId === item.itemId) &&
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  return (
    <div className="relative w-full md:w-3/5">
      <div ref={commandRef} className="relative">
        <CommandPrimitive
          onKeyDown={handleKeyDown}
          className="w-full border-2 border-gray-700 rounded-md bg-gray-800 shadow-lg shadow-black/10"
        >
          <CommandInput
            ref={inputRef}
            onBlur={handleBlur}
            onFocus={handleFocus}
            placeholder="Search Items..."
            className="text-base bg-transparent text-gray-100 pl-10 py-6 focus:outline-none"
            value={searchTerm}
            onValueChange={setSearchTerm} // Use onValueChange instead of onChange
          />
          {isOpen && filteredItems.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md bg-gray-800 border-2 border-gray-700 shadow-xl">
              <CommandList className="max-h-60 overflow-y-auto">
                <CommandGroup heading="Available Items">
                  {filteredItems.map((item) => (
                    <CommandItem
                      key={item.itemId}
                      value={item.name}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onSelect={() => handleSelectOption(item)}
                      className="flex w-full items-center gap-3 hover:bg-indigo-600/20 cursor-pointer px-3 py-3 rounded-md my-1 mx-1 transition-colors duration-200 text-gray-100"
                    >
                      {getItemStatusIcon(item)}
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
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
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </div>
          )}
        </CommandPrimitive>
      </div>
    </div>
  );
}
