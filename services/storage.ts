
import { User, Room, RoomAssignment, UserRole, RoomStatus, RoomType, ActivityLog, UserPermissions, Payment, Feedback } from '../types';

const STORAGE_KEYS = {
  USERS: 'rms_users',
  ROOMS: 'rms_rooms',
  ASSIGNMENTS: 'rms_assignments',
  LOGS: 'rms_logs',
  SESSION: 'rms_session',
  PAYMENTS: 'rms_payments',
  FEEDBACK: 'rms_feedback',
  SETTINGS: 'rms_settings'
};

const DB_UPDATE_EVENT = 'rms-db-update';

const INITIAL_USERS: User[] = [
  { 
    id: '1', 
    username: 'admin', 
    password: 'password123', 
    fullName: 'System Admin', 
    role: UserRole.ADMIN, 
    email: 'admin@rms.com', 
    isActive: true,
    permissions: { canMoveTenants: true, canViewPayments: true, canAddPayments: true, canEditPayments: true },
    coins: 0,
    targetAmount: 0,
    minAmount: 0,
    dailyTarget: 0,
    totalCollected: 0,
    dailyCollected: 0
  }
];

const _get = <T,>(key: string, initial: T): T => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) as T : initial;
};

const _save = <T,>(key: string, data: T): void => {
  localStorage.setItem(key, JSON.stringify(data));
  // Dispatch a local event for internal component sync
  window.dispatchEvent(new CustomEvent(DB_UPDATE_EVENT, { detail: { key } }));
};

export const db = {
  get: _get,
  save: _save,
  
  // Expose the update event name
  UPDATE_EVENT: DB_UPDATE_EVENT,

  getCurrentUser(): User | null {
    const session = _get<User | null>(STORAGE_KEYS.SESSION, null);
    if (!session) return null;
    const users = _get<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    // Always find fresh user data by ID from the main list to get current coins/stats
    const user = users.find(u => u.id === session.id);
    return user ? { ...user } : null;
  },

  login(username: string, password?: string): User | null {
    const users = _get<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    const user = users.find(u => u.username === username && u.password === password);
    if (user && user.isActive) {
      _save(STORAGE_KEYS.SESSION, user);
      this.logAction(user, 'Login', `User ${username} authenticated.`);
      return user;
    }
    return null;
  },

  logout() {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    window.dispatchEvent(new CustomEvent(DB_UPDATE_EVENT, { detail: { key: STORAGE_KEYS.SESSION } }));
  },

  getSettings() {
    return _get(STORAGE_KEYS.SETTINGS, { showLeaderboard: true });
  },

  updateSettings(settings: any) {
    const current = this.getSettings();
    _save(STORAGE_KEYS.SETTINGS, { ...current, ...settings });
  },

  getRooms(): Room[] {
    const user = this.getCurrentUser();
    if (!user) return [];
    let allRooms = _get<Room[]>(STORAGE_KEYS.ROOMS, []);
    if (user.role === UserRole.ADMIN) return allRooms;
    const assignments = _get<RoomAssignment[]>(STORAGE_KEYS.ASSIGNMENTS, []);
    const myRoomIds = assignments.filter(a => a.userId === user.id && a.isEnabled).map(a => a.roomId);
    return allRooms.filter(r => myRoomIds.includes(r.id));
  },

  updateRoom(roomId: string, updates: Partial<Room>) {
    const rooms = _get<Room[]>(STORAGE_KEYS.ROOMS, []);
    const index = rooms.findIndex(r => r.id === roomId);
    if (index === -1) throw new Error("Room not found");
    
    if (updates.monthlyRent !== undefined && updates.monthlyRent > 9999) {
      throw new Error("Max rent limit is 9,999");
    }

    rooms[index] = { ...rooms[index], ...updates };
    _save(STORAGE_KEYS.ROOMS, rooms);
  },

  bulkUpdateRooms(roomIds: string[], updates: Partial<Room>) {
    const rooms = _get<Room[]>(STORAGE_KEYS.ROOMS, []);
    roomIds.forEach(id => {
      const index = rooms.findIndex(r => r.id === id);
      if (index !== -1) {
        rooms[index] = { ...rooms[index], ...updates };
      }
    });
    _save(STORAGE_KEYS.ROOMS, rooms);
  },

  addRoom(room: any) {
    const rooms = _get<Room[]>(STORAGE_KEYS.ROOMS, []);
    if (room.monthlyRent > 9999) throw new Error("Max rent limit is 9,999");

    const newRoom = { 
      ...room, 
      id: Math.random().toString(36).substr(2, 9), 
      createdAt: new Date().toISOString(), 
      currentBalance: room.status === 'Occupied' ? room.monthlyRent : 0,
      targetCollection: room.targetCollection || 0,
      minCollection: room.minCollection || 0
    };
    rooms.push(newRoom);
    _save(STORAGE_KEYS.ROOMS, rooms);
    return newRoom;
  },

  getEmployees(): User[] {
    const users = _get<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    return users.filter(u => u.role === UserRole.EMPLOYEE);
  },

  updateEmployee(userId: string, updates: Partial<User>) {
    const users = _get<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    const idx = users.findIndex(u => u.id === userId);
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...updates };
      _save(STORAGE_KEYS.USERS, users);
    }
  },

  addEmployee(emp: any) {
    const users = _get<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    const newUser = { 
      ...emp, 
      id: Math.random().toString(36).substr(2, 9), 
      isActive: true, 
      coins: 0, 
      targetAmount: 0, 
      minAmount: 0, 
      dailyTarget: 0,
      totalCollected: 0, 
      dailyCollected: 0 
    };
    users.push(newUser);
    _save(STORAGE_KEYS.USERS, users);
    return newUser;
  },

  deleteEmployee(userId: string) {
    const users = _get<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    const filtered = users.filter(u => u.id !== userId);
    _save(STORAGE_KEYS.USERS, filtered);
    
    // Cleanup assignments
    const assignments = _get<RoomAssignment[]>(STORAGE_KEYS.ASSIGNMENTS, []);
    _save(STORAGE_KEYS.ASSIGNMENTS, assignments.filter(a => a.userId !== userId));
  },

  addPayment(paymentData: any) {
    const currentUser = this.getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");
    if (paymentData.amount > 9999) throw new Error("Max payment limit is 9,999");
    
    const rooms = _get<Room[]>(STORAGE_KEYS.ROOMS, []);
    const roomIdx = rooms.findIndex(r => r.id === paymentData.roomId);
    if (roomIdx === -1) throw new Error("Room not found");
    
    rooms[roomIdx].currentBalance -= paymentData.amount;
    _save(STORAGE_KEYS.ROOMS, rooms);

    const payments = _get<Payment[]>(STORAGE_KEYS.PAYMENTS, []);
    const newPayment = {
      ...paymentData,
      roomNumber: rooms[roomIdx].roomNumber,
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      recordedBy: currentUser.fullName,
      recordedById: currentUser.id
    };
    payments.push(newPayment);
    _save(STORAGE_KEYS.PAYMENTS, payments);

    // Update Employee master record
    const users = _get<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    const empIdx = users.findIndex(u => u.id === currentUser.id);
    if (empIdx !== -1) {
      const emp = { ...users[empIdx] };
      const todayStr = new Date().toISOString().split('T')[0];
      
      if (emp.lastCollectionDate !== todayStr) {
        emp.dailyCollected = 0;
        emp.lastCollectionDate = todayStr;
      }
      
      emp.totalCollected += paymentData.amount;
      emp.dailyCollected += paymentData.amount;
      
      if (emp.dailyTarget > 0 && emp.dailyCollected >= emp.dailyTarget) {
         emp.coins += 5;
      } else if (emp.dailyTarget > 0 && emp.dailyCollected < emp.dailyTarget) {
         emp.coins = Math.max(0, emp.coins - 1);
      }

      users[empIdx] = emp;
      _save(STORAGE_KEYS.USERS, users);
    }

    return newPayment;
  },

  getPayments(): Payment[] {
    const user = this.getCurrentUser();
    if (!user) return [];
    const allPayments = _get<Payment[]>(STORAGE_KEYS.PAYMENTS, []);
    if (user.role === UserRole.ADMIN) return allPayments;
    if (user.permissions.canViewPayments) return allPayments;
    return allPayments.filter(p => p.recordedById === user.id);
  },

  addFeedback(type: 'Feedback' | 'Feature Request', content: string) {
    const user = this.getCurrentUser();
    if (!user) return;
    const feedbacks = _get<Feedback[]>(STORAGE_KEYS.FEEDBACK, []);
    feedbacks.push({
      id: Math.random().toString(36).substr(2, 9),
      userId: user.id,
      userName: user.fullName,
      type,
      content,
      timestamp: new Date().toISOString(),
      status: 'Pending'
    });
    _save(STORAGE_KEYS.FEEDBACK, feedbacks);
  },

  getFeedbacks(): Feedback[] {
    return _get<Feedback[]>(STORAGE_KEYS.FEEDBACK, []);
  },

  getAssignments(): RoomAssignment[] {
    return _get<RoomAssignment[]>(STORAGE_KEYS.ASSIGNMENTS, []);
  },

  toggleAssignment(userId: string, roomId: string) {
    const assignments = _get<RoomAssignment[]>(STORAGE_KEYS.ASSIGNMENTS, []);
    const idx = assignments.findIndex(a => a.userId === userId && a.roomId === roomId);
    if (idx !== -1) {
      assignments[idx].isEnabled = !assignments[idx].isEnabled;
    } else {
      assignments.push({ id: Math.random().toString(36).substr(2, 9), userId, roomId, isEnabled: true });
    }
    _save(STORAGE_KEYS.ASSIGNMENTS, assignments);
  },

  getLogs(): ActivityLog[] {
    return _get<ActivityLog[]>(STORAGE_KEYS.LOGS, []).reverse();
  },

  logAction(user: User, action: string, details: string) {
    const logs = _get<ActivityLog[]>(STORAGE_KEYS.LOGS, []);
    logs.push({ id: Math.random().toString(36).substr(2, 9), timestamp: new Date().toISOString(), userId: user.id, userName: user.fullName, action, details });
    _save(STORAGE_KEYS.LOGS, logs.slice(-500));
  },

  globalSearch(query: string) {
    const q = query.toLowerCase().trim();
    if (!q) return { rooms: [], users: [], payments: [] };

    const user = this.getCurrentUser();
    if (!user) return { rooms: [], users: [], payments: [] };

    const rooms = this.getRooms().filter(r => 
      r.roomNumber.toLowerCase().includes(q) || 
      r.building.toLowerCase().includes(q) || 
      r.floor.toLowerCase().includes(q)
    );

    let users: User[] = [];
    if (user.role === UserRole.ADMIN) {
      users = _get<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS).filter(u => 
        u.fullName.toLowerCase().includes(q) || 
        u.username.toLowerCase().includes(q)
      );
    }

    const payments = this.getPayments().filter(p => 
      p.roomNumber.toLowerCase().includes(q) || 
      p.recordedBy.toLowerCase().includes(q)
    );

    return { rooms: rooms.slice(0, 5), users: users.slice(0, 5), payments: payments.slice(0, 5) };
  }
};
