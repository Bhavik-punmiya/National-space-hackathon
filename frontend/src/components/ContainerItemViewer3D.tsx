'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Text, useHelper } from '@react-three/drei'
import * as THREE from 'three'
import { useRouter } from 'next/navigation'

interface Item {
  id: string
  name: string
  position_start_width: number
  position_start_depth: number
  position_start_height: number
  position_end_width: number
  position_end_depth: number
  position_end_height: number
  category: string
  mass_kg: number
  quantity: number
  priority: number
}

interface Container {
  id: string
  name: string
  width_cm: number
  depth_cm: number
  height_cm: number
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
  
  // Adjust brightness based on priority (higher priority = brighter)
  const threeColor = new THREE.Color(color);
  const hsl = { h: 0, s: 0, l: 0 };
  threeColor.getHSL(hsl as THREE.HSL);
  
  // Adjust lightness based on priority (higher priority/lower number = brighter)
  const lightness = Math.max(0.3, Math.min(0.7, 0.7 - (priority / 200)));
  threeColor.setHSL(hsl.h, hsl.s, lightness);
  
  return '#' + threeColor.getHexString();
}

// Single item mesh component
const ItemMesh: React.FC<ItemMeshProps> = ({ item, setHoveredItem, maxDimension, colorScale }) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  
  // Calculate item dimensions
  const width = Math.abs(item.position_end_width - item.position_start_width)
  const height = Math.abs(item.position_end_height - item.position_start_height)
  const depth = Math.abs(item.position_end_depth - item.position_start_depth)
  
  // Calculate position (center of the item)
  const positionX = (item.position_start_width + item.position_end_width) / 2 / maxDimension - 0.5
  const positionY = (item.position_start_height + item.position_end_height) / 2 / maxDimension - 0.5
  const positionZ = (item.position_start_depth + item.position_end_depth) / 2 / maxDimension - 0.5
  
  // Calculate scale (normalized to container size)
  const scaleX = width / maxDimension
  const scaleY = height / maxDimension
  const scaleZ = depth / maxDimension
  
  // Color based on priority, category and ID for more variation
  const color = colorScale(item.priority, item.category, item.id)
  
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
        opacity={hovered ? 0.9 : 0.7}
        emissive={hovered ? color : '#000000'}
        emissiveIntensity={hovered ? 0.5 : 0}
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
      <p className="text-sm mb-1">Quantity: {item.quantity}</p>
      <p className="text-sm mb-1">Mass: {item.mass_kg} kg</p>
      <p className="text-sm mb-1">Priority: {item.priority}</p>
      <div className="text-xs mt-2 text-gray-300">
        <p>Dimensions: {(item.position_end_width - item.position_start_width).toFixed(1)} × 
                       {(item.position_end_depth - item.position_start_depth).toFixed(1)} × 
                       {(item.position_end_height - item.position_start_height).toFixed(1)}</p>
        <p>Position: ({item.position_start_width.toFixed(1)}, {item.position_start_height.toFixed(1)}, {item.position_start_depth.toFixed(1)}) to</p>
        <p>({item.position_end_width.toFixed(1)}, {item.position_end_height.toFixed(1)}, {item.position_end_depth.toFixed(1)})</p>
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
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <directionalLight position={[-10, -10, -5]} intensity={0.5} />
      <hemisphereLight args={['#ffffff', '#303030', 0.5]} />
      
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
    </div>
  )
}

export default ContainerItemViewer3D 