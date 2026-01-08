
export enum UserRole {
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE'
}

export enum RoomType {
  SINGLE = 'Single',
  DOUBLE = 'Double',
  FAMILY = 'Family',
  DORM = 'Dorm',
  CUSTOM = 'Custom'
}

export enum RoomStatus {
  AVAILABLE = 'Available',
  OCCUPIED = 'Occupied',
  MAINTENANCE = 'Maintenance',
  RESERVED = 'Reserved'
}

export interface UserPermissions {
  canMoveTenants: boolean;
  canViewPayments: boolean;
  canAddPayments: boolean;
  canEditPayments: boolean;
}

export interface User {
  id: string;
  username: string;
  password?: string;
  fullName: string;
  role: UserRole;
  email: string;
  isActive: boolean;
  permissions: UserPermissions;
  
  // Coin System Fields
  coins: number;
  targetAmount: number; // Monthly target
  minAmount: number;    // Monthly minimum
  dailyTarget: number;  // Today's target
  totalCollected: number;
  dailyCollected: number; // Tracker for today's collection
  lastCollectionDate?: string;
}

export interface Feedback {
  id: string;
  userId: string;
  userName: string;
  type: 'Feedback' | 'Feature Request';
  content: string;
  timestamp: string;
  status: 'Pending' | 'Reviewed';
}

export interface Room {
  id: string;
  roomNumber: string;
  type: RoomType;
  status: RoomStatus;
  floor: string;
  building: string;
  monthlyRent: number;
  currentBalance: number;
  lastMaintained?: string;
  createdAt: string;
  maintenanceCost?: number;
  maintenanceEndDate?: string;
  occupancyStartDate?: string;
  occupancyEndDate?: string;
  isOpenEnded?: boolean;
  reservationStartDate?: string;
  reservationEndDate?: string;
  monthlyExpenses: number;
  // Room specific expectations
  targetCollection: number; 
  minCollection: number;
}

export interface Payment {
  id: string;
  roomId: string;
  roomNumber: string;
  amount: number;
  date: string;
  status: 'Paid' | 'Pending';
  recordedBy: string;
  recordedById: string;
}

export interface RoomAssignment {
  id: string;
  userId: string;
  roomId: string;
  isEnabled: boolean;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
}

export interface SystemStats {
  totalRooms: number;
  availableRooms: number;
  occupiedRooms: number;
  maintenanceRooms: number;
  reservedRooms: number;
  activeEmployees: number;
  projectedRevenue: number;
  totalExpenses: number;
  netProfit: number;
  overdueCount: number;
  showLeaderboard: boolean;
}

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning';
}
