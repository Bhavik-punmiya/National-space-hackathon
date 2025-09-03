export interface Item {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  containerId: string;
  mass_kg: number;
  width_cm: number;
  depth_cm: number;
  height_cm: number;
  priority: number;
  expiry_date: string;
  preferred_zone: string;
  temp_requirement: string;
  hazardous_class: string;
  maximum_uses: number;
  current_uses: number;
  usage_frequency: number;
  lot_number: string;
  orientation_allowed: boolean;
  tags_id: string[];
  x?: number;
  y?: number;
  z?: number;
}

export interface Container {
  id: string;
  name: string;
  type: string;
  zoneId: string;
  module_id: string;
  width_cm: number;
  depth_cm: number;
  height_cm: number;
  currentWeight: number;
  maxWeight: number;
}

export interface Placement {
  id: string;
  itemId: string;
  containerId: string;
  startCoordinates: Coordinates;
  endCoordinates: Coordinates;
}

export interface Coordinates {
  width: number;
  depth: number;
  height: number;
}

export interface Zone {
  id: string;
  name: string;
  containers: Container[];
  items: Item[];
}
