"use client";

import { useState, useEffect, useRef } from "react";
import Papa from "papaparse";
import ISS from "@/components/ISS";
import ZoomControl from "@/components/ZoomControl";
import "@/app/globals.css";
import Search from "@/components/SearchRetrieve";
import UserDropdown from "@/components/UserDropdown";

export default function HomePage() {
  const [translateX, setTranslateX] = useState<number>(0);
  const [translateY, setTranslateY] = useState<number>(0);
  const [scale, setScale] = useState<number>(0.7);
  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    title: "",
    totalItems: 0,
    totalContainers: 0,
    totalZones: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  interface Item {
    id: string;
    containerId: string;
    [key: string]: any;
  }

  const [containers, setContainers] = useState<any[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [currentUser, setCurrentUser] = useState<{username: string, userId: string} | null>(null);

  // SVG dimensions
  const svgWidth = 1804;
  const svgHeight = 811;

  // Safe boundary function to constrain panning
  const constrainTranslation = (x: number, y: number) => {
    if (!containerRef.current) return { x, y };

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    // Allow some margin around the edges
    const margin = 100;

    // Calculate boundaries
    const minX = Math.min(-(svgWidth * scale - containerWidth) - margin, 0);
    const maxX = margin;
    const minY = Math.min(-(svgHeight * scale - containerHeight) - margin, 0);
    const maxY = margin;

    return {
      x: Math.max(minX, Math.min(x, maxX)),
      y: Math.max(minY, Math.min(y, maxY)),
    };
  };

  // Safe setter functions for translation that enforce boundaries
  const safeSetTranslateX = (value: number | ((prev: number) => number)) => {
    setTranslateX((prev) => {
      const newValue = typeof value === "function" ? value(prev) : value;
      const { x } = constrainTranslation(newValue, translateY);
      return x;
    });
  };

  const safeSetTranslateY = (value: number | ((prev: number) => number)) => {
    setTranslateY((prev) => {
      const newValue = typeof value === "function" ? value(prev) : value;
      const { y } = constrainTranslation(translateX, newValue);
      return y;
    });
  };

  useEffect(() => {
    setIsLoading(true);
    
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/frontend/placements`)
      .then(response => response.json())
      .then(data => {
        setContainers(data.containers || []);
        setItems(data.items || []);
      })
      .catch(error => {
        console.error('Error fetching data:', error);
      })
      .finally(() => setIsLoading(false));

  }, []);

  // Load current user from localStorage
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

  // Handle sign out
  const handleSignOut = () => {
    localStorage.removeItem("space_user");
    
    // Dispatch custom event to notify ChatBotWrapper
    window.dispatchEvent(new Event('authStateChanged'));
    
    setCurrentUser(null);
    // Redirect to signin page
    window.location.href = '/signin';
  };

  // Apply constraints whenever scale changes
  useEffect(() => {
    const { x, y } = constrainTranslation(translateX, translateY);
    setTranslateX(x);
    setTranslateY(y);
  }, [scale]);

  const resetView = () => {
    setTranslateX(0);
    setTranslateY(0);
    setScale(0.7);
  };

  const zoomIn = () => {
    setScale((prev) => Math.min(prev * 1.2, 2));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(prev * 0.8, 0.3));
  };

  const formatZoomPercentage = () => {
    return `${Math.round(scale * 100)}%`;
  };

  if (isLoading) {
    return (
      <div className="h-screen max-h-screen bg-[#01041f] flex items-center justify-center overflow-hidden">
        <div className="text-white/90 text-lg animate-pulse font-space">
          Initializing System...
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-screen max-h-screen overflow-hidden space-background"
      ref={containerRef}
    >
      <div className="relative h-screen max-h-screen ">
        <div className="fixed top-0 left-0 right-0 z-50 pt-6 pb-4 px-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <Search />
            </div>
            {currentUser && (
              <div className="ml-4">
                <UserDropdown username={currentUser.username} onSignOut={handleSignOut} />
              </div>
            )}
          </div>
        </div>
        <div className="relative z-10 pt-20">
          {!isLoading && (
            <>
              <ISS
                translateX={translateX}
                setTranslateX={safeSetTranslateX}
                translateY={translateY}
                setTranslateY={safeSetTranslateY}
                scale={scale}
                setScale={setScale}
                tooltip={tooltip}
                setTooltip={setTooltip}
              />
              <ZoomControl
                scale={scale}
                setScale={setScale}
                resetView={resetView}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
