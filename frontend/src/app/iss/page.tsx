"use client";
import Controls from "@/components/controls/Controls";
import ISS from "@/components/ISS";
import ZoomControl from "@/components/ZoomControl";
import { useState, useEffect } from "react";
import React from "react";

const Page: React.FC = () => {
  const [translateX, setTranslateX] = useState<number>(0);
  const [translateY, setTranslateY] = useState<number>(0);
  const [scale, setScale] = useState<number>(0.7);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  interface TooltipProps {
    visible: boolean;
    x: number;
    y: number;
    title: string;
    totalContainers: number;
    totalItems: number;
  }
  const [tooltip, setTooltip] = useState<TooltipProps>({
    visible: false,
    x: 0,
    y: 0,
    title: "",
    totalContainers: 0,
    totalItems: 0,
  });
  
  const [containers, setContainers] = useState<{ id: string; zoneId: string }[]>([]);
  const [items, setItems] = useState<{ id: string; containerId: string }[]>([]);

  const [date, setDate] = React.useState<Date | undefined>(new Date());

  const resetView = () => {
    setTranslateX(0);
    setTranslateY(0);
    setScale(0.7);
  };

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const response = await fetch('https://national-space-hackathon-1-91717359690.us-central1.run.app/api/frontend/placements');
        
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        
        // Transform the container data to the format needed by the ISS component
        const transformedContainers = data.containers.map((container: any) => ({
          id: container.id,
          zoneId: container.zoneId
        }));
        
        // Transform the item data to the format needed by the ISS component
        const transformedItems = data.items.map((item: any) => ({
          id: item.id,
          containerId: item.containerId
        }));
        
        setContainers(transformedContainers);
        setItems(transformedItems);
        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status"></div>
          <p className="mt-4 text-xl">Loading ISS data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <div className="text-center max-w-md mx-auto p-6 bg-gray-900 rounded-xl shadow-xl border border-gray-800">
          <h2 className="text-xl font-bold text-red-500 mb-4">Error Loading Data</h2>
          <p className="mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <ISS
        translateX={translateX}
        translateY={translateY}
        scale={scale}
        setTranslateX={setTranslateX}
        setTranslateY={setTranslateY}
        setScale={setScale}
        tooltip={tooltip}
        setTooltip={setTooltip}
        containers={containers}
        items={items}
      />
      <ZoomControl scale={scale} setScale={setScale} resetView={resetView} />
      <Controls date={date} setDate={setDate} />
    </div>
  );
};

export default Page;
