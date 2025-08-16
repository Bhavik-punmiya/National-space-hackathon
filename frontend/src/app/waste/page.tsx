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
} from "lucide-react";
import toast from "react-hot-toast";

interface WasteItem {
  item_id: string;
  name: string;
  reason: string;
  container_id: string;
  position: {
    startCoordinates: { width: number; depth: number; height: number };
    endCoordinates: { width: number; depth: number; height: number };
  };
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
  }[];
  totalVolume: number;
  totalWeight: number;
}

interface ReturnPlanData {
  returnPlan: ReturnPlanItem[];
  retrievalSteps: ReturnStep[];
  returnManifest: ReturnManifest;
}

// Helper function to format reason with appropriate styling
const getReasonBadge = (reason: string) => {
  const styles = {
    Expired: "bg-amber-600",
    "Out of Uses": "bg-blue-600",
    Malfunctioning: "bg-purple-600",
    Contaminated: "bg-rose-600",
    Clogged: "bg-emerald-600",
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

export default function WasteManagement() {
  const [wasteItems, setWasteItems] = useState<WasteItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [undockingContainerId, setUndockingContainerId] = useState("");
  const [undockingDate, setUndockingDate] = useState("");
  const [maxWeight, setMaxWeight] = useState<number | string>("");
  const [returnPlanData, setReturnPlanData] = useState<ReturnPlanData | null>(
    null
  );
  const [showReturnPlan, setShowReturnPlan] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "inventory" | "steps" | "manifest"
  >("inventory");

  // Get current date in YYYY-MM-DD format
  const currentDate = new Date().toISOString().split("T")[0];

  // Fetch waste items
  const fetchWasteItems = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/waste/identify`,
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

  // Generate return plan
  const generateReturnPlan = async () => {
    if (!undockingContainerId || !undockingDate || !maxWeight) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/waste/return-plan`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            undockingContainerId,
            undockingDate,
            maxWeight: Number(maxWeight),
          }),
        }
      );
      const data = await response.json();
      if (!data.success) throw new Error("Failed to generate return plan");

      setReturnPlanData(data);
      const selectedItemIds = data.returnManifest.returnItems.map(
        (item: any) => item.itemId
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
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/waste/complete-undocking`,
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

  // Load waste items on mount
  useEffect(() => {
    fetchWasteItems();
  }, []);

  // Reset states
  const resetStates = () => {
    setUndockingContainerId("");
    setUndockingDate("");
    setMaxWeight("");
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

  return (
    <div className="w-full h-full min-h-[100vh] bg-gray-800 text-gray-100 rounded-lg shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-md bg-rose-600 flex items-center justify-center">
            <Trash2 size={20} className="text-white" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Waste Management System
          </h2>
        </div>
        <div className="text-md px-3 mr-2 py-1 rounded-md bg-gray-700 text-gray-300">
          {wasteItems.length} items pending
        </div>
      </div>

      {/* Container Selection Section */}
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
              className="mt-1 block w-full px-3 py-2 bg-black/20 border border-gray-700 
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <div>{returnPlanData.returnManifest.totalVolume} m³</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      {showReturnPlan && returnPlanData && (
        <div className="flex border-b border-gray-700">
          <button
            className={`px-4 py-3 text-sm font-medium ${
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
            className={`px-4 py-3 text-sm font-medium ${
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
            className={`px-4 py-3 text-sm font-medium ${
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
        </div>
      )}

      {/* Content based on active tab */}
      <div className="overflow-x-auto">
        {activeTab === "inventory" && (
          <table className="w-full table-auto">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-800 text-gray-300 border-b border-gray-700">
                <th className="px-4 py-3 text-left font-medium">Item ID</th>
                <th className="px-4 py-3 text-left font-medium">Item Name</th>
                <th className="px-4 py-3 text-left font-medium">Reason</th>
                <th className="px-4 py-3 text-left font-medium">
                  Container ID
                </th>
                <th className="px-4 py-3 text-left font-medium">Position</th>
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
                    <td className="px-4 py-3">{getReasonBadge(item.reason)}</td>
                    <td className="px-4 py-3">
                      {getIdBadge(item.container_id)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {formatPosition(item.position)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">
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
                        className="bg-gray-800 rounded p-3 border border-gray-700 flex items-center space-x-3"
                      >
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="flex items-center space-x-2 text-sm">
                            {getIdBadge(item.item_id)}
                            <span className="text-gray-500">•</span>
                            <span className="text-gray-400">{item.reason}</span>
                          </div>
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
                    {returnPlanData.returnManifest.totalVolume} m³
                  </div>
                </div>
              </div>
            </div>
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
