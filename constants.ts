
import { RoomStatus, RoomType } from './types';

export const COLORS = {
  [RoomStatus.AVAILABLE]: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  [RoomStatus.OCCUPIED]: 'bg-blue-100 text-blue-700 border-blue-200',
  [RoomStatus.MAINTENANCE]: 'bg-amber-100 text-amber-700 border-amber-200',
  [RoomStatus.RESERVED]: 'bg-purple-100 text-purple-700 border-purple-200',
};

export const ROOM_TYPES = Object.values(RoomType);
export const ROOM_STATUSES = Object.values(RoomStatus);

export const APP_NAME = "RMS";
export const CURRENCY = "AED";
