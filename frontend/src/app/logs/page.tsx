"use client";
import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { User, Clock, ArrowRight, RefreshCw, Filter, X } from "lucide-react";

// Define action types with labels for display
const actionTypes = [
  { value: "placement", label: "Placement" },
  { value: "rearrangement", label: "Rearrangement" },
  { value: "retrieval", label: "Retrieval" },
  { value: "update_location", label: "Update" },
  { value: "disposal_plan", label: "Disposal Plan" },
  { value: "disposal_complete", label: "Disposal Complete" },
  { value: "simulation_use", label: "Simulation Use" },
  { value: "simulation_expired", label: "Simulation Expired" },
  { value: "simulation_depleted", label: "Simulation Depleted" },
  { value: "import", label: "Import" },
  { value: "export", label: "Export" },
  { value: "reservation_created", label: "Reservation Created" },
  { value: "reservation_updated", label: "Reservation Updated" },
  { value: "reservation_cancelled", label: "Reservation Cancelled" },
  { value: "item_created", label: "Item Created" },
  { value: "item_updated", label: "Item Updated" },
  { value: "item_deleted", label: "Item Deleted" },
  { value: "container_created", label: "Container Created" },
  { value: "container_updated", label: "Container Updated" },
  { value: "container_deleted", label: "Container Deleted" },
];

// Action badge styling
const getActionBadge = (actionType: string) => {
  const action = actionTypes.find((a) => a.value === actionType);
  const label = action ? action.label : actionType;
  const styles: Record<string, string> = {
    placement: "bg-emerald-600",
    rearrangement: "bg-amber-500",
    retrieval: "bg-blue-500",
    update_location: "bg-purple-500",
    disposal_plan: "bg-rose-600",
    disposal_complete: "bg-rose-700",
    simulation_use: "bg-indigo-500",
    simulation_expired: "bg-red-600",
    simulation_depleted: "bg-red-700",
    import: "bg-green-600",
    export: "bg-cyan-500",
    reservation_created: "bg-emerald-500",
    reservation_updated: "bg-blue-500",
    reservation_cancelled: "bg-red-500",
    item_created: "bg-green-500",
    item_updated: "bg-blue-500",
    item_deleted: "bg-red-500",
    container_created: "bg-green-500",
    container_updated: "bg-blue-500",
    container_deleted: "bg-red-500",
  };
  const style = styles[actionType] || "bg-gray-600";
  return (
    <div
      className={`px-3 py-1 rounded-full ${style} text-white text-xs font-medium inline-flex items-center`}
    >
      {label}
    </div>
  );
};

// Row styling
const getRowStyle = (actionType: string) => {
  const styles: Record<string, string> = {
    placement: "border-l-4 border-emerald-500 hover:bg-emerald-600/30",
    rearrangement: "border-l-4 border-amber-500 hover:bg-amber-600/30",
    retrieval: "border-l-4 border-blue-500 hover:bg-blue-600/30",
    update_location: "border-l-4 border-purple-500 hover:bg-purple-600/30",
    disposal_plan: "border-l-4 border-rose-500 hover:bg-rose-600/30",
    disposal_complete: "border-l-4 border-rose-700 hover:bg-rose-700/30",
    simulation_use: "border-l-4 border-indigo-500 hover:bg-indigo-600/30",
    simulation_expired: "border-l-4 border-red-500 hover:bg-red-600/30",
    simulation_depleted: "border-l-4 border-red-700 hover:bg-red-700/30",
    import: "border-l-4 border-green-500 hover:bg-green-600/30",
    export: "border-l-4 border-cyan-500 hover:bg-cyan-600/30",
    reservation_created: "border-l-4 border-emerald-500 hover:bg-emerald-600/30",
    reservation_updated: "border-l-4 border-blue-500 hover:bg-blue-600/30",
    reservation_cancelled: "border-l-4 border-red-500 hover:bg-red-600/30",
    item_created: "border-l-4 border-green-500 hover:bg-green-600/30",
    item_updated: "border-l-4 border-blue-500 hover:bg-blue-600/30",
    item_deleted: "border-l-4 border-red-500 hover:bg-red-600/30",
    container_created: "border-l-4 border-green-500 hover:bg-green-600/30",
    container_updated: "border-l-4 border-blue-500 hover:bg-blue-600/30",
    container_deleted: "border-l-4 border-red-500 hover:bg-red-600/30",
  };
  return styles[actionType] || "border-l-4 border-gray-500 hover:bg-gray-700";
};

// Define Log interface
interface Log {
  log_id: string;
  action_type: string;
  action_category?: string;
  details: Record<string, any>;
  item_id: string | null;
  container_id?: string | null;
  reservation_id?: string | null;
  timestamp: string;
  user_id: string | null;
  user_name?: string | null;
  item_name?: string | null;
  success: boolean;
  error_message?: string | null;
  location?: string | null;
  session_id?: string | null;
}

// Dynamic details display with improved UI
const getDetails = (actionType: string, details: Record<string, any>) => {
  if (!details || Object.keys(details).length === 0) {
    return <div className="text-gray-400 text-sm">No details available</div>;
  }

  switch (actionType) {
    case "update_location":
      return (
        <div className="flex items-center space-x-2">
          <span className="px-2 py-1 bg-gray-700 text-white rounded text-xs">
            {details.fromContainer || "Unknown"}
          </span>
          <ArrowRight size={16} className="text-gray-400" />
          <span className="px-2 py-1 bg-gray-700 text-white rounded text-xs">
            {details.toContainer || "Unknown"}
          </span>
        </div>
      );
    case "placement":
    case "retrieval":
      return (
        <div className="space-y-2">
          {details.containerId && (
            <span className="px-2 py-1 bg-gray-700 text-white rounded text-xs">
              {details.containerId}
            </span>
          )}
          {details.position && (
            <div className="text-xs text-gray-400">
              ({details.position.startCoordinates?.width || 0},{" "}
              {details.position.startCoordinates?.height || 0},{" "}
              {details.position.startCoordinates?.depth || 0}){" to "}(
              {details.position.endCoordinates?.width || 0},{" "}
              {details.position.endCoordinates?.height || 0},{" "}
              {details.position.endCoordinates?.depth || 0})
            </div>
          )}
          {details.remainingUses !== undefined && (
            <div className="text-xs text-gray-400">
              Uses Left: {details.remainingUses}
            </div>
          )}
          {details.status_after && (
            <div className="text-xs text-gray-400">
              Status: {details.status_after}
            </div>
          )}
        </div>
      );
    case "simulation_use":
      return (
        <div className="space-y-1">
          {details.remainingUses !== undefined && (
            <div className="text-xs text-blue-400">
              Remaining Uses: {details.remainingUses}
            </div>
          )}
          {details.usage_frequency && (
            <div className="text-xs text-gray-400">
              Frequency: {details.usage_frequency}/day
            </div>
          )}
          {details.simulation_day && (
            <div className="text-xs text-gray-400">
              Day: {details.simulation_day}
            </div>
          )}
        </div>
      );
    case "simulation_expired":
      return (
        <div className="space-y-1">
          {details.reason && (
            <div className="text-xs text-red-400">
              {details.reason}
            </div>
          )}
          {details.simulation_day && (
            <div className="text-xs text-gray-400">
              Day: {details.simulation_day}
            </div>
          )}
          {details.expiry_date && (
            <div className="text-xs text-gray-400">
              Expired: {details.expiry_date}
            </div>
          )}
        </div>
      );
    case "simulation_depleted":
      return (
        <div className="space-y-1">
          {details.simulation_day && (
            <div className="text-xs text-gray-400">
              Day: {details.simulation_day}
            </div>
          )}
        </div>
      );
    case "export":
      return (
        <div className="space-y-1">
          {details.exportType === "items" ? (
            <div className="text-xs">Exported {details.itemCount || 0} items</div>
          ) : details.exportType === "containers" ? (
            <div className="text-xs">Exported {details.containerCount || 0} containers</div>
          ) : (
            <div className="text-xs">Exported data</div>
          )}
        </div>
      );
    case "reservation_created":
    case "reservation_updated":
    case "reservation_cancelled":
      return (
        <div className="space-y-1">
          {details.purpose && (
            <div className="text-xs text-blue-400">
              Purpose: {details.purpose}
            </div>
          )}
          {details.duration_hours && (
            <div className="text-xs text-gray-400">
              Duration: {details.duration_hours}h
            </div>
          )}
          {details.priority && (
            <div className="text-xs text-gray-400">
              Priority: {details.priority}
            </div>
          )}
        </div>
      );
    case "item_created":
    case "item_updated":
    case "item_deleted":
      return (
        <div className="space-y-1">
          {details.category && (
            <div className="text-xs text-blue-400">
              Category: {details.category}
            </div>
          )}
          {details.subcategory && (
            <div className="text-xs text-gray-400">
              Subcategory: {details.subcategory}
            </div>
          )}
          {details.status && (
            <div className="text-xs text-gray-400">
              Status: {details.status}
            </div>
          )}
        </div>
      );
    case "container_created":
    case "container_updated":
    case "container_deleted":
      return (
        <div className="space-y-1">
          {details.zone && (
            <div className="text-xs text-blue-400">
              Zone: {details.zone}
            </div>
          )}
          {details.max_mass && (
            <div className="text-xs text-gray-400">
              Max Mass: {details.max_mass}kg
            </div>
          )}
        </div>
      );
    default:
      return (
        <div className="space-y-1 max-w-xs">
          {Object.entries(details).map(([key, value]) => (
            <div key={key} className="text-xs">
              <span className="font-medium text-gray-300">{key}:</span>{" "}
              <span className="text-gray-400">
                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
              </span>
            </div>
          ))}
        </div>
      );
  }
};

// Format timestamp
const formatTimestamp = (timestamp: string) => {
  try {
    const date = new Date(timestamp);
    return {
      date: format(date, "MMM dd, yyyy"),
      time: format(date, "HH:mm:ss"),
    };
  } catch (e) {
    return { date: "Invalid date", time: "" };
  }
};

export default function LogsTable() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [itemId, setItemId] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [actionType, setActionType] = useState<string>("");
  const [filteredLogs, setFilteredLogs] = useState<Log[]>([]);
  const [showFilters, setShowFilters] = useState<boolean>(false);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:5000'}/api/logs`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch logs");
      }
      const data: { logs: Log[] } = await response.json();
      setLogs(data.logs);
      setFilteredLogs(data.logs);
      setLoading(false);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const applyFilters = () => {
    let filtered = [...logs];
    if (startDate) {
      const start = `${startDate}T00:00:00Z`;
      filtered = filtered.filter((log) => log.timestamp >= start);
    }
    if (endDate) {
      const end = `${endDate}T23:59:59Z`;
      filtered = filtered.filter((log) => log.timestamp <= end);
    }
    if (itemId) {
      filtered = filtered.filter((log) => log.item_id === itemId);
    }
    if (userId) {
      filtered = filtered.filter((log) => log.user_id === userId);
    }
    if (actionType) {
      filtered = filtered.filter((log) => log.action_type === actionType);
    }
    setFilteredLogs(filtered);
  };

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setItemId("");
    setUserId("");
    setActionType("");
    setFilteredLogs(logs);
  };

  if (loading) {
    return (
      <div className="w-full h-full bg-gray-800 text-gray-100 rounded-lg shadow-xl overflow-hidden">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-indigo-500 flex items-center justify-center mx-auto mb-4">
              <RefreshCw size={32} className="text-white animate-spin" />
            </div>
            <h3 className="text-xl font-medium text-gray-200 mb-2">Loading Logs</h3>
            <p className="text-gray-400">Please wait while we fetch the activity data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full bg-gray-800 text-gray-100 rounded-lg shadow-xl overflow-hidden">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center mx-auto mb-4">
              <X size={32} className="text-white" />
            </div>
            <h3 className="text-xl font-medium text-gray-200 mb-2">Error Loading Logs</h3>
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchLogs}
              className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gray-800 text-gray-100 rounded-lg shadow-xl overflow-hidden">
      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-md bg-indigo-500 flex items-center justify-center">
            <Clock size={18} className="text-white" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Activity Logs
          </h2>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-md px-3 py-1 rounded-md bg-gray-700 text-gray-300">
            {filteredLogs.length} entries
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-md transition-colors ${
              showFilters 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title="Toggle filters"
          >
            <Filter size={16} />
          </button>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="p-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 transition-colors disabled:opacity-50"
            title="Refresh logs"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="p-4 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white">Filters</h3>
            <button
              onClick={() => setShowFilters(false)}
              className="p-1 text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Item ID
              </label>
              <input
                type="text"
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
                placeholder="Enter item ID"
                className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                User ID
              </label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Enter user ID"
                className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Action Type
              </label>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded px-3 py-2"
              >
                <option value="">All Actions</option>
                {actionTypes.map((action) => (
                  <option key={action.value} value={action.value}>
                    {action.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end space-x-2">
              <button
                onClick={applyFilters}
                className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600 transition-colors"
              >
                Apply Filters
              </button>
              <button
                onClick={clearFilters}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

              <div className="overflow-x-auto">
          {filteredLogs.length > 0 ? (
            <>
              {/* Summary Statistics */}
              <div className="p-4 bg-gray-800 border-b border-gray-700">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-400">{filteredLogs.length}</div>
                    <div className="text-xs text-gray-400">Total Logs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">
                      {filteredLogs.filter(log => log.success).length}
                    </div>
                    <div className="text-xs text-gray-400">Successful</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-400">
                      {filteredLogs.filter(log => !log.success).length}
                    </div>
                    <div className="text-xs text-gray-400">Failed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">
                      {new Set(filteredLogs.map(log => log.user_id).filter(Boolean)).size}
                    </div>
                    <div className="text-xs text-gray-400">Unique Users</div>
                  </div>
                </div>
              </div>
              
                            <table className="w-full table-auto">
                <thead className="sticky top-0 z-10">
              <tr className="bg-gray-800 text-gray-300 border-b border-gray-700">
                <th className="px-4 py-3 text-left font-medium">
                  <div className="flex items-center space-x-2">
                    <Clock size={14} />
                    <span>Timestamp</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  <div className="flex items-center space-x-2">
                    <User size={14} />
                    <span>User</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-left font-medium">Action</th>
                <th className="px-4 py-3 text-left font-medium">Item</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, index) => {
                const { date, time } = formatTimestamp(log.timestamp);
                return (
                  <tr
                    key={log.log_id}
                    className={`${getRowStyle(
                      log.action_type
                    )} transition-all duration-150`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{date}</div>
                      <div className="text-xs text-gray-400">{time}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span>{log.user_name || log.user_id || "System"}</span>
                    </td>
                    <td className="px-4 py-3">
                      {getActionBadge(log.action_type)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm">
                        {log.item_name || log.item_id || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${log.success ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className={`text-xs ${log.success ? 'text-green-400' : 'text-red-400'}`}>
                          {log.success ? 'Success' : 'Failed'}
                        </span>
                      </div>
                      {log.error_message && (
                        <div className="text-xs text-red-400 mt-1 max-w-xs truncate" title={log.error_message}>
                          {log.error_message}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {getDetails(log.action_type, log.details)}
                    </td>
                  </tr>
                );
              })}
                </tbody>
              </table>
            </>
          ) : (
          <div className="flex flex-col items-center justify-center min-h-[400px] py-10">
            <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center mb-4">
              <Clock size={32} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-medium text-gray-300 mb-2">
              No logs to display
            </h3>
            <p className="text-sm text-gray-400 text-center max-w-md">
              {startDate || endDate || itemId || userId || actionType
                ? "Try adjusting your filters to see more results"
                : "There are no activity logs in the system yet"}
            </p>
            {startDate || endDate || itemId || userId || actionType ? (
              <button
                onClick={clearFilters}
                className="mt-4 bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600 transition-colors"
              >
                Clear All Filters
              </button>
            ) : (
              <button
                onClick={fetchLogs}
                className="mt-4 bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600 transition-colors"
              >
                Refresh Logs
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
