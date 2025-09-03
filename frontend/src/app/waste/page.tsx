"use client";
import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Trash2,
  Package,
  Clock,
  AlertTriangle,
  Calendar,
  Weight,
  BarChart3,
  TrendingUp,
  RefreshCw,
  Box,
  Zap,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import toast from "react-hot-toast";

interface WasteItem {
  item_id: string;
  name: string;
  category: string;
  subcategory: string;
  reason: string;
  container_id: string;
  position: {
    startCoordinates: { width: number; depth: number; height: number };
    endCoordinates: { width: number; depth: number; height: number };
  };
  expiry_date?: string;
  current_uses: number;
  maximum_uses?: number;
  selected?: boolean;
}

interface ReturnStep {
  step: number;
  action: string;
  item_id: string;
  itemName: string;
}

interface ReturnPlanItem {
  step: number;
  item_id: string;
  itemName: string;
  fromContainer: string;
  toContainer: string;
}

interface ReturnManifest {
  undockingContainerId: string;
  undockingDate: string;
  returnItems: {
    item_id: string;
    name: string;
    reason: string;
    category: string;
    subcategory: string;
    mass_kg: number;
    volume_cm3: number;
  }[];
  totalVolume: number;
  totalWeight: number;
}

interface ReturnPlanData {
  returnPlan: ReturnPlanItem[];
  retrievalSteps: ReturnStep[];
  returnManifest: ReturnManifest;
}

interface WastePrediction {
  items_expiring_soon: Array<{
    item_id: string;
    name: string;
    category: string;
    subcategory: string;
    days_until_expiry: number;
    expiry_date: string;
    priority: number;
    recommendation: string;
  }>;
  items_depleting_soon: Array<{
    item_id: string;
    name: string;
    category: string;
    subcategory: string;
    current_uses: number;
    maximum_uses: number;
    remaining_uses: number;
    usage_frequency: number;
    days_until_depletion: number;
    recommendation: string;
  }>;
  resupply_recommendations: Array<{
    item_id: string;
    name: string;
    category: string;
    urgency: string;
    days_until_depletion: number;
    recommended_quantity: string;
  }>;
  total_predictions: number;
}

interface WasteAnalytics {
  period: string;
  total_waste_items: number;
  waste_by_reason: Record<string, number>;
  waste_by_category: Record<string, number>;
  waste_by_container: Record<string, number>;
  daily_waste_trend: Array<{
    date: string;
    waste_count: number;
  }>;
  top_waste_generators: Array<[string, number]>;
}

// Helper function to format reason with appropriate styling
const getReasonBadge = (reason: string) => {
  const styles = {
    Expired: "bg-amber-600",
    "Out of Uses": "bg-blue-600",
    Broken: "bg-purple-600",
    "Expires in 7 days": "bg-red-600",
    "Expires in 15 days": "bg-orange-600",
    "Expires in 30 days": "bg-yellow-600",
  };

  const badgeStyle = styles[reason as keyof typeof styles] || "bg-gray-600";

  return (
    <span
      className={`px-2 py-1 rounded-full ${badgeStyle} text-white text-xs font-medium`}
    >
      {reason}
    </span>
  );
};

// Helper function to render IDs in badges
const getIdBadge = (id: string) => (
  <span className="px-2 py-1 bg-gray-700 text-gray-200 text-xs font-mono rounded">
    {id}
  </span>
);

// Helper function to format position coordinates
const formatPosition = (position: WasteItem["position"]) => {
  const { startCoordinates, endCoordinates } = position;
  return `${startCoordinates.width}x${startCoordinates.depth}x${startCoordinates.height} - ${endCoordinates.width}x${endCoordinates.depth}x${endCoordinates.height}`;
};

// Helper function to get urgency badge
const getUrgencyBadge = (urgency: string) => {
  const styles = {
    CRITICAL: "bg-red-600",
    HIGH: "bg-orange-600",
    MEDIUM: "bg-yellow-600",
  };

  const badgeStyle = styles[urgency as keyof typeof styles] || "bg-gray-600";

  return (
    <span
      className={`px-2 py-1 rounded-full ${badgeStyle} text-white text-xs font-medium`}
    >
      {urgency}
    </span>
  );
};

export default function WasteManagement() {
  // Add debugging and fallback for environment variable
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:5000';
  console.log('WasteManagement: Base URL:', baseUrl);
  
  const [wasteItems, setWasteItems] = useState<WasteItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [undockingContainerId, setUndockingContainerId] = useState("");
  const [undockingDate, setUndockingDate] = useState("");
  const [maxWeight, setMaxWeight] = useState<number | string>("");
  const [maxVolume, setMaxVolume] = useState<number | string>("");
  const [returnPlanData, setReturnPlanData] = useState<ReturnPlanData | null>(null);
  const [showReturnPlan, setShowReturnPlan] = useState(false);
  const [activeTab, setActiveTab] = useState<"inventory" | "steps" | "manifest" | "prediction" | "analytics">("inventory");
  
  // New state for enhanced features
  const [wastePrediction, setWastePrediction] = useState<WastePrediction | null>(null);
  const [wasteAnalytics, setWasteAnalytics] = useState<WasteAnalytics | null>(null);
  const [predictionDays, setPredictionDays] = useState(30);
  const [analyticsDays, setAnalyticsDays] = useState(30);
  const [includeExpiringSoon, setIncludeExpiringSoon] = useState(true);
  const [expiringThreshold, setExpiringThreshold] = useState(30);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedUrgency, setSelectedUrgency] = useState<string>("");

  // Get current date in YYYY-MM-DD format
  const currentDate = new Date().toISOString().split("T")[0];

  // Fetch waste items with enhanced parameters
  const fetchWasteItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        include_expiring_soon: includeExpiringSoon.toString(),
        expiring_days_threshold: expiringThreshold.toString(),
      });

      const response = await fetch(
        `${baseUrl}/api/waste/identify?${params}`,
        {
          method: "GET",
        }
      );
      const data = await response.json();
      if (!data.success) throw new Error("Failed to fetch waste items");
      setWasteItems(
        data.wasteItems.map((item: WasteItem) => ({ ...item, selected: false }))
      );
      setLoading(false);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  // Fetch waste prediction
  const fetchWastePrediction = async () => {
    try {
      const response = await fetch(
        `${baseUrl}/api/waste/predict?days_ahead=${predictionDays}`,
        {
          method: "GET",
        }
      );
      const data = await response.json();
      if (data.success) {
        setWastePrediction(data.predictions);
      }
    } catch (err) {
      console.error("Failed to fetch waste prediction:", err);
    }
  };

  // Fetch waste analytics
  const fetchWasteAnalytics = async () => {
    try {
      const response = await fetch(
        `${baseUrl}/api/waste/analytics?days_back=${analyticsDays}`,
        {
          method: "GET",
        }
      );
      const data = await response.json();
      if (data.success) {
        setWasteAnalytics(data.analytics);
      }
    } catch (err) {
      console.error("Failed to fetch waste analytics:", err);
    }
  };

  // Generate return plan with volume support
  const generateReturnPlan = async () => {
    if (!undockingContainerId || !undockingDate || !maxWeight) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const requestBody: any = {
        undockingContainerId,
        undockingDate,
        maxWeight: Number(maxWeight),
        user_id: "astronaut_001", // This should come from auth context
      };

      if (maxVolume) {
        requestBody.maxVolume = Number(maxVolume);
      }

      const response = await fetch(
        `${baseUrl}/api/waste/return-plan`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        }
      );
      const data = await response.json();
      if (!data.success) throw new Error("Failed to generate return plan");

      setReturnPlanData(data);
      const selectedItemIds = data.returnManifest.returnItems.map(
        (item: any) => item.item_id
      );
      setWasteItems((prevItems) =>
        prevItems.map((item) => ({
          ...item,
          selected: selectedItemIds.includes(item.item_id),
        }))
      );
      setShowReturnPlan(true);
      setLoading(false);
      setActiveTab("inventory");
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  // Complete undocking
  const completeUndocking = async () => {
    if (!returnPlanData || !undockingContainerId) {
      setError("No return plan available");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${baseUrl}/api/waste/complete-undocking`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            undockingContainerId,
            timestamp: new Date().toISOString(),
          }),
        }
      );
      const data = await response.json();
      if (!data.success) {
        toast.error("Failed to complete undocking");
        throw new Error("Failed to complete undocking");
      }

      toast.success(`Successfully removed ${data.itemsRemoved} items`);
      setReturnPlanData(null);
      setShowReturnPlan(false);
      await fetchWasteItems(); // Refresh the table
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    fetchWasteItems();
    fetchWastePrediction();
    fetchWasteAnalytics();
  }, []);

  // Reset states
  const resetStates = () => {
    setUndockingContainerId("");
    setUndockingDate("");
    setMaxWeight("");
    setMaxVolume("");
    setReturnPlanData(null);
    setShowReturnPlan(false);
    setActiveTab("inventory");
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM dd, yyyy");
    } catch (e) {
      return "Invalid date";
    }
  };

  // Calculate volume from position
  const calculateVolume = (position: WasteItem["position"]) => {
    const { startCoordinates, endCoordinates } = position;
    const width = endCoordinates.width - startCoordinates.width;
    const depth = endCoordinates.depth - startCoordinates.depth;
    const height = endCoordinates.height - startCoordinates.height;
    return (width * depth * height).toFixed(2);
  };

  return (
    <div className="w-full h-full min-h-[100vh] bg-gray-800 text-gray-100 rounded-lg shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-md bg-rose-600 flex items-center justify-center">
            <Trash2 size={20} className="text-white" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Enhanced Waste Management System
          </h2>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-md px-3 py-1 rounded-md bg-gray-700 text-gray-300">
            {wasteItems.length} items pending
          </div>
          <button
            onClick={() => {
              fetchWasteItems();
              fetchWastePrediction();
              fetchWasteAnalytics();
            }}
            className="p-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
            title="Refresh data"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Enhanced Container Selection Section */}
      <div
        className={`p-4 bg-gray-800 border-b border-gray-700 ${
          showReturnPlan ? "opacity-60" : ""
        }`}
      >
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Disposal Container ID
            </label>
            <input
              type="text"
              value={undockingContainerId}
              onChange={(e) => setUndockingContainerId(e.target.value)}
              placeholder="e.g. WASTE-001"
              disabled={showReturnPlan}
              className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              <div className="flex items-center space-x-1">
                <Calendar size={14} />
                <span>Undocking Date</span>
              </div>
            </label>
            <input
              type="date"
              className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 
                rounded-md text-gray-300 shadow-sm focus:border-indigo-500 focus:ring 
                focus:ring-indigo-500/20 focus:ring-opacity-50"
              value={undockingDate}
              onChange={(e) => setUndockingDate(e.target.value)}
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              <div className="flex items-center space-x-1">
                <Weight size={14} />
                <span>Max Weight (kg)</span>
              </div>
            </label>
            <input
              type="number"
              value={maxWeight}
              onChange={(e) => setMaxWeight(e.target.value)}
              min="0"
              step="0.1"
              placeholder="Enter max weight"
              disabled={showReturnPlan}
              className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              <div className="flex items-center space-x-1">
                <Box size={14} />
                <span>Max Volume (cm³)</span>
              </div>
            </label>
            <input
              type="number"
              value={maxVolume}
              onChange={(e) => setMaxVolume(e.target.value)}
              min="0"
              step="0.1"
              placeholder="Optional"
              disabled={showReturnPlan}
              className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            />
          </div>
          <div className="flex items-end">
            {!showReturnPlan ? (
              <button
                onClick={generateReturnPlan}
                disabled={!undockingContainerId || !undockingDate || !maxWeight}
                className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600 transition-colors duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                Generate Return Plan
              </button>
            ) : (
              <button
                onClick={completeUndocking}
                className="bg-rose-600 text-white px-4 py-2 rounded hover:bg-rose-700 transition-colors duration-200"
              >
                Complete Undocking
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Filter Controls */}
      <div className="p-4 bg-gray-900/50 border-b border-gray-700">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-300">Include Expiring Soon:</label>
            <input
              type="checkbox"
              checked={includeExpiringSoon}
              onChange={(e) => setIncludeExpiringSoon(e.target.checked)}
              className="rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-300">Expiring Threshold (days):</label>
            <input
              type="number"
              value={expiringThreshold}
              onChange={(e) => setExpiringThreshold(Number(e.target.value))}
              min="1"
              max="365"
              className="w-20 bg-gray-700 text-gray-100 border border-gray-600 rounded px-2 py-1 text-sm"
            />
          </div>
          <button
            onClick={fetchWasteItems}
            className="px-3 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors text-sm"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 bg-rose-900/30 border border-rose-800 text-rose-200 flex items-center m-4 rounded">
          <AlertTriangle size={16} className="mr-2" />
          {error}
        </div>
      )}

      {/* Return Plan Stats */}
      {showReturnPlan && returnPlanData && (
        <div className="p-4 bg-gray-900/50 border-b border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-gray-700/50 rounded p-3">
              <div className="text-gray-400 text-sm">Container</div>
              <div>
                {getIdBadge(returnPlanData.returnManifest.undockingContainerId)}
              </div>
            </div>
            <div className="bg-gray-700/50 rounded p-3">
              <div className="text-gray-400 text-sm">Scheduled Date</div>
              <div>
                {formatDate(returnPlanData.returnManifest.undockingDate)}
              </div>
            </div>
            <div className="bg-gray-700/50 rounded p-3">
              <div className="text-gray-400 text-sm">Total Weight</div>
              <div>{returnPlanData.returnManifest.totalWeight} kg</div>
            </div>
            <div className="bg-gray-700/50 rounded p-3">
              <div className="text-gray-400 text-sm">Total Volume</div>
              <div>{returnPlanData.returnManifest.totalVolume} cm³</div>
            </div>
            <div className="bg-gray-700/50 rounded p-3">
              <div className="text-gray-400 text-sm">Items Count</div>
              <div>{returnPlanData.returnManifest.returnItems.length}</div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Tabs Navigation */}
      <div className="flex border-b border-gray-700 overflow-x-auto">
        <button
          className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
            activeTab === "inventory"
              ? "border-b-2 border-indigo-500 text-white"
              : "text-gray-400 hover:text-gray-300"
          }`}
          onClick={() => setActiveTab("inventory")}
        >
          <div className="flex items-center space-x-2">
            <Package size={16} />
            <span>Inventory</span>
          </div>
        </button>
        <button
          className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
            activeTab === "steps"
              ? "border-b-2 border-indigo-500 text-white"
              : "text-gray-400 hover:text-gray-300"
          }`}
          onClick={() => setActiveTab("steps")}
        >
          <div className="flex items-center space-x-2">
            <Clock size={16} />
            <span>Retrieval Steps</span>
          </div>
        </button>
        <button
          className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
            activeTab === "manifest"
              ? "border-b-2 border-indigo-500 text-white"
              : "text-gray-400 hover:text-gray-300"
          }`}
          onClick={() => setActiveTab("manifest")}
        >
          <div className="flex items-center space-x-2">
            <Package size={16} />
            <span>Manifest</span>
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
            activeTab === "analytics"
              ? "border-b-2 border-indigo-500 text-white"
              : "text-gray-400 hover:text-gray-300"
          }`}
          onClick={() => setActiveTab("analytics")}
        >
          <div className="flex items-center space-x-2">
            <BarChart3 size={16} />
            <span>Analytics</span>
          </div>
        </button>
      </div>

      {/* Content based on active tab */}
      <div className="overflow-x-auto flex-1">
        {activeTab === "inventory" && (
          <table className="w-full table-auto">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-800 text-gray-300 border-b border-gray-700">
                <th className="px-4 py-3 text-left font-medium">Item ID</th>
                <th className="px-4 py-3 text-left font-medium">Item Name</th>
                <th className="px-4 py-3 text-left font-medium">Category</th>
                <th className="px-4 py-3 text-left font-medium">Reason</th>
                <th className="px-4 py-3 text-left font-medium">Container ID</th>
                <th className="px-4 py-3 text-left font-medium">Position</th>
                <th className="px-4 py-3 text-left font-medium">Volume (cm³)</th>
                <th className="px-4 py-3 text-left font-medium">Usage</th>
                <th className="px-4 py-3 text-left font-medium">Expiry</th>
              </tr>
            </thead>
            <tbody>
              {wasteItems.length > 0 ? (
                wasteItems.map((item, index) => (
                  <tr
                    key={index}
                    className={`border-l-4 ${
                      item.selected
                        ? "border-red-600 bg-red-900/20 hover:bg-red-900/30"
                        : "border-gray-700 hover:bg-gray-700/30"
                    } transition-all duration-150`}
                  >
                    <td className="px-4 py-3">{getIdBadge(item.item_id)}</td>
                    <td className="px-4 py-3 font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      <div>{item.category}</div>
                      <div className="text-xs text-gray-500">{item.subcategory}</div>
                    </td>
                    <td className="px-4 py-3">{getReasonBadge(item.reason)}</td>
                    <td className="px-4 py-3">
                      {getIdBadge(item.container_id)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {formatPosition(item.position)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {calculateVolume(item.position)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {item.current_uses}/{item.maximum_uses || "∞"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {item.expiry_date && item.expiry_date !== "N/A" 
                        ? formatDate(item.expiry_date)
                        : "N/A"
                      }
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-gray-400">
                    No waste items found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {activeTab === "steps" && returnPlanData && (
          <div className="p-4">
            <h3 className="text-lg font-medium text-white mb-4">
              Retrieval Steps
            </h3>
            <ol className="relative border-l border-gray-600 ml-4">
              {returnPlanData.retrievalSteps.map((step, index) => (
                <li key={index} className="mb-6 ml-6">
                  <span
                    className={`absolute flex items-center justify-center w-6 h-6 rounded-full -left-3 bg-gray-600`}
                  >
                    <Package size={14} className="text-white" />
                  </span>
                  <div className="bg-gray-700/40 p-3 rounded border border-gray-700">
                    <h4 className="text-lg font-semibold text-white">
                      Step {step.step}:{" "}
                      {step.action.charAt(0).toUpperCase() +
                        step.action.slice(1)}
                    </h4>
                    <div className="mt-2">
                      <div className="text-sm text-gray-300">
                        {getIdBadge(step.item_id)}
                      </div>
                      <div className="text-gray-300">{step.itemName}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {activeTab === "manifest" && returnPlanData && (
          <div className="p-4">
            <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-700">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-white mb-2">
                  Disposal Manifest
                </h3>
                <div className="text-gray-300">
                  The following items will be removed and placed in container{" "}
                  {getIdBadge(
                    returnPlanData.returnManifest.undockingContainerId
                  )}{" "}
                  for disposal on{" "}
                  {formatDate(returnPlanData.returnManifest.undockingDate)}.
                </div>
              </div>

              <div className="border-t border-gray-700 pt-4 mt-4">
                <h4 className="text-md font-medium text-white mb-2">
                  Items for Disposal
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {returnPlanData.returnManifest.returnItems.map(
                    (item, index) => (
                      <div
                        key={index}
                        className="bg-gray-800 rounded p-3 border border-gray-700"
                      >
                        <div className="font-medium">{item.name}</div>
                        <div className="flex items-center space-x-2 text-sm mt-1">
                          {getIdBadge(item.item_id)}
                          <span className="text-gray-500">•</span>
                          <span className="text-gray-400">{item.category}</span>
                          <span className="text-gray-500">•</span>
                          <span className="text-gray-400">{item.reason}</span>
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-gray-500 mt-2">
                          <span>Mass: {item.mass_kg} kg</span>
                          <span>Volume: {item.volume_cm3} cm³</span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="border-t border-gray-700 pt-4 mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-400 mb-1">Total Weight</div>
                  <div className="text-xl font-medium">
                    {returnPlanData.returnManifest.totalWeight} kg
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">Total Volume</div>
                  <div className="text-xl font-medium">
                    {returnPlanData.returnManifest.totalVolume} cm³
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "prediction" && (
          <div className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">Waste Prediction & Forecasting</h3>
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
                  onClick={fetchWastePrediction}
                  className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors text-sm"
                >
                  Update Prediction
                </button>
              </div>
            </div>

            {wastePrediction && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Items Expiring Soon */}
                <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-700">
                  <h4 className="text-md font-medium text-white mb-3 flex items-center">
                    <AlertCircle size={16} className="mr-2 text-amber-500" />
                    Items Expiring Soon ({wastePrediction.items_expiring_soon.length})
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {wastePrediction.items_expiring_soon.map((item, index) => (
                      <div key={index} className="bg-gray-800 rounded p-3 border border-gray-700">
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="text-xs text-gray-400 mt-1">{item.category} • {item.subcategory}</div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-amber-400">
                            Expires in {item.days_until_expiry} days
                          </span>
                          <span className="text-xs text-gray-500">
                            Priority: {item.priority}
                          </span>
                        </div>
                        <div className="text-xs text-gray-300 mt-1">{item.recommendation}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Items Depleting Soon */}
                <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-700">
                  <h4 className="text-md font-medium text-white mb-3 flex items-center">
                    <Zap size={16} className="mr-2 text-blue-500" />
                    Items Depleting Soon ({wastePrediction.items_depleting_soon.length})
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {wastePrediction.items_depleting_soon.map((item, index) => (
                      <div key={index} className="bg-gray-800 rounded p-3 border border-gray-700">
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="text-xs text-gray-400 mt-1">{item.category} • {item.subcategory}</div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-blue-400">
                            {item.remaining_uses} uses left
                          </span>
                          <span className="text-xs text-gray-500">
                            {item.days_until_depletion} days
                          </span>
                        </div>
                        <div className="text-xs text-gray-300 mt-1">{item.recommendation}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Resupply Recommendations */}
                <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-700 lg:col-span-2">
                  <h4 className="text-md font-medium text-white mb-3 flex items-center">
                    <CheckCircle size={16} className="mr-2 text-green-500" />
                    Resupply Recommendations ({wastePrediction.resupply_recommendations.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {wastePrediction.resupply_recommendations.map((item, index) => (
                      <div key={index} className="bg-gray-800 rounded p-3 border border-gray-700">
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="text-xs text-gray-400 mt-1">{item.category}</div>
                        <div className="flex items-center justify-between mt-2">
                          {getUrgencyBadge(item.urgency)}
                          <span className="text-xs text-gray-500">
                            {item.days_until_depletion} days
                          </span>
                        </div>
                        <div className="text-xs text-gray-300 mt-1">{item.recommended_quantity}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">Waste Analytics</h3>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-300">Days Back:</label>
                  <input
                    type="number"
                    value={analyticsDays}
                    onChange={(e) => setAnalyticsDays(Number(e.target.value))}
                    min="1"
                    max="365"
                    className="w-20 bg-gray-700 text-gray-100 border border-gray-600 rounded px-2 py-1 text-sm"
                  />
                </div>
                <button
                  onClick={fetchWasteAnalytics}
                  className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors text-sm"
                >
                  Update Analytics
                </button>
              </div>
            </div>

            {wasteAnalytics && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Summary Stats */}
                <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-700">
                  <h4 className="text-md font-medium text-white mb-3">Summary</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-indigo-400">
                        {wasteAnalytics.total_waste_items}
                      </div>
                      <div className="text-xs text-gray-400">Total Waste Items</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">
                        {wasteAnalytics.period}
                      </div>
                      <div className="text-xs text-gray-400">Analysis Period</div>
                    </div>
                  </div>
                </div>

                {/* Top Waste Generators */}
                <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-700">
                  <h4 className="text-md font-medium text-white mb-3">Top Waste Generators</h4>
                  <div className="space-y-2">
                    {wasteAnalytics.top_waste_generators.slice(0, 5).map(([container, count], index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm text-gray-300">{container}</span>
                        <span className="text-sm font-medium text-red-400">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Waste by Reason */}
                <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-700">
                  <h4 className="text-md font-medium text-white mb-3">Waste by Reason</h4>
                  <div className="space-y-2">
                    {Object.entries(wasteAnalytics.waste_by_reason).map(([reason, count]) => (
                      <div key={reason} className="flex items-center justify-between">
                        <span className="text-sm text-gray-300">{reason}</span>
                        <span className="text-sm font-medium text-blue-400">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Waste by Category */}
                <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-700">
                  <h4 className="text-md font-medium text-white mb-3">Waste by Category</h4>
                  <div className="space-y-2">
                    {Object.entries(wasteAnalytics.waste_by_category).map(([category, count]) => (
                      <div key={category} className="flex items-center justify-between">
                        <span className="text-sm text-gray-300">{category}</span>
                        <span className="text-sm font-medium text-green-400">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Daily Trend */}
                <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-700 lg:col-span-2">
                  <h4 className="text-md font-medium text-white mb-3">Daily Waste Trend</h4>
                  <div className="flex space-x-1 overflow-x-auto">
                    {wasteAnalytics.daily_waste_trend.map((day, index) => (
                      <div key={index} className="flex flex-col items-center min-w-[60px]">
                        <div className="text-xs text-gray-400 mb-1">
                          {format(new Date(day.date), "MM/dd")}
                        </div>
                        <div 
                          className="w-8 bg-indigo-500 rounded-t"
                          style={{ height: `${Math.max(day.waste_count * 10, 4)}px` }}
                        ></div>
                        <div className="text-xs text-gray-300 mt-1">
                          {day.waste_count}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-gray-800 rounded-lg p-6 shadow-lg flex items-center space-x-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            <p className="text-gray-200">Processing request...</p>
          </div>
        </div>
      )}
    </div>
  );
}
