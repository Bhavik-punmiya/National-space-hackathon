"use client";
import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { toast } from "react-hot-toast";
import { SearchBar } from "./_components/SearchBar";
import { DatePicker } from "./_components/DatePicker";
import { SimulateButton } from "./_components/SimulateButton";
import { SelectedItems } from "./_components/SelectedItems";
import { SimulationResults } from "./_components/SimulationResults";

interface Item {
  itemId: string;
  name: string;
}

interface SimulationResponse {
  success: boolean;
  newDate: string;
  changes: {
    itemsUsed: { item_id: string; name: string; remainingUses: number; timestamp: string }[];
    itemsExpired: { item_id: string; name: string; timestamp: string }[];
    itemsDepletedToday: { item_id: string; name: string; timestamp: string }[];
  };
}

export default function SimulatePage() {
  const [selectedItems, setSelectedItems] = useState<Item[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [simulationResult, setSimulationResult] =
    useState<SimulationResponse | null>(null);
  const [filter, setFilter] = useState<
    "itemsUsed" | "itemsExpired" | "itemsDepletedToday" | "allEvents"
  >("itemsUsed");
  const [isOpen, setOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [allItems, setAllItems] = useState<Item[]>([]);

  // Fetch items from /api/frontend/placements on mount
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/frontend/placements`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch items");
        }
        const data = await response.json();
        const items = data.items.map((item: any) => ({
          itemId: item.id,
          name: item.name,
        }));
        setAllItems(items);
      } catch (error) {
        console.error("Error fetching items:", error);
        toast.error("Failed to load items for simulation.");
      }
    };
    fetchItems();
  }, []);

  const handleRemoveItem = (itemId: string) => {
    setSelectedItems((prev) => prev.filter((item) => item.itemId !== itemId));
  };

  const handleSimulate = async () => {
    if (!selectedDate || selectedItems.length === 0) {
      toast.error("Please select a date and at least one item.");
      return;
    }

    setIsLoading(true);

    try {
      // Calculate numOfDays from current date to selectedDate
      const currentDate = new Date();
      const diffTime = selectedDate.getTime() - currentDate.getTime();
      const numOfDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Convert ms to days and round up

      if (numOfDays <= 0) {
        throw new Error("Selected date must be in the future.");
      }

      const requestBody = {
        numOfDays, // Send numOfDays instead of toTimestamp
        itemsToBeUsedPerDay: selectedItems.map((item) => ({
          item_id: item.itemId,
          name: item.name,
        })),
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/simulate/day`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        throw new Error("Simulation failed");
      }

      const data: SimulationResponse = await response.json();

      if (data.success) {
        setSimulationResult(data);
        toast.success("Simulation completed successfully!");
      } else {
        toast.error("Simulation failed according to the server response.");
      }
    } catch (error) {
      console.error("Simulation error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "An error occurred during simulation."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-full min-h-screen bg-gray-900 text-gray-100 rounded-lg shadow-xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-3 bg-gradient-to-r from-gray-900 to-gray-800 border-b border-indigo-900/30">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 rounded-md bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-700/20">
            <Clock size={18} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Simulate Item Usage
          </h2>
        </div>
      </div>

      <div className="p-6 bg-gray-900 border-b border-gray-800">
        <div className="flex flex-col md:flex-row items-stretch gap-4">
          <SearchBar
            selectedItems={selectedItems}
            setSelectedItems={setSelectedItems}
            items={allItems}
            isOpen={isOpen}
            setOpen={setOpen}
          />
          <DatePicker
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
          />
          <SimulateButton
            isLoading={isLoading}
            handleSimulate={handleSimulate}
          />
        </div>
        <SelectedItems
          selectedItems={selectedItems}
          handleRemoveItem={handleRemoveItem}
        />
      </div>

      <SimulationResults
        simulationResult={simulationResult}
        filter={filter}
        setFilter={setFilter}
      />
    </div>
  );
}
