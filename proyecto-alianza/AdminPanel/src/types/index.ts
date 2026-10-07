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

