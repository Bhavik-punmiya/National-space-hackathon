'use client'

import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import ISS from "@/components/ISS";
import ZoomControl from "@/components/ZoomControl";

export default function SpaceStationPage() {
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
    totalZones: 0
  });
  const [containers, setContainers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    // Load containers
    fetch('/data/containers.csv')
      .then(response => response.text())
      .then(csv => {
        const data = Papa.parse(csv, { header: true }).data;
        setContainers(data);
      });

    // Load items
    fetch('/data/items.csv')
      .then(response => response.text())
      .then(csv => {
        const data = Papa.parse(csv, { header: true }).data;
        setItems(data);
      });
  }, []);

  const resetView = () => {
    setTranslateX(0);
    setTranslateY(0);
    setScale(0.7);
  };

  return (
    <div className="h-screen bg-black">
      <div className="relative h-[calc(100vh-2rem)] space-background">
        <ISS
          translateX={translateX}
          setTranslateX={setTranslateX}
          translateY={translateY}
          setTranslateY={setTranslateY}
          scale={scale}
          setScale={setScale}
          tooltip={tooltip}
          setTooltip={setTooltip}
        />
        <ZoomControl scale={scale} setScale={setScale} resetView={resetView} />
      </div>
    </div>
  );
}
