export enum UserRole {
  USER = 'user',
  ALIANZA = 'alianza',
  JEFE_PROYECTO = 'jefe_proyecto',
  STAFF = 'staff',
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  createdAt?: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    country?: string;
    bio?: string;
  };
  preferences?: {
    notifications?: boolean;
    newsletter?: boolean;
  };
  purchaseHistory?: string[];
  wishlist?: string[];
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  currency: string;
  images?: string[];
  projectIds?: string[];
  category: 'ropa' | 'accesorios' | 'digital' | 'impresos';
  tags?: {
    projects?: string[];
    types?: string[];
    countries?: string[];
    isOffer?: boolean;
  };
  variants?: ProductVariant[];
  isActive: boolean;
  createdAt?: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku?: string;
  priceModifier?: number;
  stock?: Record<string, { quantity: number; reserved?: number }>;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  currency: string;
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress?: ShippingAddress;
  trackingInfo?: TrackingInfo;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  image?: string;
}

export interface ShippingAddress {
  name: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface TrackingInfo {
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  status?: string;
  history?: TrackingEvent[];
}

export interface TrackingEvent {
  status: string;
  location: string;
  timestamp: string;
  description: string;
}

export interface News {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  coverImage?: string;
  projectIds?: string[];
  authorId: string;
  status: 'draft' | 'published';
  publishedAt?: string;
  createdAt?: string;
}

export interface Wiki {
  id: string;
  projectId: string;
  title: string;
  slug: string;
  content: string;
  coverImage?: string;
  status: 'draft' | 'published';
  createdBy: string;
  lastEditedBy: string;
  assignedStaff: string[];
  createdAt?: string;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  jefeProyectoId?: string;
  staffMembers?: string[];
  isActive: boolean;
  createdAt?: string;
}

export interface ShippingZone {
  id: string;
  name: string;
  countries: string[];
  rates: ShippingRate[];
  isActive: boolean;
}

export interface ShippingRate {
  method: string;
  minDays: number;
  maxDays: number;
  price: number;
  freeOver?: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Stats {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
}
