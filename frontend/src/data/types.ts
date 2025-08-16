// /data/types.ts

export enum ItemStatus {
  ACTIVE = 'active',
  WASTE_EXPIRED = 'expired',
  WASTE_DEPLETED = 'depleted',
  DISPOSED = 'disposed',
}

export interface Container {
  container_id: string; // Updated to snake_case
  zone: string;
  module_id: string; // New field
  width_cm: number; // Updated to snake_case with _cm suffix
  depth_cm: number;
  height_cm: number;
  item_count: number;
  expired_item_count: number;
}

export interface Item {
  item_id: string; // Updated to snake_case
  name: string;
  category: string; // New field
  subcategory: string; // New field
  container_id: string | null; // Updated to snake_case
  mass_kg: number; // Updated to snake_case with _kg suffix
  expiry_date: string | null; // Updated to snake_case
  width_cm: number; // Updated to snake_case with _cm suffix
  depth_cm: number;
  height_cm: number;
  priority: number;
  usage_limit: string | null; // Updated to snake_case and string type
  current_uses: number; // Current usage count
  preferred_zone: string | null; // Updated to snake_case
  current_zone: string | null; // Updated to snake_case
  status: ItemStatus;
  expired: boolean;
  depleted: boolean;
}

// Base pagination response structure
interface PaginatedResponse<T> {
  total: number;
  page: number;
  size: number;
  items: T[];
}

export type PaginatedContainerResponse = PaginatedResponse<Container>;
export type PaginatedItemResponse = PaginatedResponse<Item>;