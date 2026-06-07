export interface ChatMessage {
  id: string;
  username: string;
  text: string;
  mediaUrl: string | null;
  mediaType: 'image' | 'video' | null;
  timestamp: number;
}

export interface RoomUser {
  id: string;
  username: string;
  room: string;
}

export type CallMode = 'video' | 'audio';

export interface CallState {
  status: 'idle' | 'calling' | 'incoming' | 'active';
  remoteUserId: string | null;
  remoteUsername: string | null;
  mode: CallMode | null;
}
