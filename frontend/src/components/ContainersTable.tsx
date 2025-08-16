"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Container, PaginatedContainerResponse } from "@/data/types";
import { Search, FileDown, Box, AlertTriangle } from "lucide-react";

const ITEMS_PER_PAGE = 10;

export function ContainersTable() {
  const [containers, setContainers] = useState<Container[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalContainers, setTotalContainers] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.append("page", currentPage.toString());
    params.append("size", ITEMS_PER_PAGE.toString());
    if (debouncedSearchTerm) {
      params.append("search", debouncedSearchTerm);
    }

    try {
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_BASE_URL
        }/api/tables/containers?${params.toString()}`
      );
      if (!response.ok) throw new Error(`Error ${response.status}`);
      const data: PaginatedContainerResponse = await response.json();
      setContainers(data.items);
      setTotalContainers(data.total);
      const total = Math.ceil(data.total / ITEMS_PER_PAGE);
      setTotalPages(total);
      if (currentPage > total && total > 0) setCurrentPage(total);
      else if (data.total === 0) setCurrentPage(1);
    } catch (err: any) {
      setError(err.message || "Fetch error");
      setContainers([]);
      setTotalPages(1);
      setTotalContainers(0);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearchTerm]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = () => {
    console.log("Export Containers Table Data...");
  };

  return (
    <div className="w-full bg-gray-800 text-gray-100 rounded-lg shadow-lg overflow-hidden border-2 border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-700 bg-gradient-to-r from-gray-800 to-gray-750">
        <h2 className="text-xl font-bold">Container Overview</h2>
        <div className="text-sm text-gray-400">{totalContainers} entries</div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-gray-700 bg-gray-800 flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
          <Input
            placeholder="Search ID or Zone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-gray-700 text-white border-2 border-gray-600 pl-10 py-6 focus:ring-indigo-500 focus:border-indigo-500 shadow-lg shadow-black/10"
          />
        </div>
        <Button
          onClick={handleExport}
          variant="outline"
          className="bg-gray-700 border-2 border-gray-600 hover:bg-gray-600 text-white py-6 flex items-center gap-2 shadow-lg shadow-black/10"
        >
          <FileDown size={16} />
          Export to CSV
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-800 border-b border-gray-700 hover:bg-gray-800">
              <TableHead className="text-gray-300 font-semibold">
                Container ID
              </TableHead>
              <TableHead className="text-gray-300 font-semibold">
                Module ID
              </TableHead>
              <TableHead className="text-gray-300 font-semibold">
                Zone
              </TableHead>
              <TableHead className="text-gray-300 font-semibold">
                Dimensions
              </TableHead>
              <TableHead className="text-gray-300 font-semibold">
                Total Items
              </TableHead>
              <TableHead className="text-gray-300 font-semibold">
                Expired
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="flex items-center justify-center">
                    <svg
                      className="animate-spin h-6 w-6 text-indigo-400"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span className="ml-2">Loading containers...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-red-500 py-6"
                >
                  <div className="flex flex-col items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-10 w-10 text-red-500 mb-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    {error}
                  </div>
                </TableCell>
              </TableRow>
            ) : containers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center justify-center text-gray-400">
                    <Box className="h-12 w-12 mb-4 text-gray-500" />
                    <p className="text-lg">No containers found</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Try adjusting your search terms
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              containers.map((container) => (
                <TableRow
                  key={container.container_id}
                  className="hover:bg-indigo-900/20 transition border-b border-gray-700"
                >
                  <TableCell className="font-medium">
                    <span className="px-2 py-1 bg-gray-700 rounded-md text-indigo-300 border border-gray-600">
                      {container.container_id}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-1 bg-blue-500/20 rounded-md text-blue-300 border border-blue-800">
                      {container.module_id}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-purple-300">{container.zone}</span>
                  </TableCell>
                  <TableCell className="text-xs font-mono">
                    <span className="px-2 py-1 bg-gray-700 rounded-md border border-gray-600">
                      {`${container.width_cm}×${container.depth_cm}×${container.height_cm}`}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="px-3 py-1 bg-blue-500/20 rounded-md border border-blue-800 inline-flex items-center">
                      <Box size={14} className="text-blue-400 mr-2" />
                      <span className="text-blue-300">
                        {container.item_count}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {container.expired_item_count > 0 ? (
                      <div className="px-3 py-1 bg-red-500/20 rounded-md border border-red-800 inline-flex items-center">
                        <AlertTriangle
                          size={14}
                          className="text-red-400 mr-2"
                        />
                        <span className="text-red-300">
                          {container.expired_item_count}
                        </span>
                      </div>
                    ) : (
                      <span className="px-3 py-1 bg-green-500/20 rounded-md border border-green-800 text-green-300">
                        0
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalContainers > 0 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-700 bg-gray-800">
          <span className="text-sm text-gray-400">
            Page {currentPage} of {totalPages}
          </span>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1 || isLoading}
              className="bg-gray-700 border-2 border-gray-600 hover:bg-gray-600 text-white shadow-lg shadow-black/10 disabled:opacity-50"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages || isLoading}
              className="bg-gray-700 border-2 border-gray-600 hover:bg-gray-600 text-white shadow-lg shadow-black/10 disabled:opacity-50"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
