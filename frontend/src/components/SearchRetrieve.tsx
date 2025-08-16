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
} from "lucide-react";
import toast from "react-hot-toast";

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

export default function SearchRetrieve() {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isRetrieving, setIsRetrieving] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResponse[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
            userId: "user123",
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

  return (
    <div className="w-full max-w-3xl mx-auto">
      {" "}
      {/* Reduced from max-w-4xl to max-w-3xl */}
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
                        </div>
                        <button
                          onClick={() =>
                            result.item && handleRetrieve(result.item.item_id)
                          }
                          disabled={isRetrieving === result.item.item_id}
                          className={`px-4 py-2 rounded-md flex items-center space-x-2 transition-all ${
                            isRetrieving === result.item.item_id
                              ? "bg-gray-700 text-gray-300"
                              : "bg-indigo-600 hover:bg-indigo-500 text-white"
                          } shadow-md border border-indigo-700 ml-3 min-w-24`}
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
                              <div>
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
    </div>
  );
}
