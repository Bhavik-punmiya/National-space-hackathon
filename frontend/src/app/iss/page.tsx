"use client";
import Controls from "@/components/controls/Controls";
import ISS from "@/components/ISS";
import ZoomControl from "@/components/ZoomControl";
import { useState } from "react";
import React from "react";

const Page: React.FC = () => {
  const [translateX, setTranslateX] = useState<number>(0);
  const [translateY, setTranslateY] = useState<number>(0);
  const [scale, setScale] = useState<number>(0.7);

  interface TooltipProps {
    visible: boolean;
    x: number;
    y: number;
    title: string;
    totalItems: number;
    totalContainers: number;
    totalZones: number;
  }
  const [tooltip, setTooltip] = useState<TooltipProps>({
    visible: false,
    x: 0,
    y: 0,
    title: "",
    totalItems: 0,
    totalContainers: 0,
    totalZones: 0,
  });
  

const [containers, setContainers] = useState<{ id: string; zoneId: string }[]>([]);
const [items, setItems] = useState<{ id: string; containerId: string }[]>([]);

  const [date, setDate] = React.useState<Date | undefined>(new Date());

  const resetView = () => {
    setTranslateX(0);
    setTranslateY(0);
    setScale(0.7);
  };

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
      />
      <ZoomControl scale={scale} setScale={setScale} resetView={resetView} />
      <Controls date={date} setDate={setDate} />
    </div>
  );
};

export default Page;
