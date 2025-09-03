"use client";
import React, { useState, useEffect } from "react";
import { Clock, TrendingUp, BarChart3, Zap, AlertTriangle, Award, Search, CalendarIcon, RefreshCw, Info } from "lucide-react";
import { toast } from "react-hot-toast";
import { SearchBar } from "./_components/SearchBar";
import { DatePicker } from "./_components/DatePicker";
import { SimulateButton } from "./_components/SimulateButton";
import { SelectedItems } from "./_components/SelectedItems";
import { SimulationResults } from "./_components/SimulationResults";

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

interface SimulationResponse {
  success: boolean;
  newDate: string;
  changes: {
    itemsUsed: { item_id: string; name: string; remainingUses: number; timestamp: string }[];
    itemsExpired: { item_id: string; name: string; timestamp: string }[];
    itemsDepletedToday: { item_id: string; name: string; timestamp: string }[];
  };
}

interface SimulationPrediction {
  simulation_period: string;
  items_likely_to_deplete: Array<{
    item_id: string;
    name: string;
    category: string;
    current_uses: number;
    maximum_uses: number;
    remaining_uses: number;
    usage_frequency: number;
    days_until_depletion: number;
    predicted_waste_date: string;
  }>;
  items_likely_to_expire: Array<{
    item_id: string;
    name_id: string;
    name: string;
    category: string;
    days_until_expiry: number;
    expiry_date: string;
    predicted_waste_date: string;
  }>;
  total_usage_predicted: number;
  waste_generation_estimate: number;
}

export default function SimulatePage() {
  const [selectedItems, setSelectedItems] = useState<Item[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimulationResponse | null>(null);
  const [simulationPrediction, setSimulationPrediction] = useState<SimulationPrediction | null>(null);
  const [filter, setFilter] = useState<"itemsUsed" | "itemsExpired" | "itemsDepletedToday" | "allEvents">("itemsUsed");
  const [isOpen, setOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingPrediction, setIsLoadingPrediction] = useState<boolean>(false);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [activeTab, setActiveTab] = useState<"simulation" | "prediction" | "current-time">("simulation");
  const [predictionDays, setPredictionDays] = useState(30);
  const [currentSimulationTime, setCurrentSimulationTime] = useState<string>("");

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
          category: item.category,
          subcategory: item.subcategory,
          usage_frequency: item.usage_frequency,
          maximum_uses: item.maximum_uses,
          current_uses: item.current_uses,
          expiry_date: item.expiry_date,
        }));
        setAllItems(items);
      } catch (error) {
        console.error("Error fetching items:", error);
        toast.error("Failed to load items for simulation.");
      }
    };
    fetchItems();
    fetchCurrentSimulationTime();
  }, []);

  const fetchCurrentSimulationTime = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/simulate/current-time`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCurrentSimulationTime(data.current_simulation_time);
        }
      }
    } catch (error) {
      console.error("Error fetching current simulation time:", error);
    }
  };

  const fetchSimulationPrediction = async () => {
    setIsLoadingPrediction(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/simulate/predict?days_ahead=${predictionDays}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSimulationPrediction(data.predictions);
          toast.success("Prediction updated successfully!");
        }
      }
    } catch (error) {
      console.error("Error fetching simulation prediction:", error);
      toast.error("Failed to fetch prediction data.");
    } finally {
      setIsLoadingPrediction(false);
    }
  };

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
        num_of_days: numOfDays, // Backend expects 'num_of_days' not 'numOfDays'
        items_to_be_used_per_day: selectedItems.map((item) => ({ // Backend expects 'items_to_be_used_per_day'
          item_id: item.itemId,
          name: item.name,
        })),
        user_id: "astronaut_001", // Add required user_id field
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
        // Try to get detailed error message from response
        let errorMessage = "Simulation failed";
        try {
          const errorData = await response.json();
          if (errorData.error && errorData.details) {
            errorMessage = `${errorData.error}: ${errorData.details.map((d: any) => d.msg).join(", ")}`;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          // If we can't parse the error response, use the status text
          errorMessage = `Simulation failed: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data: SimulationResponse = await response.json();

      if (data.success) {
        setSimulationResult(data);
        toast.success("Simulation completed successfully!");
        // Refresh current simulation time after simulation
        fetchCurrentSimulationTime();
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

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return "Invalid date";
    }
  };

  const getUrgencyBadge = (days: number) => {
    if (days <= 7) return "bg-red-600";
    if (days <= 15) return "bg-orange-600";
    if (days <= 30) return "bg-yellow-600";
    return "bg-green-600";
  };

  return (
    <div className="w-full h-full min-h-screen bg-gray-900 text-gray-100 rounded-lg shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-gradient-to-r from-gray-900 to-gray-800 border-b border-indigo-900/30">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 rounded-md bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-700/20">
            <Clock size={18} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Enhanced Simulation System
          </h2>
        </div>
        <div className="flex items-center space-x-3">
          {currentSimulationTime && (
            <div className="text-sm px-3 py-1 rounded-md bg-gray-700 text-gray-300">
              Current Time: {formatDate(currentSimulationTime)}
            </div>
          )}
          <button
            onClick={() => {
              fetchCurrentSimulationTime();
              if (activeTab === "prediction") {
                fetchSimulationPrediction();
              }
            }}
            className="p-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
            title="Refresh data"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-700 overflow-x-auto">
        <button
          className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
            activeTab === "simulation"
              ? "border-b-2 border-indigo-500 text-white"
              : "text-gray-400 hover:text-gray-300"
          }`}
          onClick={() => setActiveTab("simulation")}
        >
          <div className="flex items-center space-x-2">
            <Zap size={16} />
            <span>Simulation</span>
          </div>
        </button>
        <button
          className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
            activeTab === "prediction"
              ? "border-b-2 border-indigo-500 text-white"
              : "text-gray-400 hover:text-gray-300"
          }`}
          onClick={() => setActiveTab("prediction")}
        >
          <div className="flex items-center space-x-2">
            <TrendingUp size={16} />
            <span>Prediction</span>
          </div>
        </button>
        <button
          className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
            activeTab === "current-time"
              ? "border-b-2 border-indigo-500 text-white"
              : "text-gray-400 hover:text-gray-300"
          }`}
          onClick={() => setActiveTab("current-time")}
        >
          <div className="flex items-center space-x-2">
            <Clock size={16} />
            <span>Current Time</span>
          </div>
        </button>
      </div>

      {/* Content based on active tab */}
      {activeTab === "simulation" && (
        <>
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
        </>
      )}

      {activeTab === "prediction" && (
        <div className="p-6 bg-gray-900">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-xl font-medium text-white">Simulation Prediction & Forecasting</h3>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-300">Days Ahead:</label>
                <input
                  type="number"
                  value={predictionDays}
                  onChange={(e) => setPredictionDays(Number(e.target.value))}
                  min="1"
                  max="365"
                  className="w-20 bg-gray-700 text-gray-100 border border-gray-600 rounded px-2 py-1 text-sm"
                />
              </div>
              <button
                onClick={fetchSimulationPrediction}
                disabled={isLoadingPrediction}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors text-sm disabled:opacity-50"
              >
                {isLoadingPrediction ? "Updating..." : "Update Prediction"}
              </button>
            </div>
          </div>

          {simulationPrediction ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Summary Stats */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <h4 className="text-md font-medium text-white mb-3">Prediction Summary</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-400">
                      {simulationPrediction.total_usage_predicted}
                    </div>
                    <div className="text-xs text-gray-400">Total Usage Predicted</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-400">
                      {simulationPrediction.waste_generation_estimate}
                    </div>
                    <div className="text-xs text-gray-400">Waste Items Expected</div>
                  </div>
                </div>
                <div className="mt-3 text-center">
                  <div className="text-sm text-gray-300">
                    {simulationPrediction.simulation_period}
                  </div>
                </div>
              </div>

              {/* Items Likely to Deplete */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <h4 className="text-md font-medium text-white mb-3 flex items-center">
                  <Zap size={16} className="mr-2 text-blue-500" />
                  Items Likely to Deplete ({simulationPrediction.items_likely_to_deplete.length})
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {simulationPrediction.items_likely_to_deplete.map((item, index) => (
                    <div key={index} className="bg-gray-700 rounded p-3 border border-gray-600">
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className="text-xs text-gray-400 mt-1">{item.category}</div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-blue-400">
                          {item.remaining_uses} uses left
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full text-white ${getUrgencyBadge(item.days_until_depletion)}`}>
                          {item.days_until_depletion} days
                        </span>
                      </div>
                      <div className="text-xs text-gray-300 mt-1">
                        Depletes: {formatDate(item.predicted_waste_date)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Items Likely to Expire */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <h4 className="text-md font-medium text-white mb-3 flex items-center">
                  <AlertTriangle size={16} className="mr-2 text-amber-500" />
                  Items Likely to Expire ({simulationPrediction.items_likely_to_expire.length})
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {simulationPrediction.items_likely_to_expire.map((item, index) => (
                    <div key={index} className="bg-gray-700 rounded p-3 border border-gray-600">
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className="text-xs text-gray-400 mt-1">{item.category}</div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-amber-400">
                          Expires in {item.days_until_expiry} days
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full text-white ${getUrgencyBadge(item.days_until_expiry)}`}>
                          {item.days_until_expiry} days
                        </span>
                      </div>
                      <div className="text-xs text-gray-300 mt-1">
                        Expires: {formatDate(item.predicted_waste_date)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center">
              <h3 className="text-xl font-medium text-gray-200 mb-3">
                No Prediction Data
              </h3>
              <p className="text-gray-400 max-w-md mx-auto mb-6">
                Click "Update Prediction" to see what will happen during simulation without actually running it.
              </p>
              <div className="flex flex-col gap-4 w-full max-w-md">
                <div className="flex items-center gap-3 bg-gray-800 rounded-md p-5 border-2 border-gray-700">
                  <TrendingUp size={20} className="text-indigo-400" />
                  <div className="text-left">
                    <p className="text-gray-300">Predict Outcomes</p>
                    <p className="text-xs text-gray-500">
                      See what will happen without running simulation
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-gray-800 rounded-md p-5 border-2 border-gray-700">
                  <Info size={20} className="text-green-400" />
                  <div className="text-left">
                    <p className="text-gray-300">Plan Ahead</p>
                    <p className="text-xs text-gray-500">
                      Identify items that need attention soon
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "current-time" && (
        <div className="p-6 bg-gray-900">
          <div className="max-w-2xl mx-auto">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-xl font-medium text-white mb-4">Current Simulation Time</h3>
              
              {currentSimulationTime ? (
                <div className="space-y-4">
                  <div className="bg-gray-700 rounded p-4">
                    <div className="text-sm text-gray-400 mb-1">Current Simulation Time</div>
                    <div className="text-2xl font-bold text-indigo-400">
                      {formatDate(currentSimulationTime)}
                    </div>
                    <div className="text-sm text-gray-300 mt-1">
                      {new Date(currentSimulationTime).toLocaleTimeString()}
                    </div>
                  </div>
                  
                  <div className="bg-gray-700 rounded p-4">
                    <div className="text-sm text-gray-400 mb-1">Real World Time</div>
                    <div className="text-2xl font-bold text-green-400">
                      {new Date().toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-300 mt-1">
                      {new Date().toLocaleTimeString()}
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-400 text-center">
                    The simulation time advances when you run simulations. 
                    This allows you to simulate future scenarios and see how items will behave over time.
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-400">
                  <Clock size={48} className="mx-auto mb-4 text-gray-600" />
                  <p>No simulation time available</p>
                  <p className="text-sm">Run a simulation to set the current time</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
