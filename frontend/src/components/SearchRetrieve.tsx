"use client";
import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  Clock,
  MapPin,
  Box,
  Loader2,
  CheckCircle,
  XCircle,
  ChevronRight,
  Calendar,
  User,
} from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface Item {
  item_id: string;
  name: string;
  container_id?: string;
  zone?: string;
  position?: {
    startCoordinates: {
      width: number;
      depth: number;
      height: number;
    };
    endCoordinates: {
      width: number;
      depth: number;
      height: number;
    };
  };
}

interface RetrievalStep {
  step: number;
  action: "remove" | "setAside" | "retrieve" | "placeBack";
  item_id: string;
  itemName: string;
}

interface SearchResponse {
  success: boolean;
  found: boolean;
  item?: Item;
  retrievalSteps: RetrievalStep[];
}

interface RetrieveResponse {
  success: boolean;
}

interface Reservation {
  reservation_id: string;
  item_id: string;
  user_id: string;
  user_name: string;
  purpose: string;
  start_time: string;
  end_time: string;
  status: string;
  priority: number;
  notes?: string;
}

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item | undefined;
  onSchedule: (reservationData: any) => void;
  isScheduling: boolean;
  itemReservations: Reservation[];
  userId: string;
}

// Schedule Modal Component
function ScheduleModal({ isOpen, onClose, item, onSchedule, isScheduling, itemReservations, userId }: ScheduleModalProps) {
  const [formData, setFormData] = useState({
    purpose: "",
    start_time: "",
    end_time: "",
    priority: 50,
    notes: "",
    user_id: userId,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    const reservationData = {
      item_id: item.item_id,
      ...formData,
      is_recurring: false,
    };

    onSchedule(reservationData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-4 w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Schedule Item</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <XCircle size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-6 mb-4">
            {/* Left Column - Scheduling Form */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Item
                </label>
                <div className="bg-gray-700 px-3 py-2 rounded-md text-white text-sm">
                  {item?.name} ({item?.item_id})
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Purpose *
                </label>
                <input
                  type="text"
                  required
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  placeholder="e.g., EVA Preparation, Experiment XYZ"
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Start Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-2 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    End Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-2 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm"
                >
                  <option value={10}>10 - Very Low</option>
                  <option value={25}>25 - Low</option>
                  <option value={50}>50 - Medium</option>
                  <option value={75}>75 - High</option>
                  <option value={90}>90 - Very High</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional details..."
                  rows={2}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>
            </div>

            {/* Right Column - Timeline of Existing Schedules */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-300 mb-2">Existing Schedules</h3>
                             <div className="bg-gray-700 rounded-md p-3 max-h-48 overflow-y-auto">
                 {itemReservations.filter((r: Reservation) => r.status === "ACTIVE").length > 0 ? (
                   <div className="space-y-2">
                     {itemReservations
                       .filter((r: Reservation) => r.status === "ACTIVE")
                       .map((reservation: Reservation, idx: number) => (
                        <div key={idx} className="p-2 bg-gray-600 rounded text-xs">
                          <div className="flex items-center text-amber-300 mb-1">
                            <User size={10} className="mr-1" />
                            <span className="font-medium">{reservation.user_name}</span>
                            <span className="ml-auto bg-amber-800/30 px-1 py-0.5 rounded text-xs">
                              P: {reservation.priority}
                            </span>
                          </div>
                          <div className="text-amber-200 text-xs mb-1">
                            {reservation.purpose}
                          </div>
                          <div className="text-amber-300/70 text-xs space-y-1">
                            <div className="flex items-center">
                              <Clock size={8} className="mr-1" />
                              <span>Start: {new Date(reservation.start_time).toLocaleDateString()} {new Date(reservation.start_time).toLocaleTimeString()}</span>
                            </div>
                            <div className="flex items-center">
                              <Clock size={8} className="mr-1" />
                              <span>End: {new Date(reservation.end_time).toLocaleDateString()} {new Date(reservation.end_time).toLocaleTimeString()}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-gray-400 text-xs text-center py-4">
                    No active schedules for this item
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isScheduling || !formData.purpose || !formData.start_time || !formData.end_time}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isScheduling ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Calendar size={16} className="mr-2" />
                  Schedule
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SearchRetrieve() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isRetrieving, setIsRetrieving] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResponse[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<Item | undefined>(undefined);
  const [isScheduling, setIsScheduling] = useState<boolean>(false);
  const [itemReservations, setItemReservations] = useState<Reservation[]>([]);
  const [currentUser, setCurrentUser] = useState<{username: string, userId: string} | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle sign out
  const handleSignOut = () => {
    localStorage.removeItem("space_user");
    
    // Dispatch custom event to notify ChatBotWrapper
    window.dispatchEvent(new Event('authStateChanged'));
    
    setCurrentUser(null);
    setSearchResults([]);
    setShowResults(false);
    setSearchTerm("");
    // Redirect to signin page
    window.location.href = '/signin';
  };



  // Load current user from localStorage on component mount
  useEffect(() => {
    const savedUser = localStorage.getItem("space_user");
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setCurrentUser({ username: userData.username, userId: userData.userId });
      } catch (error) {
        console.error("Error parsing user data:", error);
        localStorage.removeItem("space_user");
      }
    }
  }, []);

  // Fetch all items for suggestions on component mount
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
        setAllItems(
          data.items.map((item: any) => ({
            item_id: item.id,
            name: item.name,
            container_id: item.containerId,
            zone: item.preferredZone,
            position: item.position,
          })) || []
        );
      } catch (err) {
        console.error("Error fetching items:", err);
      }
    };
    fetchItems();
  }, []);

  // Fetch reservations for an item
  const fetchItemReservations = async (itemId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/reservations/item/${itemId}`
      );
      if (response.ok) {
        const data = await response.json();
        setItemReservations(data.reservations || []);
      } else {
        console.warn(`Failed to fetch reservations for item ${itemId}: ${response.status}`);
        setItemReservations([]);
      }
    } catch (err) {
      console.error("Error fetching reservations:", err);
      setItemReservations([]);
    }
  };

  // Handle search submission or suggestion selection
  const handleSearch = async (query?: string) => {
    const searchValue = query || searchTerm.trim();
    if (!searchValue) return;

    setIsSearching(true);
    setShowSuggestions(false);
    setShowResults(true);

    try {
      if (!query && !searchHistory.includes(searchTerm)) {
        setSearchHistory((prev) => [searchTerm, ...prev].slice(0, 5));
      }

      const isItemId = allItems.some((item) => item.item_id === searchValue);
      const endpoint = isItemId
        ? `/api/search?itemId=${encodeURIComponent(searchValue)}`
        : `/api/search?itemName=${encodeURIComponent(searchValue)}`;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}${endpoint}`
      );
      if (!response.ok) {
        throw new Error("Search failed");
      }
      const data: SearchResponse | SearchResponse[] = await response.json();

      const results = Array.isArray(data) ? data : [data];
      setSearchResults(results);
      
      // Fetch reservations for found items
      if (results.length > 0 && results[0].found && results[0].item) {
        await fetchItemReservations(results[0].item.item_id);
      }
      
      setIsSearching(false);
    } catch (error) {
      console.error("Search failed:", error);
      setIsSearching(false);
      setSearchResults([
        {
          success: false,
          found: false,
          item: undefined,
          retrievalSteps: [],
        },
      ]);
    }
  };

  // Handle item retrieval with /api/retrieve
  const handleRetrieve = async (itemId: string) => {
    setIsRetrieving(itemId);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/retrieve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            item_id: itemId,
            userId: currentUser?.userId || "unknown",
            timestamp: new Date().toISOString(),
          }),
        }
      );

      if (response.status === 404) {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to retrieve item.");
        setIsRetrieving(null);
        return;
      }

      const data: RetrieveResponse = await response.json();

      if (data.success) {
        toast.success(`Item ${itemId} has been successfully retrieved!`);

        // Remove the retrieved item from search results
        setSearchResults((prev) =>
          prev.filter((result) => result.item?.item_id !== itemId)
        );

        // Clear search if no results remain
        if (searchResults.length <= 1) {
          setSearchTerm("");
          setShowResults(false);
        }
      } else {
        toast.error(`Failed to retrieve item ${itemId}.`);
      }

      setIsRetrieving(null);
    } catch (error) {
      console.error("Retrieval failed:", error);
      setIsRetrieving(null);
      // Optionally, notify the user of the error here
    }
  };

  // Handle item scheduling
  const handleSchedule = async (reservationData: any) => {
    setIsScheduling(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/reservations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(reservationData),
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success(`Item scheduled successfully! Reservation ID: ${data.reservation_id}`);
        setShowScheduleModal(false);
        
        // Refresh reservations
        if (selectedItem) {
          await fetchItemReservations(selectedItem.item_id);
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to schedule item.");
      }
    } catch (error) {
      console.error("Scheduling failed:", error);
      toast.error("Failed to schedule item. Please try again.");
    } finally {
      setIsScheduling(false);
    }
  };

  // Open schedule modal
  const openScheduleModal = (item: Item) => {
    setSelectedItem(item);
    setShowScheduleModal(true);
  };

  // Handle key down for search
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
    if (e.key === "Escape") {
      setShowSuggestions(false);
      setShowResults(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setShowResults(false);
      }
      

    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Clear search and refocus
  const handleClearSearch = () => {
    setSearchTerm("");
    setSearchResults([]);
    setShowResults(false);
    searchInputRef.current?.focus();
  };

  // Filter suggestions based on search term
  const suggestions = searchTerm
    ? allItems
        .filter((item) =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .slice(0, 5)
    : [];

  // Get active reservations for display
  const activeReservations = itemReservations.filter(r => r.status === "ACTIVE");



  return (
    <div className="w-full max-w-3xl mx-auto">

      <div className="relative">
        {/* Search Bar - Reduced height from h-14 to h-12 */}
        <div className="flex h-12 w-full items-center overflow-hidden rounded-full bg-gray-800 border-2 border-gray-700 focus-within:border-indigo-500 transition-all duration-300 shadow-lg shadow-indigo-900/10">
          <div className="flex h-full items-center justify-center px-4 text-indigo-400">
            <Search size={20} />
          </div>
          <input
            ref={searchInputRef}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Search for items by name or ID..."
            className="h-full flex-1 bg-transparent text-lg text-gray-100 outline-none placeholder:text-gray-400"
          />
          {searchTerm && (
            <button
              onClick={handleClearSearch}
              className="flex h-full items-center px-3 text-gray-400 hover:text-gray-200 transition-colors"
            >
              <XCircle size={18} />
            </button>
          )}
          <button
            onClick={() => handleSearch()}
            disabled={isSearching || !searchTerm.trim()}
            className={`h-full px-6 lg:px-8 flex items-center justify-center font-medium transition-all duration-300 ${
              isSearching || !searchTerm.trim()
                ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700 text-white"
            }`}
          >
            {isSearching ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              "Search"
            )}
          </button>
        </div>

        {/* Dropdown Area - Suggestions or Results */}
        {(showSuggestions ||
          (showResults && searchResults.length > 0) ||
          isSearching) && (
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 right-0 z-50 mt-2 rounded-lg bg-gray-800 border-2 border-gray-700 shadow-2xl max-h-[70vh] overflow-y-auto"
          >
            {/* Loading State */}
            {isSearching && (
              <div className="flex items-center justify-center py-8">
                <Loader2
                  size={30}
                  className="animate-spin text-indigo-500 mr-3"
                />
                <p className="text-gray-300">Searching for items...</p>
              </div>
            )}

            {/* Search Suggestions */}
            {showSuggestions && !isSearching && !showResults && (
              <div className="p-2">
                {searchTerm ? (
                  <div>
                    <div className="px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Suggestions
                    </div>
                    {suggestions.length > 0 ? (
                      suggestions.map((item, index) => (
                        <div
                          key={`suggestion-${index}`}
                          className="px-3 py-2 flex items-center rounded-md hover:bg-indigo-600/20 cursor-pointer text-gray-200"
                          onClick={() => {
                            setSearchTerm(item.name);
                            setShowSuggestions(false);
                            handleSearch(item.item_id);
                          }}
                        >
                          <Search size={14} className="mr-2 text-gray-400" />
                          {item.name}{" "}
                          <span className="ml-2 text-xs text-gray-500">
                            ({item.item_id})
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-gray-400">
                        No matching items found
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {searchHistory.length > 0 && (
                      <div className="mb-2">
                        <div className="px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Recent Searches
                        </div>
                        {searchHistory.map((term, index) => (
                          <div
                            key={`history-${index}`}
                            className="px-3 py-2 flex items-center rounded-md hover:bg-indigo-600/20 cursor-pointer text-gray-200"
                            onClick={() => {
                              setSearchTerm(term);
                              setShowSuggestions(false);
                              handleSearch(term);
                            }}
                          >
                            <Clock size={14} className="mr-2 text-gray-400" />
                            {term}
                          </div>
                        ))}
                      </div>
                    )}
                    {allItems.length > 0 && (
                      <div>
                        <div className="px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Suggested Items
                        </div>
                        {allItems.slice(0, 5).map((item, index) => (
                          <div
                            key={`suggested-${index}`}
                            className="px-3 py-2 flex items-center rounded-md hover:bg-indigo-600/20 cursor-pointer text-gray-200"
                            onClick={() => {
                              setSearchTerm(item.name);
                              setShowSuggestions(false);
                              handleSearch(item.item_id);
                            }}
                          >
                            <Search size={14} className="mr-2 text-gray-400" />
                            {item.name}{" "}
                            <span className="ml-2 text-xs text-gray-500">
                              ({item.item_id})
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Search Results */}
            {showResults && !isSearching && searchResults.length > 0 && (
              <div className="divide-y divide-gray-700">
                {searchResults.map((result, index) => (
                  <div
                    key={`result-${index}`}
                    className="p-4 hover:bg-gray-700/50 transition-colors"
                  >
                    {result.found && result.item ? (
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-white mb-1">
                            {result.item.name}
                          </h3>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-indigo-900/50 text-indigo-300 border border-indigo-700/50">
                              {result.item.item_id}
                            </span>
                            {result.item.container_id && (
                              <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-gray-700 text-gray-300 border border-gray-600">
                                {result.item.container_id}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center text-sm text-gray-300 mb-2">
                            <MapPin
                              size={14}
                              className="text-indigo-400 mr-1"
                            />
                            <span className="mr-1">{result.item.zone}</span>
                            {result.item.position && (
                              <span className="text-gray-400 text-xs">
                                (Position:{" "}
                                {result.item.position.startCoordinates.width}-
                                {result.item.position.endCoordinates.width},{" "}
                                {result.item.position.startCoordinates.depth}-
                                {result.item.position.endCoordinates.depth},{" "}
                                {result.item.position.startCoordinates.height}-
                                {result.item.position.endCoordinates.height})
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400">
                            <div className="flex items-center mb-1">
                              <Box size={12} className="mr-1" />
                              <span>
                                {result.retrievalSteps.length} retrieval steps
                                required
                                {result.retrievalSteps.length > 1 &&
                                  ` (${
                                    result.retrievalSteps.length - 1
                                  } items need to be moved)`}
                              </span>
                            </div>
                          </div>

                          {/* Show active reservations if any */}
                          {activeReservations.length > 0 && (
                            <div className="mt-2 p-2 bg-amber-900/20 border border-amber-700/30 rounded-md">
                              <div className="flex items-center text-amber-300 text-xs mb-2">
                                <Calendar size={12} className="mr-1" />
                                <span className="font-medium">Currently Scheduled</span>
                                <span className="ml-2 text-amber-300/70">({activeReservations.length} reservation{activeReservations.length > 1 ? 's' : ''})</span>
                              </div>
                              {activeReservations.map((reservation, idx) => (
                                <div key={idx} className="text-amber-200 text-xs mb-2 last:mb-0">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                      <User size={10} className="mr-1" />
                                      <span className="font-medium">{reservation.user_name}</span>
                                      <span className="mx-2 text-amber-300/50">•</span>
                                      <span className="bg-amber-800/30 px-1 py-0.5 rounded text-xs">
                                        Priority: {reservation.priority}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-amber-300/70 ml-4 mt-1">
                                    <div className="font-medium">{reservation.purpose}</div>
                                    <div className="flex items-center space-x-3 mt-1">
                                      <span className="flex items-center">
                                        <Clock size={8} className="mr-1" />
                                        Start: {new Date(reservation.start_time).toLocaleDateString()} {new Date(reservation.start_time).toLocaleTimeString()}
                                      </span>
                                      <span className="flex items-center">
                                        <Clock size={8} className="mr-1" />
                                        End: {new Date(reservation.end_time).toLocaleDateString()} {new Date(reservation.end_time).toLocaleTimeString()}
                                      </span>
                                    </div>
                                    {reservation.notes && (
                                      <div className="mt-1 text-amber-300/60 italic">
                                        Note: {reservation.notes}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col space-y-2 ml-3">
                          <button
                            onClick={() =>
                              result.item && handleRetrieve(result.item.item_id)
                            }
                            disabled={isRetrieving === result.item.item_id}
                            className={`px-4 py-2 rounded-md flex items-center space-x-2 transition-all ${
                              isRetrieving === result.item.item_id
                                ? "bg-gray-700 text-gray-300"
                                : "bg-indigo-600 hover:bg-indigo-500 text-white"
                            } shadow-md border border-indigo-700 min-w-24`}
                          >
                            {isRetrieving === result.item.item_id ? (
                              <>
                                <Loader2 size={16} className="animate-spin" />
                                <span>Wait...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle size={16} />
                                <span>Retrieve</span>
                              </>
                            )}
                          </button>
                          
                                                     <button
                             onClick={() => result.item && openScheduleModal(result.item)}
                             className="px-4 py-2 rounded-md bg-amber-600 hover:bg-amber-500 text-white shadow-md border border-amber-700 min-w-24 flex items-center justify-center space-x-2"
                           >
                             <Calendar size={16} />
                             <span>Schedule</span>
                           </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-400">
                        Item not found for this search.
                      </div>
                    )}

                    {result.found && result.item && (
                      <details className="mt-2 text-sm">
                        <summary className="cursor-pointer text-indigo-400 hover:text-indigo-300 flex items-center">
                          <ChevronRight
                            size={16}
                            className="inline transition-transform duration-200"
                          />
                          <span>View retrieval steps</span>
                        </summary>
                        <div className="pl-6 pt-2 pb-1 space-y-2">
                          {result.retrievalSteps.map((step, stepIndex) => (
                            <div
                              key={`step-${stepIndex}`}
                              className="flex items-start"
                            >
                              <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-300 mr-2">
                                {step.step}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                      step.action === "remove"
                                        ? "bg-amber-900/30 text-amber-300 border border-amber-700"
                                        : step.action === "setAside"
                                        ? "bg-blue-900/30 text-blue-300 border border-blue-700"
                                        : step.action === "retrieve"
                                        ? "bg-indigo-900/30 text-indigo-300 border border-indigo-700"
                                        : "bg-green-900/30 text-green-300 border border-green-700"
                                    }`}
                                  >
                                    {step.action.charAt(0).toUpperCase() +
                                      step.action.slice(1)}
                                  </span>
                                  <span className="ml-2 text-gray-300">
                                    {step.itemName}
                                  </span>
                                  <span className="ml-1 text-xs text-gray-500">
                                    ({step.item_id})
                                  </span>
                                </div>
                                
                                {/* Show if this item is scheduled */}
                                {itemReservations.some(r => r.item_id === step.item_id && r.status === "ACTIVE") && (
                                  <div className="mt-1 ml-4 p-2 bg-amber-900/20 border border-amber-700/30 rounded text-xs">
                                    <div className="flex items-center text-amber-300 mb-1">
                                      <Calendar size={10} className="mr-1" />
                                      <span className="font-medium">Scheduled Details:</span>
                                    </div>
                                    {itemReservations
                                      .filter(r => r.item_id === step.item_id && r.status === "ACTIVE")
                                      .map((reservation, idx) => (
                                        <div key={idx} className="text-amber-200 ml-2 mb-1 last:mb-0">
                                          <div className="flex items-center">
                                            <User size={8} className="mr-1" />
                                            <span className="font-medium">{reservation.user_name}</span>
                                            <span className="mx-1 text-amber-300/50">•</span>
                                            <span className="text-amber-300/70">{new Date(reservation.start_time).toLocaleDateString()}</span>
                                            <span className="mx-1 text-amber-300/50">•</span>
                                            <span className="text-amber-300/70">{new Date(reservation.start_time).toLocaleTimeString()}</span>
                                          </div>
                                          <div className="text-amber-300/60 ml-2 italic">
                                            {reservation.purpose}
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* No Results Found */}
            {showResults && !isSearching && searchResults.length === 0 && (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-700 mx-auto flex items-center justify-center mb-3">
                  <Search size={20} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-200 mb-2">
                  No results found
                </h3>
                <p className="text-gray-400 max-w-md mx-auto">
                  We couldn't find any items matching "{searchTerm}". Please try
                  a different search term or check the item ID.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Schedule Modal */}
      <ScheduleModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        item={selectedItem}
        onSchedule={handleSchedule}
        isScheduling={isScheduling}
        itemReservations={itemReservations}
        userId={currentUser?.userId || ""}
      />
    </div>
  );
}
