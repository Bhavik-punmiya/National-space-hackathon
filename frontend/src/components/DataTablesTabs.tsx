"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ItemsTable } from "@/components/ItemsTable";
import { ContainersTable } from "@/components/ContainersTable";
import { Package, Archive } from "lucide-react";

export function DataTablesTabs() {
  const handleExport = async () => {
    try {
      const baseUrl = 'http://localhost:8000'; // Hardcoded for testing
      const response = await fetch(
        `${baseUrl}/api/export/arrangement`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const csvData = await response.text();
      const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "inventory_data.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      // Handle error (e.g., show a notification to the user)
    }
  };

  return (
    <div className="w-full h-full bg-gray-900 text-gray-100 rounded-lg shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-gradient-to-r from-gray-900 to-gray-800 border-b border-indigo-900/30">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 rounded-md bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-700/20">
            <Package size={18} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Inventory Data
          </h2>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs defaultValue="items" className="w-full">
        <div className="p-2 bg-gray-900 border-b border-gray-800">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800 p-1 rounded-md border-2 border-gray-700 shadow-lg shadow-black/10 h-auto">
            <TabsTrigger
              value="items"
              className="py-3 flex items-center justify-center gap-2 rounded-md transition-all duration-200 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-700/20 data-[state=active]:border-indigo-700 data-[state=inactive]:text-gray-300 data-[state=inactive]:hover:bg-gray-700 data-[state=inactive]:hover:text-gray-100"
            >
              <Package
                size={16}
                className="data-[state=active]:text-white data-[state=inactive]:text-indigo-400"
              />
              <span>Items</span>
            </TabsTrigger>
            <TabsTrigger
              value="containers"
              className="py-3 flex items-center justify-center gap-2 rounded-md transition-all duration-200 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-700/20 data-[state=active]:border-indigo-700 data-[state=inactive]:text-gray-300 data-[state=inactive]:hover:bg-gray-700 data-[state=inactive]:hover:text-gray-100"
            >
              <Archive
                size={16}
                className="data-[state=active]:text-white data-[state=inactive]:text-indigo-400"
              />
              <span>Containers</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Contents */}
        <div className="p-6 bg-gray-900">
          <TabsContent value="items" className="mt-0">
            <ItemsTable />
          </TabsContent>
          <TabsContent value="containers" className="mt-0">
            <ContainersTable />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
