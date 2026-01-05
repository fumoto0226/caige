export enum GameMode {
  LOCAL = 'LOCAL',
  ONLINE = 'ONLINE'
}

export enum PlaybackPosition {
  RANDOM = 'RANDOM',
  START = 'START'
}

export interface Artist {
  id: string;
  name: string;
  avatar: string;
}

export interface Song {
  id: string;
  title: string;
  artistId: string;
  cover: string;
}

export interface GameSettings {
  mode: GameMode;
  selectedArtistIds: string[];
  durationSeconds: number; // 2-30
  isFullSong: boolean;
  playbackPosition: PlaybackPosition;
  questionCount: number;
  timeLimit: number; // 0 for unlimited
  playerCount: number; // For local mode
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  score: number;
  isCurrentUser: boolean;
  hasSkipped?: boolean; // For online skip voting
  status?: 'answering' | 'correct' | 'wrong' | 'waiting';
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  type: 'user' | 'system' | 'correct';
}

export type ScreenState = 'setup' | 'game' | 'results';
