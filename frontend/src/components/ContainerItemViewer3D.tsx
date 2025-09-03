'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Text, useHelper } from '@react-three/drei'
import * as THREE from 'three'
import { useRouter } from 'next/navigation'

interface Item {
  id: string
  name: string
  category: string
  subcategory: string
  containerId: string
  mass_kg: number
  width_cm: number
  depth_cm: number
  height_cm: number
  priority: number
  expiry_date: string
  preferred_zone: string
  temp_requirement: string
  hazardous_class: string
  maximum_uses: number
  current_uses: number
  usage_frequency: number
  lot_number: string
  orientation_allowed: boolean
  tags_id: string[]
  x?: number
  y?: number
  z?: number
}

interface Container {
  id: string
  name: string
  type: string
  zoneId: string
  module_id: string
  width_cm: number
  depth_cm: number
  height_cm: number
  currentWeight: number
  maxWeight: number
}

interface ItemMeshProps {
  item: Item
  setHoveredItem: (item: Item | null) => void
  maxDimension: number
  colorScale: (priority: number, category: string, itemId: string) => string
}

// More distinctive color palette
const colorPalette = [
  '#FF3D00', // Red
  '#2979FF', // Blue
  '#00C853', // Green
  '#FFD600', // Yellow
  '#AA00FF', // Purple
  '#00BFA5', // Teal
  '#F50057', // Pink
  '#FF6D00', // Orange
  '#3D5AFE', // Indigo
  '#1DE9B6', // Mint
  '#C6FF00', // Lime
  '#D500F9', // Magenta
  '#00B8D4', // Cyan
  '#FFAB00', // Amber
  '#304FFE', // Royal Blue
  '#64DD17', // Light Green
  '#FF9100', // Dark Orange
  '#7C4DFF', // Deep Purple
  '#FFFF00', // Electric Yellow
  '#536DFE'  // Blue Accent
];

// Category color mapping to ensure same categories have similar base colors
const categoryColorMap: Record<string, number> = {};

// Get a color based on priority, category and item ID
const getItemColor = (priority: number, category: string, itemId: string): string => {
  // Ensure same category items have similar base colors
  if (!categoryColorMap[category]) {
    categoryColorMap[category] = Object.keys(categoryColorMap).length % colorPalette.length;
  }
  
  const baseColorIndex = categoryColorMap[category];
  // Use a hash of the ID to add slight color variations within same category
  const idHash = itemId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const variation = (idHash % 3) - 1; // -1, 0, or 1
  
  // Calculate final color index with priority influence
  const priorityInfluence = Math.floor(priority / 25); // 0-3 for priorities 0-100
  const finalIndex = (baseColorIndex + variation + priorityInfluence) % colorPalette.length;
  
  // Get the base color
  let color = colorPalette[finalIndex];
  
  // Create a THREE.Color object for manipulation
  const threeColor = new THREE.Color(color);
  const hsl = { h: 0, s: 0, l: 0 };
  threeColor.getHSL(hsl);
  
  // Higher priority items get brighter colors
  const priorityBrightness = Math.min(0.9, 0.2 + (priority / 100) * 0.7);
  hsl.l = Math.max(0.1, Math.min(0.9, priorityBrightness));
  
  // Increase saturation for better visibility
  hsl.s = Math.min(1.0, hsl.s * 1.2);
  
  threeColor.setHSL(hsl.h, hsl.s, hsl.l);
  const finalColor = threeColor.getHexString();
  
  // Ensure we always return a valid hex color
  if (!finalColor || finalColor === '000000') {
    // Fallback to a bright color if something goes wrong
    const fallbackColor = colorPalette[Math.abs(itemId.charCodeAt(0)) % colorPalette.length];
    console.warn(`Color generation failed for item ${itemId}, using fallback: ${fallbackColor}`);
    return fallbackColor;
  }
  
  // Debug logging
  console.log(`Item ${itemId} (${category}): Priority ${priority}, Base: ${color}, Final: #${finalColor}`);
  
  return finalColor;
};

// Single item mesh component
const ItemMesh: React.FC<ItemMeshProps> = ({ item, setHoveredItem, maxDimension, colorScale }) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  
  // Calculate item dimensions
  const width = Math.abs(item.width_cm)
  const height = Math.abs(item.height_cm)
  const depth = Math.abs(item.depth_cm)
  
  // Calculate position (center of the item)
  const positionX = (item.x || 0) / maxDimension - 0.5
  const positionY = (item.y || 0) / maxDimension - 0.5
  const positionZ = (item.z || 0) / maxDimension - 0.5
  
  // Calculate scale (normalized to container size)
  const scaleX = width / maxDimension
  const scaleY = height / maxDimension
  const scaleZ = depth / maxDimension
  
  // Color based on priority, category and ID for more variation
  let color = colorScale(item.priority, item.category, item.id)
  
  // Fallback color if the main color function fails
  if (!color || color === '#000000') {
    const fallbackIndex = (item.id.charCodeAt(0) + item.priority) % colorPalette.length
    color = colorPalette[fallbackIndex]
    console.log(`Using fallback color for item ${item.id}: ${color}`)
  }
  
  // Handle hover events
  const handlePointerOver = (e: any) => {
    e.stopPropagation()
    setHovered(true)
    setHoveredItem(item)
  }
  
  const handlePointerOut = () => {
    setHovered(false)
    setHoveredItem(null)
  }
  
  // Add subtle animation on hover
  useFrame(() => {
    if (meshRef.current) {
      if (hovered) {
        meshRef.current.scale.x = THREE.MathUtils.lerp(meshRef.current.scale.x, scaleX * 1.05, 0.1)
        meshRef.current.scale.y = THREE.MathUtils.lerp(meshRef.current.scale.y, scaleY * 1.05, 0.1)
        meshRef.current.scale.z = THREE.MathUtils.lerp(meshRef.current.scale.z, scaleZ * 1.05, 0.1)
      } else {
        meshRef.current.scale.x = THREE.MathUtils.lerp(meshRef.current.scale.x, scaleX, 0.1)
        meshRef.current.scale.y = THREE.MathUtils.lerp(meshRef.current.scale.y, scaleY, 0.1)
        meshRef.current.scale.z = THREE.MathUtils.lerp(meshRef.current.scale.z, scaleZ, 0.1)
      }
    }
  })
  
  return (
    <mesh
      ref={meshRef}
      position={[positionX, positionY, positionZ]}
      scale={[scaleX, scaleY, scaleZ]}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial 
        color={color} 
        transparent 
        opacity={hovered ? 0.95 : 0.85}
        emissive={hovered ? color : '#000000'}
        emissiveIntensity={hovered ? 0.3 : 0}
        metalness={0.1}
        roughness={0.3}
      />
    </mesh>
  )
}

// Container mesh
const ContainerMesh: React.FC<{ container: Container, maxDimension: number }> = ({ container, maxDimension }) => {
  const containerRef = useRef<THREE.LineSegments>(null)
  
  // Normalize dimensions to fit in scene
  const width = container.width_cm / maxDimension
  const height = container.height_cm / maxDimension
  const depth = container.depth_cm / maxDimension
  
  return (
    <lineSegments ref={containerRef}>
      <edgesGeometry args={[new THREE.BoxGeometry(width, height, depth)]} />
      <lineBasicMaterial color="#ffffff" transparent opacity={0.5} />
    </lineSegments>
  )
}

// Container dimensions display component
const ContainerDimensions: React.FC<{ container: Container }> = ({ container }) => {
  return (
    <div className="absolute top-4 right-4 bg-gray-900 bg-opacity-80 p-4 rounded-lg text-white">
      <h3 className="text-md font-bold mb-2">Container Dimensions</h3>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div className="text-center">
          <p className="text-gray-300">Width</p>
          <p className="font-medium">{container.width_cm.toFixed(1)}</p>
        </div>
        <div className="text-center">
          <p className="text-gray-300">Depth</p>
          <p className="font-medium">{container.depth_cm.toFixed(1)}</p>
        </div>
        <div className="text-center">
          <p className="text-gray-300">Height</p>
          <p className="font-medium">{container.height_cm.toFixed(1)}</p>
        </div>
      </div>
    </div>
  )
}

// Category color legend
const CategoryColorLegend: React.FC = () => {
  const categories = Object.keys(categoryColorMap);
  
  if (categories.length === 0) return null;
  
  return (
    <div className="absolute right-4 top-40 bg-gray-900 bg-opacity-80 p-3 rounded-lg text-white text-xs max-h-40 overflow-y-auto">
      <h4 className="font-bold mb-2">Categories</h4>
      {categories.map(category => {
        const colorIndex = categoryColorMap[category];
        const color = colorPalette[colorIndex];
        return (
          <div key={category} className="flex items-center mb-1">
            <div 
              className="w-3 h-3 rounded-sm mr-2" 
              style={{ backgroundColor: color }}
            />
            <span>{category}</span>
          </div>
        );
      })}
    </div>
  )
}

// Information panel that follows the camera
const ItemInfoPanel: React.FC<{ item: Item | null }> = ({ item }) => {
  if (!item) return null;
  
  return (
    <div className="absolute top-4 left-4 bg-gray-900 bg-opacity-80 p-4 rounded-lg text-white max-w-xs">
      <h3 className="text-lg font-bold mb-2">{item.name}</h3>
      <p className="text-sm mb-1">Category: {item.category}</p>
      <p className="text-sm mb-1">Quantity: {item.current_uses}/{item.maximum_uses}</p>
      <p className="text-sm mb-1">Mass: {item.mass_kg} kg</p>
      <p className="text-sm mb-1">Priority: {item.priority}</p>
      <div className="text-xs mt-2 text-gray-300">
        <p>Dimensions: {item.width_cm.toFixed(1)} × {item.depth_cm.toFixed(1)} × {item.height_cm.toFixed(1)}</p>
        <p>Position: ({item.x?.toFixed(1) || 'N/A'}, {item.y?.toFixed(1) || 'N/A'}, {item.z?.toFixed(1) || 'N/A'})</p>
      </div>
    </div>
  )
}

// Debug panel to show color assignments
const ColorDebugPanel: React.FC<{ items: Item[] }> = ({ items }) => {
  const [showDebug, setShowDebug] = useState(false)
  
  if (!showDebug) {
    return (
      <button
        onClick={() => setShowDebug(true)}
        className="absolute bottom-4 left-4 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm"
      >
        Show Color Debug
      </button>
    )
  }
  
  return (
    <div className="absolute bottom-4 left-4 bg-gray-900 bg-opacity-90 p-4 rounded-lg text-white max-w-xs max-h-60 overflow-y-auto">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-bold">Color Debug</h4>
        <button
          onClick={() => setShowDebug(false)}
          className="text-gray-400 hover:text-white"
        >
          ×
        </button>
      </div>
      <div className="text-xs space-y-1">
        {items.slice(0, 10).map((item) => {
          const color = getItemColor(item.priority, item.category, item.id)
          return (
            <div key={item.id} className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-sm" 
                style={{ backgroundColor: `#${color}` }}
              />
              <span>{item.name}</span>
              <span className="text-gray-400">({item.category})</span>
            </div>
          )
        })}
        {items.length > 10 && (
          <p className="text-gray-400">... and {items.length - 10} more items</p>
        )}
      </div>
    </div>
  )
}

// Scene setup with lighting and camera
const Scene: React.FC<{ 
  items: Item[], 
  container: Container,
  hoveredItem: Item | null,
  setHoveredItem: (item: Item | null) => void 
}> = ({ items, container, hoveredItem, setHoveredItem }) => {
  const { camera } = useThree()
  
  // Find maximum dimension to normalize
  const maxDimension = Math.max(container.width_cm, container.depth_cm, container.height_cm)
  
  // Set initial camera position
  useEffect(() => {
    camera.position.set(1, 1, 1)
    camera.lookAt(0, 0, 0)
  }, [camera])
  
  return (
    <>
      {/* Lights */}
      <ambientLight intensity={0.8} />
      <directionalLight position={[10, 10, 5]} intensity={1.2} />
      <directionalLight position={[-10, -10, -5]} intensity={0.6} />
      <hemisphereLight args={['#ffffff', '#404040', 0.6]} />
      <pointLight position={[0, 5, 0]} intensity={0.5} />
      
      {/* Container wireframe */}
      <ContainerMesh container={container} maxDimension={maxDimension} />
      
      {/* Items */}
      {items.map((item) => (
        <ItemMesh 
          key={item.id} 
          item={item} 
          setHoveredItem={setHoveredItem} 
          maxDimension={maxDimension}
          colorScale={getItemColor}
        />
      ))}
      
      {/* Axes helper */}
      <axesHelper args={[0.5]} />
      
      {/* Controls */}
      <OrbitControls 
        enableDamping 
        dampingFactor={0.05} 
        rotateSpeed={0.5}
        zoomSpeed={0.5}
      />
    </>
  )
}

interface ContainerItemViewer3DProps {
  items: Item[]
  container: Container
}

const ContainerItemViewer3D: React.FC<ContainerItemViewer3DProps> = ({ items, container }) => {
  const [hoveredItem, setHoveredItem] = useState<Item | null>(null)
  
  // Debug logging for colors
  useEffect(() => {
    console.log('ContainerItemViewer3D mounted with:', {
      itemCount: items.length,
      container: container.name,
      categories: [...new Set(items.map(item => item.category))],
      sampleColors: items.slice(0, 5).map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        priority: item.priority,
        color: getItemColor(item.priority, item.category, item.id)
      }))
    })
  }, [items, container])
  
  return (
    <div className="relative w-full h-[600px]">
      <Canvas dpr={[1, 2]} shadows>
        <Scene 
          items={items} 
          container={container} 
          hoveredItem={hoveredItem} 
          setHoveredItem={setHoveredItem} 
        />
      </Canvas>
      
      {/* Hover information panel */}
      {hoveredItem && <ItemInfoPanel item={hoveredItem} />}
      
      {/* Container dimensions display */}
      <ContainerDimensions container={container} />
      
      {/* Category color legend */}
      <CategoryColorLegend />
      
      {/* Controls legend */}
      <div className="absolute bottom-4 right-4 bg-gray-900 bg-opacity-70 p-3 rounded-lg text-white text-xs">
        <p className="mb-1">🖱️ Left-click + drag: Rotate</p>
        <p className="mb-1">🖱️ Right-click + drag: Pan</p>
        <p>🖱️ Scroll: Zoom</p>
      </div>

      {/* Debug panel */}
      <ColorDebugPanel items={items} />
    </div>
  )
}

export default ContainerItemViewer3D 