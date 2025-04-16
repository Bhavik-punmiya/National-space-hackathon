"use client";
import React, { useState, useRef, SVGProps } from "react";
import "@/app/globals.css";
import { useRouter } from "next/navigation";

const ISS = ({
  translateX,
  setTranslateX,
  translateY,
  setTranslateY,
  scale,
  setScale,
  tooltip,
  setTooltip,
  containers,
  items,
}: {
  translateX: number;
  setTranslateX: React.Dispatch<React.SetStateAction<number>>;
  translateY: number;
  setTranslateY: React.Dispatch<React.SetStateAction<number>>;
  scale: number;
  setScale: React.Dispatch<React.SetStateAction<number>>;
  tooltip: {
    visible: boolean;
    x: number;
    y: number;
    title: string;
    totalContainers: number;
    totalItems: number;
  };
  setTooltip: React.Dispatch<
    React.SetStateAction<{
      visible: boolean;
      x: number;
      y: number;
      title: string;
      totalContainers: number;
      totalItems: number;
    }>
  >;
  containers: Array<{ id: string; zoneId: string }>;
  items: Array<{ id: string; containerId: string }>;
}) => {
  const [zoneData, setZoneData] = React.useState<Record<string, {id: string, displayName: string, totalContainers: number, totalItems: number}>>({});
  const containerRef = React.useRef<HTMLDivElement>(null);
  const svgWidth = 1830;
  const svgHeight = 850;
  
  // Map SVG IDs to API zone IDs - this will be used as a fallback
  const zoneMapping: Record<string, string> = {
    "fgb": "Zarya",
    "service-module": "Zvezda",
    "node-1": "Unity",
    "us-lab": "Destiny",
    "node-2": "Harmony", 
    "jap-lab": "Kibo",
    "airlock": "Quest Airlock",
    "soyuz-1": "Soyuz",
    "soyuz-2": "Soyuz",
    "poisk": "Poisk",
    "rassvet": "Rassvet",
    "nauka": "Nauka",
    "boeing-cst-100-starliner": "Boeing CST-100 Starliner",
    "spacex-dragon": "SpaceX Dragon",
    "storage-1": "Progress",
    "storage-2": "Progress",
    "radiators": "Radiators",
    "solar-panels": "Solar Panels",
    "truss-structure": "Auxiliary Storage"
  };

  React.useEffect(() => {
    // Get all unique zone IDs from the API response
    const uniqueZoneIds = new Set(containers.map(container => container.zoneId));
    
    // Process data to count containers and items per zone
    const zoneStats: Record<string, {id: string, displayName: string, totalContainers: number, totalItems: number}> = {};
    
    // First, initialize all SVG zones with default values
    Object.entries(zoneMapping).forEach(([svgId, defaultZoneName]) => {
      // Try to find a matching zone ID in the API data
      const matchedZoneId = Array.from(uniqueZoneIds).find(zoneId => 
        zoneId.toLowerCase() === defaultZoneName.toLowerCase()
      );
      
      zoneStats[svgId] = {
        id: matchedZoneId || defaultZoneName,
        displayName: matchedZoneId || defaultZoneName || "Empty",
        totalContainers: 0,
        totalItems: 0
      };
    });
    
    // Count containers per zone
    containers.forEach(container => {
      const matchingSvgId = Object.entries(zoneMapping).find(([_, apiZoneId]) => 
        apiZoneId.toLowerCase() === container.zoneId.toLowerCase()
      )?.[0];
      
      if (matchingSvgId && zoneStats[matchingSvgId]) {
        zoneStats[matchingSvgId].totalContainers += 1;
      }
    });
    
    // Count items per zone by first checking which container they belong to
    items.forEach(item => {
      const containerFound = containers.find(c => c.id === item.containerId);
      if (containerFound) {
        const matchingSvgId = Object.entries(zoneMapping).find(([_, apiZoneId]) => 
          apiZoneId.toLowerCase() === containerFound.zoneId.toLowerCase()
        )?.[0];
        
        if (matchingSvgId && zoneStats[matchingSvgId]) {
          zoneStats[matchingSvgId].totalItems += 1;
        }
      }
    });
    
    setZoneData(zoneStats);
  }, [containers, items]);

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Mouse down handler implementation
  };

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // Mouse move handler implementation
  };

  const onMouseUp = () => {
    // Mouse up handler implementation
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    // Wheel handler implementation
  };

  const handleZoneClick = (zoneId: string) => {
    if (zoneData[zoneId]) {
      console.log(`Clicked on zone: ${zoneData[zoneId].displayName}`);
      // Navigate or perform action for the selected zone
      // e.g., window.location.href = `/zone/${zoneData[zoneId].id}`;
    }
  };

  const handleMouseEnter = (e: React.MouseEvent, zoneId: string) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const zoneInfo = zoneData[zoneId] || { 
      displayName: zoneMapping[zoneId] || "Empty",
      totalContainers: 0,
      totalItems: 0
    };
    
    setTooltip({
      visible: true,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      title: zoneInfo.displayName,
      totalContainers: zoneInfo.totalContainers,
      totalItems: zoneInfo.totalItems
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current || !tooltip.visible) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    setTooltip({
      ...tooltip,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseLeave = () => {
    setTooltip({
      ...tooltip,
      visible: false
    });
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
      className="space-background"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onWheel={onWheel}
    >
      {tooltip.visible && (
        <div
          className="absolute bg-black/80 text-white p-2 rounded z-50 pointer-events-none shadow-xl border border-white/20"
          style={{
            left: tooltip.x + 10,
            top: tooltip.y + 10,
            maxWidth: "200px"
          }}
        >
          <h3 className="font-bold text-sm">{tooltip.title}</h3>
          <div className="text-xs mt-1 text-gray-300">
            <div>Containers: {tooltip.totalContainers}</div>
            <div>Items: {tooltip.totalItems}</div>
          </div>
        </div>
      )}
      <svg
        width={svgWidth}
        height={svgHeight}
        style={{
          transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
          transformOrigin: "0 0",
          zIndex: 10,
        }}
      >
        <g id="ISS">
          <g
            id="Progress 1"
            className="hover-group"
            onClick={() => handleZoneClick("storage-1")}
            onMouseEnter={(e) => handleMouseEnter(e, "storage-1")}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <path
              id="dark"
              d="M7.49967 292.5V265.5L21.4997 271V214.5H59.5V273.5H102L119.5 277.5C139.625 267.607 150.903 268.556 171 282.5H178V321.5H171C152.112 337.429 140.852 338.507 119.5 325.5L102 329H59.5V390.5H21.4997V333L7.49967 339V312C0.090096 305.231 -0.0107689 300.96 7.49967 292.5Z"
              stroke="#444444"
              strokeWidth="1.5"
            />
            <path
              id="light"
              d="M12.5 268V336.5M21.5 272V280.5M21.5 332V329.5M22.5 232.5H58.5M22.5 249H58.5M22.5 264.5H58.5M58.5 275.5V280.5M21.5 329.5V280.5M21.5 329.5H42.5M21.5 280.5H42.5M58.5 280.5V329.5H42.5M58.5 280.5H42.5M42.5 280.5V329.5M22.5 340.5H58.5M58.5 356.5H22.5M22.5 372H58.5M108 275.5V328.5M119 278V325M171.5 321V283.5"
              stroke="#444444"
              strokeWidth="1"
              fill="black"
            />
          </g>
          <g
            id="Progress 2"
            className="hover-group"
            onClick={() => handleZoneClick("storage-2")}
            onMouseEnter={(e) => handleMouseEnter(e, "storage-2")}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <path
              id="dark_2"
              d="M463 6.59507H490L484.5 20.5951H541V58.5954H482V101.095L478 118.595C487.893 138.72 486.944 149.999 473 170.095V177.095H434V170.095C418.071 151.208 416.993 139.947 430 118.595L426.5 101.095V58.5954H365V20.5951H422.5L416.5 6.59507H443.5C450.269 -0.814506 454.54 -0.915371 463 6.59507Z"
              stroke="#444444"
              strokeWidth="1.5"
            />
            <path
              id="light_2"
              d="M487.5 11.5954H419M483.5 20.5954H475M423.5 20.5954H426M523 21.5954V57.5954M506.5 21.5954V57.5954M491 21.5954V57.5954M480 57.5954H475M426 20.5954H475M426 20.5954V41.5954M475 20.5954V41.5954M475 57.5954H426V41.5954M475 57.5954V41.5954M475 41.5954H426M415 21.5954V57.5954M399 57.5954V21.5954M383.5 21.5954V57.5954M480 107.095H427M477.5 118.095H430.5M434.5 170.595H472"
              stroke="#444444"
            />
          </g>
          <g
            id="Soyuz 1"
            className="hover-group"
            onClick={() => handleZoneClick("soyuz-1")}
            onMouseEnter={(e) => handleMouseEnter(e, "soyuz-1")}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <path
              id="dark_3"
              d="M443 803.5H416L421.5 789.5H365V751.5H424V709L428 691.5C418.107 671.375 419.056 660.097 433 640V633H472V640C487.929 658.888 489.007 670.148 476 691.5L479.5 709V751.5H541V789.5H483.5L489.5 803.5H462.5C455.731 810.91 451.46 811.011 443 803.5Z"
              stroke="#444444"
              strokeWidth="1.5"
            />
            <path
              id="light_3"
              d="M418.5 798.5H487M422.5 789.5H431M482.5 789.5H480M383 788.5V752.5M399.5 788.5V752.5M415 788.5V752.5M426 752.5H431M480 789.5H431M480 789.5V768.5M431 789.5V768.5M431 752.5H480V768.5M431 752.5V768.5M431 768.5H480M491 788.5V752.5M507 752.5V788.5M522.5 788.5V752.5M426 703H479M428.5 692H475.5M471.5 639.5H434"
              stroke="#444444"
            />
          </g>
          <g
            id="Soyuz 2"
            className="hover-group"
            onClick={() => handleZoneClick("soyuz-2")}
            onMouseEnter={(e) => handleMouseEnter(e, "soyuz-2")}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <path
              id="dark_4"
              d="M750 652.5H723L728.5 638.5H672V600.5H731V558L735 540.5C725.107 520.375 726.056 509.097 740 489V482H779V489C794.929 507.888 796.007 519.148 783 540.5L786.5 558V600.5H848V638.5H790.5L796.5 652.5H769.5C762.731 659.91 758.46 660.011 750 652.5Z"
              stroke="#444444"
              strokeWidth="1.5"
            />
            <path
              id="light_4"
              d="M725.5 647.5H794M729.5 638.5H738M789.5 638.5H787M690 637.5V601.5M706.5 637.5V601.5M722 637.5V601.5M733 601.5H738M787 638.5H738M787 638.5V617.5M738 638.5V617.5M738 601.5H787V617.5M738 601.5V617.5M738 617.5H787M798 637.5V601.5M814 601.5V637.5M829.5 637.5V601.5M733 552H786M735.5 541H782.5M778.5 488.5H741"
              stroke="#444444"
            />
          </g>
          <g
            id="Zvezda"
            className="hover-group"
            onClick={() => handleZoneClick("service-module")}
            onMouseEnter={(e) => handleMouseEnter(e, "service-module")}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <g id="dark_5">
              <path d="M178 322V277H171C165.87 266.651 165.268 260.849 171 250.5H178L187.5 246V253.5H244.5H303.5L329 267.5H361.5L356.5 262H384V267.5H413V273L432.5 283V320.5L413 330.5V335.5H339L343 342.5H323L326 335.5L303.5 350V355.5H288.5L279.5 350H244.5H183V330.5L178 322Z" />
              <path
                d="M303.5 253.5L329 267.5H361.5L356.5 262H384V267.5H413V273L432.5 283V320.5L413 330.5V335.5H339L343 342.5H323L326 335.5L303.5 350M303.5 253.5H244.5M303.5 253.5V350M279.5 350L288.5 355.5H303.5V350M279.5 350H244.5M279.5 350H303.5M244.5 350H183V330.5L178 322V277H171C165.87 266.651 165.268 260.849 171 250.5H178L187.5 246V253.5H244.5M244.5 350V253.5"
                stroke="white"
                strokeWidth="1.5"
              />
            </g>
            <g id="light_5">
              <path d="M205 261.5H194.5V266H205V261.5Z" fill="black" />
              <path
                d="M214 305.5V314H204.25H194.5V305.5H204.25H214Z"
                fill="black"
              />
              <path d="M366 341L362 336H378L377 341H366Z" fill="black" />
              <path
                d="M329.5 330L320.5 329.5L322.25 324.056L324 318.611L325.321 314.5L327 309.278L328.495 304.627L329.5 301.5L346 302.7L363 303.936V300C368.172 295.353 370.898 295.391 375.5 300V304.845L391.5 306.009L412 307.5V311.5V315.5V321V325.5V330V330.5V336H391H385.5L369.5 334.286L364 333.696L342.5 331.393L329.5 330Z"
                fill="black"
              />
              <path
                d="M259 283.5C249.518 283.618 248.96 297.62 259 297.5C269.04 297.38 268.482 283.382 259 283.5Z"
                fill="black"
              />
              <path
                d="M179.5 276V268.5M179.5 251V256.5M179.5 256.5H168.5M179.5 256.5V268.5M179.5 268.5H168.5M187 349V254.5M204.25 305.5H194.5V314H204.25M204.25 305.5H214V314H204.25M204.25 305.5V314M245.5 266H301.5M245.5 270.5H301.5M245.5 301.5H301.5M245.5 306.5H301.5M245.5 334.5H301.5M245.5 339H301.5M312.5 343.5V259.5M320.5 264V329.5M320.5 338V329.5M329.5 268.5V301.5M329.5 301.5L346 302.7M329.5 301.5L328.495 304.627M404.5 268.5V306.5M412 273V307.5M383.5 268.5H363M329.5 330V334.5H339M329.5 330L320.5 329.5M329.5 330L342.5 331.393M358.5 303V294L361 291.5H378L380.5 294V305M320.5 329.5L322.25 324.056M412 307.5L391.5 306.009M412 307.5V311.5M342.5 331.393L346 302.7M342.5 331.393L364 333.696M346 302.7L363 303.936M364 333.696L369.5 334.286M364 333.696L364.52 328.098M366.74 304.208L372.5 304.627M366.74 304.208L366.434 307.5M366.74 304.208L366 304.155M369.5 334.286L385.5 336H391M369.5 334.286L370.096 328.393M372.5 304.627L372.139 308.195M372.5 304.627L373.5 304.7M391 336H412V330.5M391 336L391.5 306.009M391.5 306.009L375.5 304.845M328.495 304.627L366.434 307.5M328.495 304.627L327 309.278M366.434 307.5L366 312.171M372.139 308.195L412 311.5M372.139 308.195L371.653 313M412 311.5V315.5M327 309.278L366 312.171M327 309.278L325.321 314.5M366 312.171L365.458 318M325.321 314.5L365.458 318M325.321 314.5L324 318.611M365.458 318L365.04 322.5M324 318.611L365.04 322.5M324 318.611L322.25 324.056M365.04 322.5L364.52 328.098M322.25 324.056L364.52 328.098M371.653 313L412 315.5M371.653 313L371.147 318M412 315.5V321M371.147 318L412 321M371.147 318L370.692 322.5M412 321V325.5M370.692 322.5L412 325.5M370.692 322.5L370.096 328.393M412 325.5V330V330.5M370.096 328.393L412 330.5M363 303.936V300C368.172 295.353 370.898 295.391 375.5 300V304.845M363 303.936L366 304.155M375.5 304.845L373.5 304.7M366 304.155C368 299 372.5 300 373.5 304.7M194.5 261.5H205V266H194.5V261.5ZM362 336L366 341H377L378 336H362ZM259 283.5C249.518 283.618 248.96 297.62 259 297.5C269.04 297.38 268.482 283.382 259 283.5Z"
                stroke="white"
              />
            </g>
          </g>
          <g
            id="Poisk"
            className="hover-group"
            onClick={() => handleZoneClick("poisk")}
            onMouseEnter={(e) => handleMouseEnter(e, "poisk")}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <g id="dark_6">
              <path d="M432.5 283L435.5 279.5V273V266.5C427.419 260.51 424.824 255.218 423.5 242.5C416.043 231.531 416.106 224.652 423.5 211C422.053 195.727 424.884 188.465 435.5 177.5H471.5C481.399 186.601 484.031 194.112 484.5 211C491.681 223.301 491.641 230.199 484.5 242.5C484.127 253.831 481.585 259.212 471.5 266.5V273V279.5L475.5 283H484.5V319.5H475.5L471.5 324.5V330V349.5L501.5 379H407.5L435.5 349.5V330V324.5L432.5 319.5V283Z" />
              <path
                d="M435.5 273V279.5L432.5 283V319.5L435.5 324.5V330M435.5 273V266.5C427.419 260.51 424.824 255.218 423.5 242.5C416.043 231.531 416.106 224.652 423.5 211C422.053 195.727 424.884 188.465 435.5 177.5H471.5C481.399 186.601 484.031 194.112 484.5 211C491.681 223.301 491.641 230.199 484.5 242.5C484.127 253.831 481.585 259.212 471.5 266.5V273M435.5 273H471.5M471.5 273V279.5L475.5 283H484.5V319.5H475.5L471.5 324.5V330M435.5 330V349.5L407.5 379H501.5L471.5 349.5V330M435.5 330H471.5"
                stroke="white"
                strokeWidth="1.5"
              />
            </g>
            <g id="light_6">
              <path
                d="M471 235C465 236.379 465.5 224.368 471 223.5C476.5 222.632 477 233.621 471 235Z"
                fill="black"
              />
              <path
                d="M471 239.5C459 242.258 459.5 220.274 471 218C482.5 215.726 483 236.742 471 239.5Z"
                fill="black"
              />
              <path
                d="M454 317.5C435 317.5 433.5 286.5 453.5 286.5C473.5 286.5 473 317.5 454 317.5Z"
                fill="black"
              />
              <path
                d="M475.5 284.5V318.5M435.5 322.5H471.5M435.5 350.5H446M471.5 350.5H462.5M435.5 336.5C439.379 336.5 442.867 336.5 446 336.5M471.5 336.5C471.32 336.5 469.002 336.5 462.5 336.5M446 336.5V350.5M446 336.5C453.272 336.5 458.628 336.5 462.5 336.5M446 350.5H462.5M446 350.5L443.2 356M462.5 336.5V350.5M462.5 350.5L476 378M432 378L443.2 356M443.2 356H465M424 242.5H483.5M424 210.5H483.5M424 195.5H483.5M437 266H471M453.5 286.5C433.5 286.5 435 317.5 454 317.5C473 317.5 473.5 286.5 453.5 286.5ZM471 239.5C459 242.258 459.5 220.274 471 218C482.5 215.726 483 236.742 471 239.5ZM471 235C465 236.379 465.5 224.368 471 223.5C476.5 222.632 477 233.621 471 235Z"
                stroke="white"
              />
            </g>
          </g>
          <g
            id="Nauka"
            className="hover-group"
            onClick={() => handleZoneClick("nauka")}
            onMouseEnter={(e) => handleMouseEnter(e, "nauka")}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <g id="dark_7">
              <path d="M472 633H435L425.5 622.5L420 599L432 590L435 585.5L433.936 583.5L413.5 593V570H418.5V562H397V531.5H408.5L415.5 513.5V498.5H420V492.5L411.5 488V393L406.5 388.5V378.5H502V400H637V482.5H503.5V440H495V447L499.5 449.5V472.5L495 476V490H487.5V541H494H504.5V557H488.5V562L472 585.5L475 590C475 590 517.68 590.001 531.5 590C545.32 589.999 543.747 624.999 531.5 625C519.253 625.001 516 625 516 625V644H494V626H475L472 629V633Z" />
              <path
                d="M502 421.5V400M502 400V378.5H406.5V388.5L411.5 393V488L420 492.5V498.5H415.5V513.5L408.5 531.5H397V562H418.5M502 400H637V482.5H503.5V440H495V447L499.5 449.5V472.5L495 476V490H487.5V541H494H504.5V557H488.5V562L472 585.5L475 590C475 590 517.68 590.001 531.5 590C545.32 589.999 543.747 624.999 531.5 625C519.253 625.001 516 625 516 625V644H494V626H475L472 629V633H435L425.5 622.5L420 599L432 590L435 585.5L433.936 583.5M418.5 562H422.5L433.936 583.5M418.5 562V570H413.5V593L433.936 583.5"
                stroke="white"
                strokeWidth="1.5"
              />
            </g>
            <g id="light_7">
              <path
                d="M443.5 513V504L446 501.5H463L465.5 504V515L460.5 514.545V514.845L475 515.9L476.5 516.009L497 517.5V521.5V525.5V531V535.5V540V540.5V547L488 546.425L474.5 545.563L454.5 544.286C454 548 448 548 449 543.696L427.5 541.393L405.5 539.5L407.25 534.056L409 528.611L410.321 524.5L412 519.278L413.495 514.627L414.5 511.5L431 512.7L448 513.936V513.409L443.5 513Z"
                fill="black"
              />
              <path
                d="M502 599.5H509.5V603H516.5V611.5H509.5V613H502V599.5Z"
                fill="black"
              />
              <path d="M591.5 400.5V483H596.5V400.5H591.5Z" fill="black" />
              <path d="M548 400.5V483H553V400.5H548Z" fill="black" />
              <path d="M461 596V606H449.5V596H461Z" fill="black" />
              <path
                d="M444.5 626C433 626 433 617 444.5 617C456 617 456 626 444.5 626Z"
                fill="black"
              />
              <path
                d="M406.5 386.5H501.5M412 487.5H428.5V475M411 431.5V422L406.5 425V431.5M411 431.5V441L406.5 438V431.5M411 431.5H406.5M411 402.5L406.5 405.5V417.5L411 419.5V402.5ZM411 402.5L406.5 399.5V390M411 402.5V393.5L406.5 390M406.5 390H409H428.5V421.5M428.5 421.5H480M428.5 421.5V475M480 421.5V390H495.5V427.5M480 421.5L480.5 475M500.5 439.5H495.5V435M500.5 439.5H516V421.5H511M500.5 439.5V435M500.5 421.5V427.5M500.5 421.5V400.5H505.75M500.5 421.5H505.75M495.5 427.5H500.5M495.5 427.5V435M500.5 427.5V435M500.5 435H495.5M511 421.5V400.5H505.75M511 421.5H505.75M505.75 400.5V421.5M431 512.7L414.5 511.5L413.495 514.627M431 512.7L430.607 515.923M431 512.7L448 513.936M427.5 541.393L428.151 536.055M427.5 541.393L449 543.696M427.5 541.393L405.5 539.5L407.25 534.056M428.151 536.055L428.83 530.49M428.151 536.055L407.25 534.056M428.151 536.055L449.52 538.098M428.83 530.49L429.358 526.16M428.83 530.49L409 528.611M428.83 530.49L450.04 532.5M429.358 526.16L430.034 520.616M429.358 526.16L410.321 524.5M429.358 526.16L450.458 528M430.034 520.616L430.607 515.923M430.034 520.616L412 519.278M430.034 520.616L451 522.171M430.607 515.923L413.495 514.627M430.607 515.923L451.434 517.5M449 543.696C448 548 454 548 454.5 544.286M449 543.696L449.52 538.098M449 543.696L454.5 544.286M454.5 544.286L455.096 538.393M454.5 544.286L474.5 545.563M451.74 514.208L457.5 514.627M451.74 514.208L451.434 517.5M451.74 514.208L451 514.155M457.5 514.627L457.139 518.195M457.5 514.627L458.5 514.7M413.495 514.627L412 519.278M451.434 517.5L451 522.171M457.139 518.195L497 521.5M457.139 518.195L456.653 523M497 521.5V517.5L476.5 516.009L475 515.9M497 521.5V525.5M412 519.278L410.321 524.5M451 522.171L450.458 528M410.321 524.5L409 528.611M450.458 528L450.04 532.5M409 528.611L407.25 534.056M450.04 532.5L449.52 538.098M456.653 523L497 525.5M456.653 523L456.147 528M497 525.5V531M456.147 528L497 531M456.147 528L455.692 532.5M497 531V535.5M455.692 532.5L497 535.5M455.692 532.5L455.096 538.393M497 535.5V540V540.5M455.096 538.393L497 540.5M497 540.5V547L488 546.425M448 513.936V513.409M448 513.936L451 514.155M448 513.409V510C453.172 505.353 455.898 505.391 460.5 510V514.545M448 513.409L451.19 513.699M448 513.409L443.5 513V504L446 501.5H463L465.5 504V515L460.5 514.545M460.5 514.845V514.545M460.5 514.845L458.5 514.7M460.5 514.845L475 515.9M460.5 514.545L458.419 514.356M451 514.155C451.061 513.997 451.125 513.845 451.19 513.699M458.5 514.7C458.475 514.583 458.448 514.469 458.419 514.356M451.19 513.699C453.218 509.183 457.314 510.092 458.419 514.356M451.19 513.699L458.419 514.356M426.5 562V544.286H397.5V562H426.5ZM426.5 562H449.5M488 546.425V562H466.5M488 546.425L474.5 545.563M474.5 545.563V550.5H432.5V543M466.5 562V577.5H449.5M466.5 562H449.5M449.5 577.5V570.5M449.5 577.5V586H440.5M449.5 562V570.5M449.5 570.5H440.5V586M440.5 586H433V628.5M433 630.5V628.5M433 628.5H472M483 625V590M493 590V625M502 613V599.5H509.5V603M502 613H509.5M502 613H494.5V625M509.5 613V611.5M509.5 613H516.5V624M509.5 603H516.5V611.5H509.5M509.5 603V611.5M519.5 624V590M526.5 590V624M432.5 512V487.5H475V515.9M428.5 475H480.5M480.5 475V486.5H495M449.5 606V596H461V606H449.5ZM548 483V400.5H553V483H548ZM591.5 483V400.5H596.5V483H591.5ZM444.5 617C433 617 433 626 444.5 626C456 626 456 617 444.5 617Z"
                stroke="white"
              />
            </g>
          </g>
          <g
            id="Zarya"
            className="hover-group"
            onClick={() => handleZoneClick("fgb")}
            onMouseEnter={(e) => handleMouseEnter(e, "fgb")}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <g id="dark_8">
              <path d="M484.5 319.5V283H503.5L532 258.5V252H563L574 258.5L577.5 252H591.5V256H640.5L643.5 260L648.5 254H724.5L730.5 262C743.709 262.007 743.961 280.007 730.5 280L738.5 284.5V321.5L723 330.5V349H648.5L643.5 340L640.5 346H628.5L627 349H600V343H591.5V349H577.5L574 343L570 349H532L503.5 319.5H484.5Z" />
              <path
                d="M532 349L503.5 319.5H484.5V283H503.5L532 258.5M532 349H570L574 343L577.5 349H591.5V343H600V349H627L628.5 346H640.5L643.5 340L648.5 349H723V330.5L738.5 321.5V284.5L730.5 280C743.961 280.007 743.709 262.007 730.5 262L724.5 254H648.5L643.5 260L640.5 256H591.5V252H577.5L574 258.5L563 252H532V258.5M532 349V258.5"
                stroke="white"
                strokeWidth="1.5"
              />
            </g>
            <g id="light_8">
              <path
                d="M659.875 276.5L675.188 267.75L690.5 259L701 276.868L704.75 283.25L714 298.991L719 307.5L714 310.417L706.143 315L703.75 316.396L693.286 322.5L688.5 325.292L684 327.917L683 328.5L669.5 336.375L653 346L638.5 321.5L627 302.069L624 297L627 295.286L641 287.286L652.875 280.5L655 279.286L658.5 277.286L659.875 276.5Z"
                fill="black"
              />
              <path
                d="M655 279.286L669 303.893M655 279.286L652.875 280.5L641 287.286M655 279.286L658.5 277.286L659.875 276.5M683 328.5L669.5 336.375M683 328.5L669 303.893M683 328.5L684 327.917L688.5 325.292M688.5 325.292L674.188 300.896M688.5 325.292L693.286 322.5L703.75 316.396M659.875 276.5L675.188 267.75M659.875 276.5L674.188 300.896M675.188 267.75L690.5 259L701 276.868L704.75 283.25M675.188 267.75L703.75 316.396M703.75 316.396L706.143 315L714 310.417L719 307.5L714 298.991L704.75 283.25M669.5 336.375L653 346L638.5 321.5M669.5 336.375L641 287.286M641 287.286L627 295.286L624 297L627 302.069L638.5 321.5M638.5 321.5L669 303.893M674.188 300.896L704.75 283.25"
                stroke="white"
              />
            </g>
            <path
              id="color"
              d="M490.5 292.5V284H504V292.5M490.5 292.5C502.5 292.5 504.5 292.5 504 292.5M490.5 292.5V309.5M504 292.5V309.5M504 292.5L510 289.821M504 309.5V319H490.5V309.5M504 309.5H490.5M504 309.5L510 312.5M532 280L510 289.821M532 323.5L510 312.5M510 312.5V289.821M542 348L545 343.5M545 343.5H542V326.5H566.5M545 343.5H558M558 343.5L561 348M558 343.5H584M581 348L584 343.5M584 343.5L587 348M584 343.5H617M617 343.5H637.5V326.5H627.5M617 343.5V348M538.5 253V348M637.5 276H627.5M637.5 276H642V270.5L640 268.5M637.5 276V268.5M566.5 326.5V276M566.5 326.5H574.5M566.5 276H542V258.5H637.5V259.5M566.5 276H574.5M574.5 276V326.5M574.5 276H627.5M574.5 326.5H627.5M627.5 326.5V301.569M627.5 294.786V280M627.5 276V280M627.5 280H653.375M640 268.5H637.5M640 268.5C644.569 267.961 643.062 258.965 640 259.5C636.938 260.035 637.5 259.5 637.5 259.5M637.5 268.5V259.5M659 276.786L648 276.5M648 276.5C643.948 272.009 643.662 269.491 648 265M648 276.5V265M648 255.5V265M701.5 276.368H709.5M709.5 276.368V279H714.5M709.5 276.368V266M709.5 266V254H723V266M709.5 266H723M723 266V279H714.5M684.5 327.417H697.5H710.5M710.5 327.417V324.792H714.5M710.5 327.417V337.708M710.5 337.708V348H722V337.708M710.5 337.708H722M722 337.708V324.792H714.5M714.5 324.792V309.917L706.643 314.5V322H693.786M714.5 298.491V279M730.5 262V280M558 293.5V310.5L569.5 306.5V297L558 293.5Z"
              stroke="white"
            />
          </g>
          <g
            id="Rassvet"
            className="hover-group"
            onClick={() => handleZoneClick("rassvet")}
            onMouseEnter={(e) => handleMouseEnter(e, "rassvet")}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <g id="dark_9">
              <path d="M745.5 278.5C742 265.5 759.5 263.5 762 275H769.5C775.616 275.788 777.998 277.799 780.5 284H804V320.5H778V330V336C786.907 341.161 789.137 344.935 790.5 352.5V382.5H812.5V376H820V393.5H813.5L791.5 436.5L813.5 458L816 454.5H820V474.5H813.5V470H784L778 475.5V482H740.5V475.5L734.5 470H705.5V474.5H698.5V454L702 454.5L705.5 458L728 436.5L705.5 393.5H700.5V376H707V382.5H730V352.5C730.425 344.411 732.616 340.75 740.5 336V330V326L738 320.5V284L745.5 278.5Z" />
              <path
                d="M745.5 278.5C742 265.5 759.5 263.5 762 275M745.5 278.5C749 291.5 764.5 286.5 762 275M745.5 278.5L738 284V320.5L740.5 326V330M762 275H769.5C775.616 275.788 777.998 277.799 780.5 284H804V320.5H778V330M740.5 330V336C732.616 340.75 730.425 344.411 730 352.5V382.5H707V376H700.5V393.5H705.5L728 436.5L705.5 458L702 454.5L698.5 454V474.5H705.5V470H734.5L740.5 475.5V482H778V475.5L784 470H813.5V474.5H820V454.5H816L813.5 458L791.5 436.5L813.5 393.5H820V376H812.5V382.5H790.5V352.5C789.137 344.935 786.907 341.161 778 336V330M740.5 330H778"
                stroke="white"
                strokeWidth="1.5"
              />
            </g>
            <path
              id="light_9"
              d="M740.5 324.5H777.5M740.5 336H777.5M791 284.5V320M780 320V284M730.5 356H790M707 382.5V394.5M729.5 382.5V391M729.5 391V437.5M729.5 391H737M740.5 475.5H778M730 456H790M813.5 382.5V393.5M789 449H786M729.5 437.5H737M729.5 437.5V445.5M737 391V437.5M737 391H744.5M737 437.5H744.5M744.5 391H756V437.5H744.5M744.5 391V437.5M731 462.5L734.5 469.5M786 382.5H790V391M786 382.5H779V449H786M786 382.5V449M773.5 391H760V437.5H773.5V391Z"
              stroke="white"
            />
            <g id="color_2">
              <path
                d="M774.052 293C770.156 293 769.848 287 773.95 287C778.051 287 777.948 293 774.052 293Z"
                fill="black"
              />
              <path
                d="M768 293C764.104 293 763.796 287 767.897 287C771.999 287 771.896 293 768 293Z"
                fill="black"
              />
              <path d="M759.5 295V307.5H756V295H759.5Z" fill="black" />
              <path d="M756 294V308.5H746V294H756Z" fill="black" />
              <path
                d="M753.55 286.988C740.55 286.988 739.55 266.988 753.55 266.988C767.55 266.988 766.55 286.988 753.55 286.988Z"
                fill="black"
              />
              <path
                d="M730 390.5V424L718.5 400.5L713 390.5H730Z"
                fill="black"
              />
              <path
                d="M789.5 389.5V424L801 403L808.5 389.5H789.5Z"
                fill="black"
              />
              <path
                d="M731.5 464V442.5L720.5 452.5L708.5 464H731.5Z"
                fill="black"
              />
              <path
                d="M788 464V442.5L798.5 452.5L810.5 464H788Z"
                fill="black"
              />
              <path
                d="M774.052 293C770.156 293 769.848 287 773.95 287C778.051 287 777.948 293 774.052 293Z"
                stroke="white"
              />
              <path
                d="M768 293C764.104 293 763.796 287 767.897 287C771.999 287 771.896 293 768 293Z"
                stroke="white"
              />
              <path d="M759.5 295V307.5H756V295H759.5Z" stroke="white" />
              <path d="M756 294V308.5H746V294H756Z" stroke="white" />
              <path
                d="M753.55 286.988C740.55 286.988 739.55 266.988 753.55 266.988C767.55 266.988 766.55 286.988 753.55 286.988Z"
                stroke="white"
              />
              <path
                d="M730 390.5V424L718.5 400.5L713 390.5H730Z"
                stroke="white"
              />
              <path
                d="M789.5 389.5V424L801 403L808.5 389.5H789.5Z"
                stroke="white"
              />
              <path
                d="M731.5 464V442.5L720.5 452.5L708.5 464H731.5Z"
                stroke="white"
              />
              <path
                d="M788 464V442.5L798.5 452.5L810.5 464H788Z"
                stroke="white"
              />
            </g>
          </g>
          <g
            id="Harmony"
            className="hover-group"
            onClick={() => handleZoneClick("node-2")}
            onMouseEnter={(e) => handleMouseEnter(e, "node-2")}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <g id="dark_10">
              <path d="M1136 342V291H1143.5L1150 268.5H1235.42C1236.1 268.489 1236.8 268.489 1237.5 268.5H1273.5L1280.5 291L1316 311.5H1333.5V347.5H1316L1282 337L1273.5 363H1239.5C1238.84 363.01 1238.17 363.01 1237.5 363H1150L1143.5 342H1136Z" />
              <path
                d="M1237.5 268.5H1273.5L1280.5 291L1316 311.5H1333.5V347.5H1316L1282 337L1273.5 363H1237.5M1237.5 268.5H1150L1143.5 291H1136V342H1143.5L1150 363H1237.5M1237.5 268.5C1173.24 267.464 1173.15 362.007 1237.5 363M1237.5 268.5C1301.76 269.536 1301.85 363.993 1237.5 363"
                stroke="white"
                strokeWidth="1.5"
              />
            </g>
            <g id="light_10">
              <path
                d="M1237 292.5C1240.38 292.501 1243.37 293.05 1246 294.027C1252.35 296.392 1256.53 301.27 1258.6 307C1260.64 312.666 1260.62 319.165 1258.6 324.889C1256.62 330.481 1252.74 335.333 1247 337.946C1244.13 339.254 1240.79 340.002 1237 340C1233.85 339.999 1231.02 339.481 1228.5 338.554C1221.94 336.14 1217.55 330.949 1215.41 324.889C1213.38 319.153 1213.35 312.638 1215.41 306.963C1217.47 301.25 1221.64 296.387 1227.98 294.027C1230.61 293.047 1233.62 292.499 1237 292.5Z"
                fill="black"
              />
              <path
                d="M1150.5 297L1143.5 303.5V327.5L1150.5 333.5V297Z"
                fill="black"
              />
              <path d="M1247 359V345H1237.75H1228.5V359H1247Z" fill="black" />
              <path
                d="M1246 294.027C1243.37 293.05 1240.38 292.501 1237 292.5C1233.62 292.499 1230.61 293.047 1227.98 294.027M1246 294.027L1257 272.5M1246 294.027C1252.35 296.392 1256.53 301.27 1258.6 307M1258.6 307L1281.5 297M1258.6 307C1260.64 312.666 1260.62 319.165 1258.6 324.889M1258.6 324.889L1281.5 335M1258.6 324.889C1256.62 330.481 1252.74 335.333 1247 337.946M1247 337.946C1244.13 339.254 1240.79 340.002 1237 340C1233.85 339.999 1231.02 339.481 1228.5 338.554M1247 337.946L1256 360M1228.5 338.554L1218.5 360M1228.5 338.554C1221.94 336.14 1217.55 330.949 1215.41 324.889M1215.41 324.889L1193 334.5M1215.41 324.889C1213.38 319.153 1213.35 312.638 1215.41 306.963M1215.41 306.963L1193 297M1215.41 306.963C1217.47 301.25 1221.64 296.387 1227.98 294.027M1227.98 294.027L1219 272.5M1228.5 269V287H1247V268.5M1184.5 269V362.5M1157.5 269V362.5M1150.5 268.5V297M1150.5 362.5V333.5M1143.5 291V303.5M1143.5 342V327.5M1143.5 303.5L1150.5 297M1143.5 303.5V327.5M1150.5 297V333.5M1143.5 327.5L1150.5 333.5M1316.5 311.5V320.5M1316.5 347.5V337.946M1316.5 320.5L1284 305.5M1316.5 320.5V337.946M1316.5 337.946L1285 323M1228.5 345V359H1247V345H1237.75H1228.5Z"
                stroke="white"
              />
            </g>
          </g>
          <g
            id="Destiny"
            className="hover-group"
            onClick={() => handleZoneClick("us-lab")}
            onMouseEnter={(e) => handleMouseEnter(e, "us-lab")}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <path
              id="dark_11"
              d="M1136 343.5V290.5L1130 268H969H955L949.5 283V346L958 364H1030.5V368.5H1055V364H1127L1136 343.5Z"
              stroke="white"
              strokeWidth="1.5"
            />
            <g id="light_11">
              <path
                d="M1127.5 360V364H1104.5H1079.5H1054.5H1030H980H958V348.5V316V284V267.5L980 267.565L1054.5 267.785L1079.5 267.858L1105 267.934L1127.5 268V274.25V280.5V284V296V316V336V348V360Z"
                fill="black"
              />
              <path
                d="M1127.5 296L1135.5 303.5M1127.5 296V316M1127.5 296V284M1127.5 336L1135.5 328M1127.5 336V348M1127.5 336V316M958 348.5V364H980M958 348.5L1127.5 348M958 348.5V316M1127.5 348V360V364H1104.5M1127.5 316H958M958 316V284M958 284V267.5L980 267.565M958 284H1127.5M1127.5 284V280.5M1127.5 280.5V274.25M1127.5 280.5H1105M1127.5 274.25V268L1105 267.934M1127.5 274.25L1105 274.103M1105 267.934V274.103M1105 267.934L1079.5 267.858M1105 274.103L1079.5 273.936M1105 280.5L1104.5 364M1105 280.5H1079.5M1104.5 364H1079.5M1079.5 267.858V273.936M1079.5 267.858L1054.5 267.785M1079.5 273.936L1054.5 273.772M1079.5 280.5V364M1079.5 280.5H1054.5M1079.5 364H1054.5M1054.5 364V280.5M1054.5 364H1030M1054.5 280.5H1030M1054.5 273.772L1013 273.5V280.5H1030M1054.5 273.772V267.785M1054.5 267.785L980 267.565M1030 364V280.5M1030 364H980M980 364V267.565"
                stroke="white"
              />
            </g>
          </g>
          <g
            id="Boeing CST-100 Starliner"
            className="hover-group"
            onClick={() => handleZoneClick("boeing-cst-100-starliner")}
            onMouseEnter={(e) =>
              handleMouseEnter(e, "boeing-cst-100-starliner")
            }
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <g id="dark_12">
              <path d="M1333.5 312H1344.5L1395 280H1401L1406.5 271H1446V280H1449.5V382H1445V390H1406L1401 384H1395L1344.5 347H1333.5V312Z" />
              <path
                d="M1401 384L1406 390H1445V382H1449.5V280H1446V271H1406.5L1401 280M1401 384H1395M1401 384V280M1395 384L1344.5 347H1333.5V312H1344.5L1395 280M1395 384V280M1395 280H1401"
                stroke="#444444"
                strokeWidth="1.5"
              />
            </g>
            <g id="light_12">
              <path
                d="M1459 296.5C1462.5 297.5 1460.5 312 1456 311C1455.79 310.979 1455.6 310.934 1455.42 310.865C1451.13 309.267 1452.77 295.188 1459 296.5Z"
                fill="black"
              />
              <path
                d="M1458.42 355C1461.92 356 1459.92 370.5 1455.42 369.5C1455.21 369.479 1455.02 369.434 1454.83 369.365C1450.55 367.767 1452.18 353.688 1458.42 355Z"
                fill="black"
              />
              <path
                d="M1371.58 320.135C1379 321.976 1375.5 337 1368.58 334.635C1368.38 334.614 1368.18 334.568 1368 334.5C1363.71 332.901 1365 318.5 1371.58 320.135Z"
                fill="black"
              />
              <path
                d="M1449.5 294.5L1459 296.5M1459 296.5C1462.5 297.5 1460.5 312 1456 311M1459 296.5C1452.77 295.188 1451.13 309.267 1455.42 310.865M1456 311L1455.42 310.865M1456 311C1455.79 310.979 1455.6 310.934 1455.42 310.865M1455.42 310.865L1449.5 309.5M1401 279.5H1431.5M1447 279.5H1445M1402 384.5H1431.5M1431.5 319.5V279.5M1431.5 279.5H1445M1401 319.5H1449.5M1401 344.5H1431.5M1449.5 344.5H1431.5M1431.5 344.5V384.5M1431.5 384.5H1445V340.5M1445 279.5V324.5M1445 324.5C1445 324.5 1414.85 324.5 1409 324.5C1403.15 324.5 1402.19 340.5 1409 340.5C1415.81 340.5 1445 340.5 1445 340.5M1445 324.5V340.5M1345 347H1338.5M1345 347V343M1345 347L1352.5 353.5H1329.5L1338.5 347M1338.5 347V343H1345M1345 343V312M1356.5 304.5V312L1370 305.5V316L1362.5 318M1362.5 318V300M1362.5 318V360M1389.5 283.5V302M1385.5 377V353.5L1389.5 357V339.5M1389.5 325.5L1380.5 327.5V337L1389.5 339.5M1389.5 325.5V339.5M1389.5 325.5V302M1389.5 302L1380.5 307V289M1448.92 353L1458.42 355M1458.42 355C1461.92 356 1459.92 370.5 1455.42 369.5M1458.42 355C1452.18 353.688 1450.55 367.767 1454.83 369.365M1455.42 369.5L1454.83 369.365M1455.42 369.5C1455.21 369.479 1455.02 369.434 1454.83 369.365M1454.83 369.365L1448.92 368M1368.58 334.635C1375.5 337 1379 321.976 1371.58 320.135C1365 318.5 1363.71 332.901 1368 334.5M1368.58 334.635L1368 334.5M1368.58 334.635C1368.38 334.614 1368.18 334.568 1368 334.5"
                stroke="#444444"
              />
            </g>
          </g>
          <g
            id="Kibo"
            className="hover-group"
            onClick={() => handleZoneClick("jap-lab")}
            onMouseEnter={(e) => handleMouseEnter(e, "jap-lab")}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <g id="dark_13">
              <path d="M1196.5 268L1212.5 254.5L1191 248V183H1217L1224.5 197H1233.5V207H1273.5V197H1285V248L1263.86 256.357L1263.71 256.737L1273.5 268H1247H1227.5H1213.5H1196.5Z" />
              <path
                d="M1233.5 207V197H1224.5L1217 183H1191V248L1212.5 254.5L1196.5 268H1213.5M1233.5 207H1273.5M1233.5 207L1234 236.5M1273.5 207V197H1285V248L1263.5 256.5L1273.5 268H1247M1273.5 207L1272 236.5M1247 268V254.5H1227.5V268M1247 268H1227.5M1227.5 268H1213.5M1213.5 268L1234 236.5M1234 236.5H1272M1272 236.5L1259.5 267"
                stroke="white"
                strokeWidth="1.5"
              />
            </g>
            <g id="light_13">
              <path d="M1198.5 241.5V193.5H1212.5V241.5H1198.5Z" fill="black" />
              <path
                d="M1197.5 249H1225M1191.5 241.5H1198.5M1231 241.5H1212.5M1191.5 193.5H1198.5M1223 193.5H1212.5M1198.5 193.5V241.5M1198.5 193.5H1212.5M1198.5 241.5H1212.5M1212.5 193.5V241.5M1233.5 255L1242 237M1258.5 237L1247.5 260.5M1284.5 242H1270"
                stroke="white"
              />
            </g>
          </g>
          <g
            id="SpaceX Dragon"
            className="hover-group"
            onClick={() => handleZoneClick("spacex-dragon")}
            onMouseEnter={(e) => handleMouseEnter(e, "spacex-dragon")}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <path
              id="dark_14"
              d="M1225 197.5L1216.5 183V174.5L1209.5 175.5V157L1215 152C1206.2 150.23 1205.25 147.153 1212.5 137V73.5L1298.5 72.5V137L1302 143.5L1285 197.5H1273.5V207H1233.5V197.5H1225Z"
              stroke="#444444"
              strokeWidth="1.5"
            />
            <g id="light_14">
              <path
                d="M1268 169L1271.5 154H1279L1275.5 169H1273.5L1276.5 194H1233L1227 169H1268Z"
                fill="black"
              />
              <path
                d="M1243.5 109.5L1223.5 107.5L1224.07 103L1224.65 98.5L1225.35 93L1226 87.9167L1226.5 84L1249.5 86.4C1249.5 84.5 1271 83.5 1271 88.6435L1277.5 89.3217L1284 90L1283.38 95L1282.81 99.5L1282.13 105L1281.49 110.114L1281 114L1277.5 113.58V129.5V137.5H1243.5V133.5V129.5V109.5Z"
                fill="black"
              />
              <path
                d="M1234 197H1273.5M1223 194H1233M1286.5 194H1276.5M1215.5 174.5V169M1215.5 151.5V169M1215.5 169H1227M1293.5 169H1275.5M1268 169L1271.5 154H1279L1275.5 169M1268 169H1273.5M1268 169H1227M1275.5 169H1273.5M1276.5 194L1273.5 169M1276.5 194H1233M1233 194L1227 169M1300.5 147.5H1208M1212.5 137.5H1243.5M1299 137.5H1286.5M1286.5 73V80.5M1286.5 137.5V133.5M1286.5 137.5H1277.5M1298 133.5H1286.5M1286.5 133.5V80.5M1298 80.5H1286.5M1243.5 137.5H1277.5M1243.5 137.5V133.5M1243.5 109.5L1223.5 107.5L1224.07 103M1243.5 109.5V129.5M1243.5 109.5L1248.5 110.114M1277.5 113.58L1281 114L1281.49 110.114M1277.5 113.58V129.5M1277.5 113.58L1272 113M1277.5 137.5V129.5M1277.5 129.5H1243.5M1243.5 129.5V133.5M1243.5 133.5H1212.5M1254.5 110.82C1253.5 115.5 1261 116.5 1262.5 111.78M1272 113V120C1262.36 125.575 1257.9 125.115 1248.5 119.5V110.114M1272 113L1253 110.667M1248.5 110.114L1253 110.667M1253 110.667L1256 87.0783M1256 87.0783L1271 88.6435M1256 87.0783L1249.5 86.4M1226 87.9167L1226.5 84L1249.5 86.4M1226 87.9167L1283.38 95M1226 87.9167L1225.35 93M1283.38 95L1284 90L1277.5 89.3217M1283.38 95L1282.81 99.5M1282.81 99.5L1225.35 93M1282.81 99.5L1282.13 105M1225.35 93L1224.65 98.5M1282.13 105L1224.65 98.5M1282.13 105L1281.49 110.114M1224.65 98.5L1224.07 103M1224.07 103L1281.49 110.114M1277.5 89.3217V81.1609M1277.5 89.3217L1271 88.6435M1277.5 73V81.1609M1277.5 81.1609H1212.5M1271 88.6435C1271 83.5 1249.5 84.5 1249.5 86.4"
                stroke="#444444"
              />
            </g>
          </g>
          <g
            id="Unity"
            className="hover-group"
            onClick={() => handleZoneClick("node-1")}
            onMouseEnter={(e) => handleMouseEnter(e, "node-1")}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <g id="dark_15">
              <path d="M804 320V283.5L838 292.5L846 268.5H883V263H873V257C858.503 249.775 858.731 245.725 873 238.5V234.5H870L869.5 202H878.5V190.5H884.5V185H889L901.5 139.5V105.5C891.044 101.926 887.539 98.6328 884.5 91H902.5C906.351 79.6034 908.434 79.2884 912 91H931C928.733 100.089 924.661 102.989 914 105.5V139.5L899 185H903V190.5H928.5V196H937V243H928.5V251V268.5L949.5 283.5V345L943.5 351.5L952 366L947 380.5L934.5 382.5L926.5 391V398H888.5V393.5L870.5 378.5V368.5H853.5L844 357V347.5L838.5 340L804 320Z" />
              <path
                d="M838.5 340L804 320V283.5L838 292.5M838.5 340L838 292.5M838.5 340L844 347.5V357L853.5 368.5H870.5V378.5L888.5 393.5V398H926.5V391L934.5 382.5L947 380.5L952 366L943.5 351.5L949.5 345V283.5L928.5 268.5V251V243H937V196H928.5V190.5H903V185H899L914 139.5V105.5C924.661 102.989 928.733 100.089 931 91H912C908.434 79.2884 906.351 79.6034 902.5 91H884.5C887.539 98.6328 891.044 101.926 901.5 105.5V139.5L889 185H884.5V190.5H878.5V202H869.5L870 234.5H873V238.5C858.731 245.725 858.503 249.775 873 257V263H883V268.5H846L838 292.5"
                stroke="white"
                strokeWidth="1.5"
              />
            </g>
            <g id="light_15">
              <path
                d="M839 307.5V327L846.5 335V316.75V299.5L839 307.5Z"
                fill="black"
              />
              <path
                d="M804 308.5L839 327M839 327V307.5M839 327L846.5 335M839 307.5L804 293M839 307.5L846.5 299.5M846.5 269V289.5M846.5 344V316.75M870 269V287M846.5 289.5H867.5M846.5 289.5V316.75M846.5 316.75H860.5M888.5 394H925.5M871 375H876M909 375H918.5M909 379.5H915.5L910 390.5H900.5L899 388M895.5 388.5V391H889.5L886 385.5M920 379.5L914 390.5H921L927 382.5M884 269H915.5M884 262.5H921M880 262.5V201.5M873.5 257.5V238.5M929 242V196.5M903.5 191.5H884M900 186H887M914 138.5H901.5M901.5 104.5H916"
                stroke="white"
              />
            </g>
          </g>
          <g
            id="Quest Airlock"
            className="hover-group"
            onClick={() => handleZoneClick("airlock")}
            onMouseEnter={(e) => handleMouseEnter(e, "airlock")}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <g id="light_16">
              <path
                d="M888 273.865C893.081 272.397 905.5 272 905.5 272C905.5 272 910.972 272.41 913.5 272.847C913.5 272.847 920.341 265.165 925.5 254.5C930.659 243.835 957.496 256.497 951.5 270.5C945.504 284.503 940.846 288.086 940.846 288.086C943.668 291.567 945.849 295.447 947.416 299.557C951.702 310.8 951.394 323.765 947.043 335C945.321 339.447 942.966 343.622 940.011 347.313L952.5 365.5L947.5 380.5L934 383.5L921.376 380.5L913.5 362.197L911.5 362.5L907.5 383L897 388.5L882.297 384.5L875.383 375.5L882.297 355C881.858 354.706 881.426 354.404 881 354.095L869.5 369H853.5L843 357.5V347.313L863.505 330C859.857 319.488 859.488 307.979 862.796 298C867.412 287.462 875.771 278.343 888 273.865Z"
                fill="black"
              />
              <path
                d="M905.5 299V286M905.5 299C900.493 299.038 896.466 300.888 893.5 303.746M905.5 299C911.04 298.958 915.38 301.153 918.411 304.5M905.5 286C901.254 286.062 897.417 286.805 894 288.086M905.5 286C909.746 285.938 913.583 286.571 917 287.755M894 288.086L888 273.865M894 288.086C890.12 289.541 886.781 291.69 884 294.321M888 273.865C893.081 272.397 905.5 272 905.5 272C905.5 272 910.972 272.41 913.5 272.847M888 273.865C875.771 278.343 867.412 287.462 862.796 298M862.796 298L876.858 304.5M862.796 298C859.488 307.979 859.857 319.488 863.505 330M876.858 304.5C878.547 300.708 880.935 297.221 884 294.321M876.858 304.5C875.033 308.596 874.023 313.048 873.855 317.5M875.383 329L865.074 334M875.383 329C874.21 325.328 873.707 321.414 873.855 317.5M875.383 329C876.683 333.074 878.807 336.851 881.78 340M865.074 334C864.497 332.687 863.974 331.352 863.505 330M865.074 334C865.67 335.359 866.324 336.694 867.034 338M893.5 347.313L888 358.238M893.5 347.313C888.699 345.754 884.801 343.201 881.78 340M893.5 347.313C896.889 348.413 900.728 349.017 905.027 349.004M888 358.238C885.997 357.292 884.095 356.207 882.297 355M888 358.238C888.959 358.691 889.94 359.113 890.945 359.5M919 346.414C915.137 348 910.642 348.93 905.5 349C905.342 349.002 905.184 349.003 905.027 349.004M919 346.414L925 359.013M919 346.414C923.008 344.768 926.336 342.415 929 339.583M925 359.013C924.185 359.377 923.351 359.716 922.5 360.027M925 359.013C928.303 357.54 931.307 355.65 934 353.429M935.34 329L947.043 335M935.34 329C933.988 332.896 931.882 336.52 929 339.583M935.34 329C936.722 325.015 937.315 320.745 937.141 316.5M947.043 335C951.394 323.765 951.702 310.8 947.416 299.557M947.043 335C945.321 339.447 942.966 343.622 940.011 347.313M934.495 304.5L947.416 299.557M934.495 304.5C932.906 300.708 930.617 297.221 927.648 294.321M934.495 304.5C936.083 308.29 936.972 312.383 937.141 316.5M947.416 299.557C945.849 295.447 943.668 291.567 940.846 288.086M917 287.755L923.256 275.5M917 287.755C921.187 289.205 924.743 291.482 927.648 294.321M923.256 275.5C922.842 275.341 922.424 275.187 922 275.038M923.256 275.5C928.431 277.486 932.83 280.221 936.484 283.5M893.5 303.746L884 294.321M893.5 303.746C889.824 307.289 887.778 312.382 887.516 317.5M887.516 317.5H873.855M887.516 317.5C887.286 321.991 888.43 326.501 891.054 330M891.054 330C893.98 333.903 898.747 336.547 905.5 336.5C911.569 336.458 916.034 334.264 919 330.955M891.054 330L881.78 340M891.054 330V341.5H905.027M919 330.955V341.5H905.027M919 330.955C919.128 330.812 919.254 330.667 919.376 330.52M929 339.583L919.376 330.52M919.376 330.52C920.155 329.587 920.82 328.573 921.376 327.5M905.027 341.5V349.004M918.411 304.5L927.648 294.321M918.411 304.5C918.98 305.128 919.503 305.798 919.979 306.5M919.979 306.5H926.5V308.5M919.979 306.5C924.079 312.551 924.7 321.081 921.376 327.5M921.376 327.5H926.5V323.5M926.5 323.5H932.5V316.5M926.5 323.5V308.5M926.5 308.5H932.5V316.5M937.141 316.5H932.5M913.5 272.847C913.5 272.847 920.341 265.165 925.5 254.5C930.659 243.835 957.496 256.497 951.5 270.5C945.504 284.503 940.846 288.086 940.846 288.086M913.5 272.847C916.529 273.371 919.361 274.11 922 275.038M940.846 288.086C939.532 286.465 938.079 284.931 936.484 283.5M922 275.038L930 263.5L940.846 269.5L936.484 283.5M863.505 330L843 347.313V357.5L853.5 369H869.5L881 354.095M881 354.095C878.987 352.638 877.113 351.024 875.383 349.281M881 354.095C881.426 354.404 881.858 354.706 882.297 355M867.034 338L854.5 349.004L863 359.5L875.383 349.281M867.034 338C869.269 342.113 872.062 345.936 875.383 349.281M882.297 355L875.383 375.5L882.297 384.5L897 388.5L907.5 383L911.5 362.5L913.5 362.197M913.5 362.197C910.952 362.52 908.284 362.628 905.5 362.5C904.484 362.453 903.484 362.376 902.5 362.271M913.5 362.197L921.376 380.5L934 383.5L947.5 380.5L952.5 365.5L940.011 347.313M913.5 362.197C916.691 361.794 919.693 361.055 922.5 360.027M940.011 347.313C938.224 349.545 936.218 351.599 934 353.429M922.5 360.027L929 372.5L941.5 365.5L934 353.429M890.945 359.5L886.5 375L899 378.5L902.5 362.271M890.945 359.5C894.512 360.876 898.368 361.827 902.5 362.271"
                stroke="white"
              />
            </g>
          </g>
          <g
            id="Truss Structure"
            className="hover-group"
            onClick={() => handleZoneClick("truss-structure")}
            onMouseEnter={(e) => handleMouseEnter(e, "truss-structure")}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <g id="dark_16">
              <path d="M1031 267H969V247L956 240.5V222H963.5V215V196.5L969 190.5L1004 175H1010.5L1030 189.5H1046L1053 178.5V170H1059.5V175H1064L1073.5 196.5V225.889L1066.5 232.5C1068.08 241.742 1066.39 244.803 1057 245L1051 240.5H1043.5L1039.5 250L1026 255.5L1031 267Z" />
              <path
                d="M1057 245L1051 240.5H1043.5L1039.5 250L1026 255.5L1031 267H969V247L956 240.5V222H963.5V215V196.5L969 190.5L1004 175H1010.5L1030 189.5H1046L1053 178.5V170H1059.5V175H1064L1073.5 196.5V225.889L1066.5 232.5M1057 245C1066.39 244.803 1068.08 241.742 1066.5 232.5M1057 245C1051 236 1059.5 230.5 1066.5 232.5"
                stroke="white"
                strokeWidth="1.5"
              />
            </g>
            <g id="light_17">
              <path
                d="M981 252V244L975.5 243.532L963.284 242.492L964 223H975.5H978V217.25L971 215V200C970.667 200 973.332 198.5 986.66 192.5L987.5 185.5L1018.5 187.947L1025.5 188.5L1024.5 195.5L1032 196.333L1047 198L1050.5 189.5L1053.5 191.5V199.5H1057L1060.64 195.5L1067.5 201.5V204V207.5V210.5V215H1070V224.5L1060 231.5V221H1056V229.5H1051H1043.5L1044.6 218.471L1042 218.054L1037 217.25L1033.5 242L1018.5 252H987.5H981Z"
                fill="black"
              />
              <path
                d="M979.5 267.5V254.5M979.5 254.5L970 247.5M979.5 254.5C988.021 256.474 994.5 266 994.5 266M1021.5 266L1016.5 258.5L1020.5 254L1026.5 254.5L1039 244L1040.21 233.5M981 244V252H987.5M981 244L983 223M981 244L975.5 243.532M1018.5 252L1033.5 242M1018.5 252L1020.87 232.5M1018.5 252H987.5M1023 215L1020.87 232.5M1023 215L1024.5 195.5M1023 215L1029 215.964M1051 219.5V221M1051 219.5L1049 219.179M1051 219.5L1055.83 216.5M1051 229.5H1043.5L1044.6 218.471M1051 229.5V221M1051 229.5H1056V221M1044.6 218.471L1042 218.054M1044.6 218.471L1049 219.179M1033.5 242L1037 217.25M1033.5 242L1020.87 232.5M1037 217.25L1042 218.054M1037 217.25L1029 215.964M1042 218.054L1040.21 233.5M1042 218.054C1039.97 205.798 1040.83 201.15 1047 198M1040.21 233.5H1044.6M1057 233.5H1051.5M1044.6 233.5V240.5M1044.6 233.5H1051.5M1051.5 233.5V240.5M1051 221H1056M1056 221H1060M1060 221H1064L1061 217.143M1060 221V231.5L1070 224.5M1053.5 207.5L1047 207V202.5M1053.5 207.5L1055.83 210.5M1053.5 207.5V206.5M1047.5 187.5L1050.5 189.5M1052.5 179H1059.5L1063 189.5M1063 189.5H1059.5V194.5L1060.64 195.5M1063 189.5L1069 196.333H1072.5M1072.5 215H1070M1070 215H1067.5V210.5M1070 215V224.5M1070 228V224.5M1024.5 195.5L1032 196.333M1024.5 195.5L1025.5 188.5L1018.5 187.947M1047 198L1050.5 189.5M1047 198L1032 196.333M1047 198V202.5M1050.5 189.5L1053.5 191.5V199.5M1049 219.179L1049.5 210.5H1055.83M1049 219.179C1043.83 211.752 1042.62 207.939 1047 202.5M1055.83 210.5L1061 217.143M1055.83 210.5V216.5M1055.83 216.5L1061 217.143M1061 217.143L1061.5 210M1053.5 199.5H1057M1053.5 199.5V206.5M1057 199.5L1060.64 195.5M1057 199.5V204M1060.64 195.5L1067.5 201.5V204M1057 206.5H1053.5M1057 206.5V204M1057 206.5L1061.5 210M1057 204H1067.5M1057 204C1060.56 204.681 1061.87 205.646 1061.92 207.5M1067.5 204V210.5M1061.5 210L1067.5 210.5M1061.5 210C1061.78 209.02 1061.94 208.197 1061.92 207.5M1061.92 207.5H1068M1032 196.333L1029 215.964M957.5 242L963.284 242.492M983 223L986.66 192.5M983 223H978M975.5 223H964L963.284 242.492M975.5 223V243.532M975.5 223H978M975.5 243.532L963.284 242.492M986.66 192.5L987.5 185.5L1018.5 187.947M986.66 192.5C973.332 198.5 970.667 200 971 200V215M971 215L964 214M971 215L978 217.25V223M987.5 252C987.544 250.466 987.589 248.966 987.633 247.5M1018.5 192V187.947M1018.5 192L1018.16 197.064M1018.5 192L999.5 191.321M1016.95 215L1015.5 236.5H1010.5L1011.5 218.471L998.5 217.25V213L1016.95 215ZM1016.95 215L1017.19 211.5M1017.19 211.5L1005.5 210.5V198.5H1018.06M1017.19 211.5L1017.72 203.5M1018.06 198.5L1017.72 203.5M1018.06 198.5L1018.16 197.064M1017.72 203.5L1005 203M1018.16 197.064L999.5 194.5V191.321M999.5 191.321L990.5 191C990.282 192.305 989.913 196.148 989.467 203.5M989.467 203.5H994.5L993.5 220L1006.5 224V226.5H988.359M989.467 203.5C989.131 209.037 988.751 216.566 988.359 226.5M988.359 226.5C988.32 227.477 988.281 228.476 988.243 229.5M988.243 229.5L1000 230L999.5 240.5H987.854M988.243 229.5C988.114 232.901 987.984 236.563 987.854 240.5M987.854 240.5C987.817 241.643 987.779 242.81 987.741 244M987.741 244H1006.5V247.5H987.633M987.741 244C987.705 245.145 987.669 246.311 987.633 247.5"
                stroke="white"
              />
            </g>
          </g>
          <g
            id="Radiators"
            className="hover-group"
            onClick={() => handleZoneClick("radiators")}
            onMouseEnter={(e) => handleMouseEnter(e, "radiators")}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <g id="dark_17" role="presentation">
              <path
                d="M1014 252H1005.5L994 303L996.5 348L986.5 390L988.5 434.5L977 476.5L978 522.5L968 565H976.5L986.5 522.5L983.5 477.5L995 434.5L993 390L1003.5 348L999.5 302.5L1014 252Z"
                fill="black"
                role="presentation"
              />
              <path
                d="M979.5 365.5H988L979.5 387L981.5 433L966.5 474L968 520L950 562H941.5L959 520L957.5 474L972.5 433V387L979.5 365.5Z"
                fill="black"
              />
              <path
                d="M454 222V212L513 217.5L574.5 211.5L633.5 217.5L695.5 211.5L754 219.5L808.5 214L885.5 217.5L938 211.5L976.5 217.5V226L938 220.5L885.5 226L808.5 223.5L754 227L695.5 219.5L633.5 225.5L574.5 219.5L513 225.5L454 222Z"
                fill="black"
              />
              <path
                d="M1014 252H1005.5L994 303L996.5 348L986.5 390L988.5 434.5L977 476.5L978 522.5L968 565H976.5L986.5 522.5L983.5 477.5L995 434.5L993 390L1003.5 348L999.5 302.5L1014 252Z"
                stroke="white"
                strokeWidth="1.5"
              />
              <path
                d="M979.5 365.5H988L979.5 387L981.5 433L966.5 474L968 520L950 562H941.5L959 520L957.5 474L972.5 433V387L979.5 365.5Z"
                stroke="white"
                strokeWidth="1.5"
              />
              <path
                d="M454 222V212L513 217.5L574.5 211.5L633.5 217.5L695.5 211.5L754 219.5L808.5 214L885.5 217.5L938 211.5L976.5 217.5V226L938 220.5L885.5 226L808.5 223.5L754 227L695.5 219.5L633.5 225.5L574.5 219.5L513 225.5L454 222Z"
                stroke="white"
                strokeWidth="1.5"
              />
            </g>
            <path
              id="light_18"
              d="M997.5 270.5L1008 302.5L990 344L1000.5 392L982.5 432.5L993 478L974 519.5L984 552.5M993.5 303.5H1000M996.5 348.5H1003.5M986.5 390.5H992.5M988.5 434H995M977 477H982.5M978 522H986.5M960 519.5H966.5M957.5 474.5H966.5M972.5 432.5H981.5M972.5 387H980M985 373L990 378.5M986.5 398L966.5 431L974 477L952.5 515.5L956.5 547M514 218V225M574 212V219.5M634 217.5V226M695 211.5V219.5M754 219.5V227.5M808.5 214.5V224M885 217.5V226.5M937.5 212V221M481.5 223.5L514 212.5L577 227.5L636 212L698 227.5L734 217.5M766.5 219.5L810 230L862 217.5"
              stroke="white"
            />
          </g>
          <g
            id="Solar Panels"
            className="hover-group"
            onClick={() => handleZoneClick("solar-panels")}
            onMouseEnter={(e) => handleMouseEnter(e, "solar-panels")}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <g id="dark_18">
              <path
                d="M157.5 174.5V168L677.5 213.5L751 219L824 215L158.5 156.5L159 148.5H148L146 174.5H157.5Z"
                fill="black"
              />
              <path
                d="M1075 216.5L1091 218M1075 224.5H1091M905.5 223L955 226L953.5 237L813 224H905.5M1089 228.5L1093 215L1190.5 233V245.5L1089 228.5ZM1284 250.5L1404 272L1390.5 282.5L1265.5 258.5L1284 250.5ZM1451 292L1787.5 354L1786 360L1797 362.5L1802 337L1790 334.5L1789 340.5L1451 280V292ZM1070.5 200V213.5L1776 270L1775 276L1786.5 277L1788.5 252.5L1777 251.5L1776 257.5L1070.5 200ZM870 204.5L864 217L485 150V137.5L870 204.5ZM157.5 168V174.5H146L148 148.5H159L158.5 156.5L824 215L751 219L677.5 213.5L157.5 168ZM164.5 93.5L163.5 99.5L152 97.5L157.5 73.5L169 76L167.5 82L424.5 127L421 139L164.5 93.5Z"
                stroke="white"
                strokeWidth="1.5"
              />
            </g>
            <g id="light_19">
              <path
                d="M165 87.5L171 84L175.109 89.2504L175.895 89.3865L181.5 85L186.254 91.1802L186.852 91.2836L193 87.5L196.988 93.0388L197.416 93.1129L203 88.5L207.952 94.9372L209.256 95.1629L215.5 91L219.126 96.4393L224.5 92L229.15 98.6077L230.89 98.9089L236.5 94L240.607 100.269L246 96L250.428 102.292L252.421 102.637L257.5 98L261.398 104.192L261.789 104.259L267.5 99.5L272.106 106.046L273.426 106.274L279.5 102L283.179 107.627L288.5 103L293.024 109.668L294.862 109.986L301 105.5L304.822 111.71L304.934 111.73L310.5 107.5L315.109 113.492L316.434 113.721L323 109.5L326.538 115.249L332 110.5L335.86 117.085L337.705 117.404L343.5 113L347.752 119.142L353.5 114.5L357.485 120.829L359.472 121.173L365.5 117L369.374 122.811L375.5 118.5L379.35 124.615L381.181 124.932L386.5 120.5L390.616 126.566L391.504 126.72L397.5 122.5L400.972 128.359L403.195 128.744L408.5 124.5L412.056 130.278L412.546 130.363L418 126L422 132L416.5 137.5L412.253 130.598L405.5 136L401.842 129.827L396 134.5L390.974 127.093L384 132L380.111 125.824L374.5 130.5L369.432 122.898L369.286 122.873L362 128L358.239 122.027L352.5 126L347.754 119.144L347.751 119.144L340.5 125L336.558 118.276L331 122.5L326.69 115.497L326.326 115.434L320.5 120.5L315.665 114.215L309 118.5L304.866 111.782L298 117L293.778 110.778L288 115L283.427 108.006L282.857 107.907L277 113L272.651 106.82L266 111.5L261.561 104.449L255.5 109.5L251.355 103.61L246 108.5L240.846 100.633L240.273 100.534L234 105.5L229.944 99.7364L224.5 104.5L219.452 96.9285L218.693 96.797L213 101.5L208.508 95.661L202 100L197.181 93.307L191.5 98L186.5 91.5L180 95.5L175.474 89.7163L170 94L165 87.5Z"
                fill="black"
              />
              <path
                d="M169.07 163.242L168.073 163.154L162.5 168L157.75 162.25L163.5 156L168.63 162.669L174 158L178.995 163.744L185 158L190.061 164.266L195 160L201.006 165.745L206.5 160.5L211.511 166.466L217 161.5L222.594 167.893L228.5 162.5L233.145 168.368L238.5 163.5L243.735 169.482L250 164L254.5 170L259.5 165L265.133 171.145L271 166.5L276.14 172.129L281.5 167.5L286.511 173.227L292 168L297.361 174.382L303 169L308.238 175.023L313.5 170L318.623 175.611L324.5 170.5L329.567 176.901L335.5 172L340.049 177.459L346 172.5L351.144 178.869L356.5 174L361.587 180.105L361.87 180.13L367.5 174.5L372.533 180.492L378 175.5L383.604 181.905L389 177L393.779 182.461L399.5 177L404.862 183.383L410 178L415.367 184.389L420.5 179.5L425.756 185.507L430.5 181L436.239 186.261L441.5 181L447.321 187.615L447.554 187.635L453.5 182.5L458.262 187.738L463.5 182.5L468.454 189.018L474 184L478.609 190.064L485.5 184L490.707 190.446L496 186L501.488 192.011L507 187L512.223 192.969L518.5 188L523.284 193.741L528.5 189L533.5 195L539 189.5L544.347 195.916L550 191L554.647 196.344L560.5 191L566.15 197.42L571.5 193L576.599 198.864L582.5 193.5L587.5 199.5L593.5 194.5L598 200.5L603.5 195.5L608.75 201.5L615 196.5L619.645 202.368L625 197.5L630.361 203.372L636.5 198L641.114 204.152L646.5 199.5L651.618 205.106L658 200L662.872 206.496L662.992 206.506L669 202L673.177 206.595L679 201.5L684.294 208.187L690 203L694.526 208.479L700.5 203.5L705.284 209.241L710.5 204.5L716.134 210.671L721 206.5L726.359 211.615L732 207L737.349 212.349L743.5 207L748.206 213.091L753.5 209L758.389 213.4L764.5 209L767.929 213.571L771.5 210L775.894 215.022L777.196 216.51L772.87 216.131L770.5 217L769.636 215.848L765.973 215.527L763.5 218L760.189 215.02L756.578 214.704L752 218L748.936 214.034L747.184 213.881L742.5 217.5L738.084 213.084L736.648 212.958L732 217L726.868 212.101L725.872 212.014L721 216L716.621 211.204L715.615 211.116L710.5 215.5L706.156 210.287L704.312 210.126L699.5 214.5L695.229 209.33L693.668 209.193L688.5 213.5L684.451 208.386L684.109 208.356L679 213L673.971 207.468L672.343 207.325L667 212L662.92 206.56L657 211L652.019 205.545L651.162 205.47L645.5 210L641.465 204.621L640.653 204.549L635.5 209L630.635 203.672L630.074 203.623L624.5 208.5L619.936 202.735L619.303 202.679L614 207.5L608.992 201.776L608.463 201.73L602.5 206.5L598.252 200.835L597.686 200.786L592.5 205.5L587.854 199.925L587.073 199.856L581.5 204.5L576.669 198.945L576.525 198.932L571.5 203.5L566.725 198.074L565.489 197.966L560 202.5L555.279 197.071L553.976 196.957L549 201.5L544.524 196.129L544.14 196.096L538.5 201L533.647 195.176L533.35 195.15L528.5 200L523.758 194.31L522.755 194.222L517.5 199L512.536 193.327L511.847 193.267L506.5 197.5L501.834 192.39L501.138 192.329L496 197L491.549 191.489L489.662 191.324L483.5 196.5L478.846 190.376L478.308 190.329L473 195L468.818 189.498L468.003 189.426L463.5 193.5L459.087 188.645L457.494 188.506L452.5 193.5L447.432 187.741L442.5 192L436.701 186.684L435.887 186.613L431 191.5L425.963 185.744L425.545 185.707L420.5 190.5L415.754 184.85L414.956 184.78L410 189.5L405.326 183.936L404.41 183.856L399.5 189L394.218 182.963L393.334 182.886L388.5 187.5L383.726 182.044L383.476 182.022L378 187L373.052 181.109L371.961 181.014L366.5 186L361.727 180.273L356.5 185.5L351.423 179.215L350.822 179.162L345.5 184L340.732 178.278L339.225 178.146L334 182.5L329.907 177.33L329.13 177.262L324 181.5L319.348 176.405L317.859 176.275L313 180.5L308.622 175.466L307.845 175.397L302.5 180.5L297.449 174.487L297.268 174.471L292 179.5L286.797 173.554L286.221 173.503L281.5 178L276.627 172.663L275.624 172.575L270.5 177L265.642 171.701L264.551 171.605L259 176L255.082 170.776L253.834 170.666L249 175.5L244.018 169.807L243.423 169.754L238 174.5L233.559 168.89L232.657 168.811L227.5 173.5L222.629 167.933L222.557 167.927L217 173L211.959 166.998L211.014 166.916L206.5 171L201.344 166.069L200.723 166.014L195.5 171L190.769 165.142L189.204 165.005L184 169.5L179.34 164.141L178.643 164.08L173.5 169L169.07 163.242Z"
                fill="black"
              />
              <path
                d="M954 232L943.588 231.117L943.447 231.218L937.5 235.5L932.146 230.146L931.841 230.12L927 234.5L921.24 229.22L921.063 229.205L915 233.5L910.031 228.269L908.456 228.136L903 232L899.595 227.865L894 232L890.249 227.095L884 231L881.426 226.424L881.082 225.813L882.454 225.929L887.5 223.5L889.837 226.556L890.958 226.651L896 223.5L899.169 227.348L900.178 227.433L905.5 223.5L909.321 227.522L915 223.5L921.154 229.141L927 225L931.987 229.988L937.5 225L943.33 231.095L943.588 231.117L950 226.5L954 232Z"
                fill="black"
              />
              <path
                d="M1081.35 207.875L1081.59 207.895L1087.5 202.5L1092.19 208.75L1092.48 208.773L1098.5 203L1102.46 209.058L1108 204L1113.25 210.25L1119.5 204.5L1124.1 210.895L1129.5 205.5L1134.46 212.031L1140.5 207L1145.15 212.585L1151.5 207L1155.83 213.885L1156.27 213.92L1163 208L1167.22 213.859L1172.5 209L1177.8 215.627L1184.5 210L1188.65 215.861L1194.5 210.5L1198.81 217.35L1205.5 212L1209.69 217.581L1215.5 212L1220.71 218.779L1227 213.5L1231.54 219.235L1236.5 214.5L1241.95 220.73L1248.5 215L1252.9 221.112L1258.5 216L1263.27 222.207L1269.5 216.5L1274.54 223.222L1280 218L1284.99 224.305L1286.11 224.395L1292 218.5L1296.04 224.554L1301.5 220L1305.84 225.784L1313 220L1317.02 226.026L1322.5 221L1327.63 227.745L1327.75 227.754L1333.5 222L1338.08 227.672L1344 222L1349.57 229.515L1349.95 229.546L1356 224L1360.09 229.677L1365.5 224.5L1370.67 231.217L1370.97 231.242L1377.5 225.5L1381.59 231.409L1387 226L1392.56 232.947L1398.5 227.5L1402.94 233.338L1408.5 228.5L1413.38 234.663L1413.56 234.678L1419.5 229L1424.29 234.993L1430 230L1435 236.244L1441 230.5L1445.75 237L1451.5 231.5L1456.36 237.895L1462 232.5L1466.86 238.645L1472.5 233.5L1477.35 239.626L1483.5 234.5L1488.03 240.223L1494 235L1498.99 241.571L1499.15 241.583L1505.5 236.5L1509.72 241.825L1515 237L1519.96 243.262L1520.9 243.338L1527 238L1530.96 243.351L1536.5 238.5L1541.59 244.868L1548 240L1552.56 245.469L1558 240.5L1563.21 246.752L1563.48 246.773L1569 241.5L1573.91 247.107L1579.5 242L1584.92 248.503L1584.99 248.509L1590.5 243.5L1595.4 248.868L1601 244L1606.18 250.219L1606.25 250.224L1612 245L1616.66 250.829L1622.5 245.5L1627.6 251.947L1628.04 251.982L1633.5 247L1637.91 252.333L1644 247L1649.12 253.4L1655 248.5L1659.52 253.976L1664.5 249L1669.88 255.111L1675.5 250L1680.87 256.133L1686.5 250.5L1691.72 257.026L1697.5 252L1702.16 257.595L1707.5 252.5L1712.54 258.799L1713.4 258.869L1719 254L1723.66 259.356L1729.5 254L1734.21 260.548L1734.65 260.584L1740.5 255.5L1745.07 260.72L1751 255.5L1756.25 262.326L1756.66 262.359L1762 257.5L1766.42 263.146L1766.83 263.179L1772.5 258L1777 264L1771 269L1766.6 263.383L1761 268.5L1756.43 262.562L1751 267.5L1745.73 261.477L1744.34 261.365L1738.5 266.5L1734.4 260.805L1729 265.5L1723.98 259.722L1723.32 259.669L1717.5 265L1712.93 259.282L1707.5 264L1702.49 257.989L1701.81 257.934L1696.5 263L1691.8 257.126L1691.62 257.112L1686 262L1680.97 256.252L1680.76 256.236L1675.5 261.5L1670.11 255.376L1669.63 255.337L1664.5 260L1660.01 254.561L1659.02 254.481L1654 259.5L1649.36 253.702L1648.81 253.658L1643 258.5L1638.3 252.81L1637.44 252.74L1632 257.5L1627.8 252.2L1622 257.5L1616.86 251.08L1616.43 251.045L1611 256L1606.22 250.259L1601 255L1595.88 249.387L1594.9 249.308L1589.5 254L1584.95 248.543L1579.5 253.5L1574.38 247.653L1573.4 247.573L1568 252.5L1563.34 246.905L1558 252L1552.94 245.923L1552.13 245.858L1546.5 251L1541.71 245.017L1541.43 244.994L1535.5 249.5L1531.58 244.2L1530.12 244.082L1524.5 249L1520.38 243.794L1515 248.5L1510.23 242.477L1509.1 242.386L1503.5 247.5L1499.06 241.654L1493 246.5L1488.42 240.718L1487.55 240.647L1482 245.5L1477.52 239.838L1477.13 239.807L1471.5 244.5L1467.15 239.001L1466.53 238.951L1461 244L1456.55 238.146L1456.13 238.113L1450.5 243.5L1445.96 237.292L1445.48 237.254L1440 242.5L1435.13 236.419L1434.84 236.395L1429.5 241.5L1424.77 235.582L1423.72 235.497L1418 240.5L1413.47 234.772L1408 240L1403.33 233.852L1402.43 233.78L1397 238.5L1392.59 232.986L1392.52 232.98L1386.5 238.5L1382.1 232.139L1380.95 232.047L1375.5 237.5L1370.8 231.394L1365 236.5L1360.61 230.406L1359.43 230.31L1354 235.5L1349.74 229.743L1344 235L1338.87 228.652L1337.2 228.517L1332 233.5L1327.68 227.818L1322 233.5L1317.63 226.938L1316.15 226.819L1310.5 232L1306 226L1305.61 225.969L1300 230.5L1296.49 225.233L1295.33 225.139L1289.5 230L1285.52 224.977L1280 230.5L1274.73 223.477L1274.31 223.443L1268.5 229L1263.56 222.576L1262.93 222.525L1257.5 227.5L1253.36 221.753L1252.29 221.667L1247 226.5L1242.05 220.84L1241.84 220.824L1236.5 225.5L1232.18 220.044L1230.81 219.934L1225.5 225L1220.99 219.142L1220.35 219.089L1214.5 224L1210.2 218.271L1209.06 218.179L1203 224L1198.81 217.352L1198.81 217.352L1193 222L1189.16 216.573L1187.98 216.478L1182.5 221.5L1177.83 215.659L1177.77 215.654L1172 220.5L1167.94 214.861L1166.27 214.727L1160 220.5L1156.01 214.155L1150.5 219L1145.55 213.055L1144.7 212.986L1139 218L1134.57 212.169L1134.32 212.149L1128.5 217L1124.43 211.351L1123.71 211.293L1118.5 216.5L1113.43 210.464L1113.05 210.433L1107 216L1102.82 209.608L1101.94 209.536L1096.5 214.5L1092.32 208.924L1086.5 214.5L1081.46 208.017L1076 213L1070.5 207L1076 201L1081.35 207.875Z"
                fill="black"
              />
              <path
                d="M1179.76 237.699L1178.43 237.466L1172.5 241.5L1168.84 235.778L1167.58 235.557L1161.5 240L1157.6 233.801L1157.57 233.797L1151.5 238L1147.08 231.951L1146.06 231.772L1140.5 236L1136.32 230.059L1135.53 229.919L1129.5 234.5L1125.24 228.11L1124.21 227.929L1118.5 232.5L1113.68 226.077L1113.58 226.059L1107.5 230.5L1103.34 224.258L1101.71 223.971L1096.5 228.5L1090.5 222L1098.5 217L1102.62 223.179L1108 218.5L1113.64 226.016L1120.5 221L1124.8 227.457L1131 222.5L1135.98 229.576L1142 225L1146.63 231.339L1153 226.5L1157.59 233.786L1164.5 229L1168.34 235.001L1174.5 230.5L1179.21 236.94L1185 233L1190 239.5L1184 243.5L1179.76 237.699Z"
                fill="black"
              />
              <path
                d="M1274.5 255L1285.62 257.018L1285.75 256.925L1292 252.5L1296.78 259.043L1297.09 259.1L1303.5 255L1308.36 261.145L1308.41 261.152L1315 257L1319.73 262.913L1327 258.5L1331.88 265.171L1338.5 261L1343.42 267.145L1350 263L1354.51 269.518L1355.05 269.617L1362 265.5L1366.05 271.04L1372.5 266.5L1378.06 273.644L1385 268.5L1390.03 275.731L1396.8 271.62C1396.77 271.264 1396.87 271.308 1397 271.5L1396.8 271.62C1396.86 272.192 1397.27 273.801 1398.5 277.5L1390.22 275.997L1389.74 275.91L1383 280L1378.19 273.815L1377.9 273.762L1371.5 278.5L1366.53 271.699L1365.4 271.494L1359 276L1354.72 269.815L1348.5 273.5L1343.75 267.566L1342.97 267.425L1336.5 271.5L1332.08 265.447L1331.58 265.357L1325 269.5L1320.01 263.257L1319.36 263.14L1313 267L1308.38 261.167L1301.5 265.5L1296.91 259.218L1291 263L1285.87 257.064L1285.62 257.018L1280 261L1274.5 255Z"
                fill="black"
              />
              <path
                d="M1461.79 288.934L1460.25 288.658L1456 292.5L1451 287L1456.5 281L1461.09 287.891L1466.5 283L1472 290.077L1478 286L1482.07 291.657L1488 286L1493.13 293.837L1499.5 289L1503.3 295.421L1509.5 290L1514.41 297.638L1521 293L1524.83 298.987L1530.5 294.5L1535.58 301.451L1542 297.5L1545.84 302.927L1551.5 298.5L1555.84 305.653L1563 300.5L1566.9 306.701L1572.5 302L1577.74 309.719L1577.78 309.727L1584 305.5L1588.16 310.822L1594.5 305.5L1599.19 312.792L1605.5 308.5L1609.25 314.75L1615 310L1619.62 316.672L1626 312.5L1630.19 318.546L1636.5 314L1641.33 321.118L1641.42 321.135L1647.5 317L1651.67 322.798L1658 317L1662.62 324.606L1669 319.5L1673.25 325.872L1679 321.5L1684.07 328.444L1690 324L1694.14 330.087L1700 325.5L1704.95 332.28L1711.5 328L1715.34 333.875L1721.5 329L1726.08 336.132L1732.5 331L1736.77 337.777L1742.5 333L1746.6 339.988L1747.13 340.085L1753.5 335.5L1757.32 341.707L1763 336.5L1767.97 343.707L1775 338.5L1778.75 345.5L1784.5 340L1788.46 347.43L1788.5 347.5L1788.44 347.552L1782.5 352.5L1778.9 345.779L1778.53 345.712L1773 351L1768.06 343.836L1767.85 343.798L1761.5 348.5L1757.46 341.936L1757.13 341.877L1751 347.5L1746.8 340.327L1741 344.5L1737.09 338.284L1736.32 338.147L1730.5 343L1726.22 336.335L1725.9 336.279L1720 341L1715.72 334.453L1714.82 334.291L1709.5 338.5L1705.16 332.56L1704.66 332.471L1698.5 336.5L1694.52 330.654L1693.62 330.492L1688.5 334.5L1684.36 328.832L1683.71 328.716L1678 333L1673.98 326.971L1672.22 326.655L1666.5 331L1662.84 324.975L1662.28 324.874L1656.5 329.5L1651.82 322.999L1651.52 322.944L1646 328L1641.37 321.171L1635 325.5L1630.64 319.202L1629.55 319.006L1624 323L1620.06 317.305L1618.95 317.107L1613 321L1609.67 315.442L1608.64 315.258L1603.5 319.5L1599.75 313.665L1598.29 313.403L1593 317L1588.86 311.713L1587.41 311.453L1582 316L1577.76 309.746L1571.5 314L1567.67 307.914L1565.85 307.588L1560 312.5L1555.94 305.811L1555.69 305.766L1550.5 309.5L1546.72 304.158L1544.73 303.801L1540 307.5L1536.18 302.269L1534.69 302.001L1529 305.5L1525.73 300.397L1523.55 300.005L1518.5 304L1514.94 298.462L1513.58 298.219L1507.5 302.5L1503.94 296.49L1502.4 296.214L1497.5 300.5L1493.67 294.648L1492.37 294.417L1487 298.5L1482.83 292.705L1481.27 292.426L1477 296.5L1472.63 290.877L1471.2 290.622L1465.5 294.5L1461.79 288.934Z"
                fill="black"
              />
              <path
                d="M496.086 146.014L495.468 145.907L490 150.5L484.5 144L491.5 139L495.822 145.61L502.5 140L506.344 147.432L512.5 143L517.043 149.217L524 144L528.282 151.226L534.5 146.5L538.5 153L545 148.5L548.895 155.073L555.5 150.5L559.607 156.918L566 152L569.864 158.521L577 153.5L581.056 160.344L587 156L591.579 162.614L598.5 158L602.475 164.079L608.5 159.5L612.978 166.217L619.5 161L623.758 168.186L630.5 163L634.414 169.447L640.5 165L645.22 171.817L651 167L655.387 173.71L655.635 173.753L662.5 169L666.154 175.394L672.5 171L676.787 177.43L677.032 177.473L683.5 172L687.868 179.194L693.5 174.5L697.626 181.053L698.084 181.133L704.5 176L709.029 182.793L715.5 178L719.661 184.761L726.5 179.5L730 186.5L736.5 182L739.906 188.326L746.5 183L751.341 190.133L758 186L761.824 192.215L762.209 192.281L768.5 187.5L772.549 194.079L772.698 194.105L779 189.5L783.059 195.707L789.5 191L793.561 197.449L799.5 192.5L804.034 199.553L804.157 199.574L810.5 194.5L814.532 201.378L815.532 201.552L822 197L825.912 203.357L825.924 203.359L832.5 198L836.627 204.964L842.5 200.5L846.829 206.993L846.974 207.018L853.5 202.5L857.999 208.349L863 204L867 210.5L858.52 209.026L857.437 208.837L851.5 214L846.886 207.079L840.5 211.5L836.796 205.249L836.353 205.172L830 210L825.917 203.364L819 209L814.896 201.999L808.5 206.5L804.085 199.632L798 204.5L793.761 197.767L793.28 197.683L787.5 202.5L783.205 195.932L782.839 195.868L776.5 200.5L772.606 194.172L766 199L761.975 192.459L756 197L751.539 190.426L751.015 190.335L743.5 195L739.953 188.412L739.827 188.39L733.5 193.5L730.099 186.699L729.79 186.645L723.5 191L719.745 184.899L719.53 184.861L713.5 189.5L709.212 183.068L708.764 182.99L702 188L697.813 181.35L692 186L687.978 179.376L687.706 179.329L681.5 184.5L676.893 177.59L670.5 183L666.273 175.602L665.937 175.544L659.5 180L655.484 173.857L649.5 178L645.318 171.959L645.095 171.921L639 177L634.833 170.136L633.733 169.945L627.5 174.5L623.775 168.214L623.732 168.206L617.5 173L613.068 166.352L612.856 166.315L607 171L602.793 164.566L602.013 164.43L596 169L591.581 162.617L591.576 162.616L585 167L581.348 160.838L580.566 160.702L574 165.5L570.076 158.878L569.5 158.778L563.5 163L559.708 157.075L559.458 157.032L553 162L548.976 155.21L548.753 155.171L542.5 159.5L538.768 153.435L538.052 153.31L532 157.5L528.537 151.656L527.869 151.54L522 156L517.412 149.722L516.567 149.575L510 154.5L506.552 147.834L505.935 147.727L500 152L496.086 146.014Z"
                fill="black"
              />
              <path
                d="M166 82.5L165 87.5M164 92.5L165 87.5M165 87.5L171 84L180 95.5L193 87.5L202 100L215.5 91L224.5 104.5L236.5 94L246 108.5L257.5 98L266 111.5L279.5 102L288 115L301 105.5L309 118.5L323 109.5L331 122.5L343.5 113L352.5 126L365.5 117L374.5 130.5L386.5 120.5L396 134.5L408.5 124.5L416.5 137.5L422 132M165 87.5L170 94L181.5 85L191.5 98L203 88.5L213 101.5L224.5 92L234 105.5L246 96L255.5 109.5L267.5 99.5L277 113L288.5 103L298 117L310.5 107.5L320.5 120.5L332 110.5L340.5 125L353.5 114.5L362 128L375.5 118.5L384 132L397.5 122.5L405.5 136L418 126L422 132M165 87.5L422 132M157 168.5L157.75 162.25M158.5 156L157.75 162.25M157.75 162.25L788.5 217.5M157.75 162.25L163.5 156L173.5 169L185 158L195.5 171L206.5 160.5L217 173L228.5 162.5L238.5 174.5L250 164L259 176L271 166.5L281.5 178L292 168L302.5 180.5L313.5 170L324 181.5L335.5 172L345.5 184L356.5 174L366.5 186L378 175.5L388.5 187.5L399.5 177L410 189.5L420.5 179.5L431 191.5L441.5 181L452.5 193.5L463.5 182.5L473 195L485.5 184L496 197L507 187L517.5 199L528.5 189L538.5 201L550 191L560 202.5L571.5 193L581.5 204.5L593.5 194.5L602.5 206.5L615 196.5L624.5 208.5L636.5 198L645.5 210L658 200L667 212L679 201.5L688.5 213.5L700.5 203.5L710.5 215.5L721 206.5L732 217L743.5 207L752 218L764.5 209L770.5 217L785.5 211.5L788 217L796.5 213M157.75 162.25L162.5 168L174 158L184 169.5L195 160L206.5 171L217 161.5L227.5 173.5L238.5 163.5L249 175.5L259.5 165L270.5 177L281.5 167.5L292 179.5L303 169L313 180.5L324.5 170.5L334 182.5L346 172.5L356.5 185.5L367.5 174.5L378 187L389 177L399.5 189L410 178L420.5 190.5L430.5 181L442.5 192L453.5 182.5L463.5 193.5L474 184L483.5 196.5L496 186L506.5 197.5L518.5 188L528.5 200L539 189.5L549 201.5L560.5 191L571.5 203.5L582.5 193.5L592.5 205.5L603.5 195.5L614 207.5L625 197.5L635.5 209L646.5 199.5L657 211L669 202L679 213L690 203L699.5 214.5L710.5 204.5L721 216L732 207L742.5 217.5L753.5 209L763.5 218L771.5 210L778.5 218M871.5 225L954 232L950 226.5L937.5 235.5L927 225L915 233.5L905.5 223.5L894 232L887.5 223.5L874 230L867 223M1070.5 207L1777 264M1070.5 207L1076 201L1086.5 214.5L1098.5 203L1107 216L1119.5 204.5L1128.5 217L1140.5 207L1150.5 219L1163 208L1172 220.5L1184.5 210L1193 222L1205.5 212L1214.5 224L1227 213.5L1236.5 225.5L1248.5 215L1257.5 227.5L1269.5 216.5L1280 230.5L1292 218.5L1300 230.5L1313 220L1322 233.5L1333.5 222L1344 235L1356 224L1365 236.5L1377.5 225.5L1386.5 238.5L1398.5 227.5L1408 240L1419.5 229L1429.5 241.5L1441 230.5L1450.5 243.5L1462 232.5L1471.5 244.5L1483.5 234.5L1493 246.5L1505.5 236.5L1515 248.5L1527 238L1535.5 249.5L1548 240L1558 252L1569 241.5L1579.5 253.5L1590.5 243.5L1601 255L1612 245L1622 257.5L1633.5 247L1644 258.5L1655 248.5L1664.5 260L1675.5 250L1686 262L1697.5 252L1707.5 264L1719 254L1729 265.5L1740.5 255.5L1751 267.5L1762 257.5L1771 269L1777 264M1070.5 207L1076 213L1087.5 202.5L1096.5 214.5L1108 204L1118.5 216.5L1129.5 205.5L1139 218L1151.5 207L1160 220.5L1172.5 209L1182.5 221.5L1194.5 210.5L1203 224L1215.5 212L1225.5 225L1236.5 214.5L1247 226.5L1258.5 216L1268.5 229L1280 218L1289.5 230L1301.5 220L1310.5 232L1322.5 221L1332 233.5L1344 222L1354 235.5L1365.5 224.5L1375.5 237.5L1387 226L1397 238.5L1408.5 228.5L1418 240.5L1430 230L1440 242.5L1451.5 231.5L1461 244L1472.5 233.5L1482 245.5L1494 235L1503.5 247.5L1515 237L1524.5 249L1536.5 238.5L1546.5 251L1558 240.5L1568 252.5L1579.5 242L1589.5 254L1601 244L1611 256L1622.5 245.5L1632 257.5L1644 247L1654 259.5L1664.5 249L1675.5 261.5L1686.5 250.5L1696.5 263L1707.5 252.5L1717.5 265L1729.5 254L1738.5 266.5L1751 255.5L1761 268.5L1772.5 258L1777 264M1777 270V257M1190 239.5L1090.5 222M1190 239.5L1185 233L1172.5 241.5L1164.5 229L1151.5 238L1142 225L1129.5 234.5L1120.5 221L1107.5 230.5L1098.5 217L1090.5 222M1190 239.5L1184 243.5L1174.5 230.5L1161.5 240L1153 226.5L1140.5 236L1131 222.5L1118.5 232.5L1108 218.5L1096.5 228.5L1090.5 222M1451 287L1788.5 347.5M1451 287L1456.5 281L1465.5 294.5L1478 286L1487 298.5L1499.5 289L1507.5 302.5L1521 293L1529 305.5L1542 297.5L1550.5 309.5L1563 300.5L1571.5 314L1584 305.5L1593 317L1605.5 308.5L1613 321L1626 312.5L1635 325.5L1647.5 317L1656.5 329.5L1669 319.5L1678 333L1690 324L1698.5 336.5L1711.5 328L1720 341L1732.5 331L1741 344.5L1753.5 335.5L1761.5 348.5L1775 338.5L1782.5 352.5L1788.5 347.5M1451 287L1456 292.5L1466.5 283L1477 296.5L1488 286L1497.5 300.5L1509.5 290L1518.5 304L1530.5 294.5L1540 307.5L1551.5 298.5L1560 312.5L1572.5 302L1582 316L1594.5 305.5L1603.5 319.5L1615 310L1624 323L1636.5 314L1646 328L1658 317L1666.5 331L1679 321.5L1688.5 334.5L1700 325.5L1709.5 338.5L1721.5 329L1730.5 343L1742.5 333L1751 347.5L1763 336.5L1773 351L1784.5 340L1788.5 347.5M1787 354.5L1790 340M484.5 144L867 210.5L863 204L851.5 214L842.5 200.5L830 210L822 197L808.5 206.5L799.5 192.5L787.5 202.5L779 189.5L766 199L758 186L743.5 195L736.5 182L723.5 191L715.5 178L702 188L693.5 174.5L681.5 184.5L672.5 171L659.5 180L651 167L639 177L630.5 163L617.5 173L608.5 159.5L596 169L587 156L574 165.5L566 152L553 162L545 148.5L532 157.5L524 144L510 154.5L502.5 140L490 150.5L484.5 144ZM484.5 144L491.5 139L500 152L512.5 143L522 156L534.5 146.5L542.5 159.5L555.5 150.5L563.5 163L577 153.5L585 167L598.5 158L607 171L619.5 161L627.5 174.5L640.5 165L649.5 178L662.5 169L670.5 183L683.5 172L692 186L704.5 176L713.5 189.5L726.5 179.5L733.5 193.5L746.5 183L756 197L768.5 187.5L776.5 200.5L789.5 191L798 204.5L810.5 194.5L819 209L832.5 198L840.5 211.5L853.5 202.5L863.5 215.5M948.5 236.5L937.5 225L927 234.5L915 223.5L903 232L896 223.5L884 231L879.5 223M1075.5 216.5V224M1078.5 217C1078.5 223.8 1078.5 224.5 1078.5 224M1081.5 217.5V224H1084.5V218L1087.5 218.5V224M1393 280L1385 268.5L1371.5 278.5L1362 265.5L1348.5 273.5L1338.5 261L1325 269.5L1315 257L1301.5 265.5L1292 252.5L1280 261L1274.5 255L1398.5 277.5C1396.5 271.5 1396.67 271 1397 271.5L1383 280L1372.5 266.5L1359 276L1350 263L1336.5 271.5L1327 258.5L1313 267L1303.5 255L1291 263L1281.5 252"
                stroke="white"
              />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
};

export default ISS;
