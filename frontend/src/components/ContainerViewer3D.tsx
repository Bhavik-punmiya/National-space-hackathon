import React, { useRef, useState } from 'react';
import { Canvas, useFrame, ThreeElements } from '@react-three/fiber';
import { OrbitControls, Html, PerspectiveCamera } from '@react-three/drei';
import { Vector3 } from 'three';
import { useRouter } from 'next/navigation';

interface Container {
    id: string;
    name: string;
    type: string;
    zoneId: string;
    module_id: string;
    width_cm: number;
    depth_cm: number;
    height_cm: number;
    capacity: number;
    start_width: number;
    start_depth: number;
    start_height: number;
    end_width: number;
    end_depth: number;
    end_height: number;
    currentWeight: number;
    maxWeight: number;
}

interface ContainerMeshProps {
  container: Container;
  onHover: (show: boolean, container: Container) => void;
  isHovered: boolean;
}

// Add color mapping for container types
const containerTypeColors = {
  'Storage Rack': '#FF4D4D',      // Brighter Red
  'Equipment Rack': '#00E5FF',    // Bright Cyan
  'Science Rack': '#40C4FF',      // Bright Blue
  'Cargo Bag': '#69F0AE',         // Bright Green
  'Stowage Box': '#FFD740',       // Bright Yellow
  'Supply Container': '#B388FF',   // Bright Purple
  'Experiment Container': '#1DE9B6' // Bright Teal
};

function ContainerMesh({ container, onHover, isHovered }: ContainerMeshProps) {
  const router = useRouter();
  const meshRef = useRef<ThreeElements['mesh']>(null);
  const [hovered, setHovered] = useState(false);

  const position = new Vector3(
    container.start_width,
    container.start_height,
    container.start_depth
  );

  const baseColor = containerTypeColors[container.type as keyof typeof containerTypeColors] || '#2196f3';

  return (
    <group>
      <mesh
        ref={meshRef}
        position={position}
        onPointerOver={() => {
          setHovered(true);
          onHover(true, container);
        }}
        onPointerOut={() => {
          setHovered(false);
          onHover(false, container);
        }}
        onClick={() => router.push(`/container/${container.id}`)}
      >
        <boxGeometry 
          args={[container.width_cm, container.height_cm, container.depth_cm]} 
        />
        <meshPhysicalMaterial 
          color={baseColor}
          transparent={false}
          metalness={0.7}
          roughness={0.2}
          clearcoat={1.0}
          clearcoatRoughness={0.1}
          emissive={isHovered ? baseColor : '#000000'}
          emissiveIntensity={isHovered ? 0.8 : 0}
        />
      </mesh>
      {isHovered && (
        <mesh position={position}>
          <boxGeometry args={[
            container.width_cm + 0.4,
            container.height_cm + 0.4,
            container.depth_cm + 0.4
          ]} />
          <meshStandardMaterial
            color={baseColor}
            transparent
            opacity={0.3}
            emissive={baseColor}
            emissiveIntensity={2}
          />
        </mesh>
      )}
    </group>
  );
}

export default function ContainerViewer3D({ containers }: { containers: Container[] }) {
  const [hoveredContainer, setHoveredContainer] = useState<Container | null>(null);
  const [cameraPosition, setCameraPosition] = useState<'top' | 'front' | 'side'>('front');

  const cameraPositions = {
    top: [0, 100, 0],
    front: [0, 0, 100],
    side: [100, 0, 0],
  };

  return (
    <div className="relative w-full h-[600px] rounded-xl overflow-hidden">
      {/* Camera Controls */}
      <div className="absolute top-4 right-4 z-10 space-x-2">
        {Object.keys(cameraPositions).map((pos) => (
          <button
            key={pos}
            className={`px-4 py-2 rounded-lg backdrop-blur-md ${
              cameraPosition === pos 
                ? 'bg-white/30 text-white' 
                : 'bg-white/10 text-white/70'
            }`}
            onClick={() => setCameraPosition(pos as keyof typeof cameraPositions)}
          >
            {pos.charAt(0).toUpperCase() + pos.slice(1)} View
          </button>
        ))}
      </div>

      {/* Container Info Tooltip */}
      {hoveredContainer && (
        <div className="absolute top-4 left-4 z-10 p-4 rounded-lg backdrop-blur-md bg-white/10 text-white max-w-xs">
          <h3 className="font-bold text-lg">{hoveredContainer.name}</h3>
          <p className="text-sm opacity-80">{hoveredContainer.type}</p>
          <div className="mt-2 text-sm space-y-1">
            <p>Module: {hoveredContainer.module_id}</p>
            <p>Zone: {hoveredContainer.zoneId.replace('_', ' ')}</p>
            <p>Dimensions: {hoveredContainer.width_cm}w × {hoveredContainer.height_cm}h × {hoveredContainer.depth_cm}d cm</p>
            <p>Weight: {hoveredContainer.currentWeight.toFixed(1)}/{hoveredContainer.maxWeight.toFixed(1)} kg</p>
            <p>Position: ({hoveredContainer.start_width.toFixed(1)}, {hoveredContainer.start_height.toFixed(1)}, {hoveredContainer.start_depth.toFixed(1)})</p>
          </div>
          <p className="mt-2 text-xs opacity-70">Click to view contents</p>
        </div>
      )}

      <Canvas shadows>
        <color attach="background" args={['#000920']} />
        <fog attach="fog" args={['#000920', 10, 200]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <pointLight position={[0, 0, 0]} intensity={0.5} color="#ffffff" />
        
        <PerspectiveCamera
          makeDefault
          position={cameraPositions[cameraPosition] as [number, number, number]}
        />
        <OrbitControls enableZoom={true} enablePan={true} />
        
        <hemisphereLight
          color="#ffffff"
          groundColor="#000000"
          intensity={0.3}
        />

        {/* Grid and Axes */}
        <gridHelper args={[1000, 100]} />
        <axesHelper args={[500]} />

        {/* Containers */}
        {containers.map((container) => (
          <ContainerMesh
            key={container.id}
            container={container}
            onHover={(show, cont) => setHoveredContainer(show ? cont : null)}
            isHovered={hoveredContainer?.id === container.id}
          />
        ))}
      </Canvas>
    </div>
  );
}
