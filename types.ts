
export interface Point {
  x: number;
  y: number;
}

export interface GameObject extends Point {
  radius: number;
  color: string;
}

export interface Velocity {
  dx: number;
  dy: number;
}

export interface Puck extends GameObject, Velocity {}

export interface Mallet extends GameObject {
  prevX: number;
  prevY: number;
  dx: number;
  dy: number;
}

export type GameMode = '1P' | '2P';

export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GOAL = 'GOAL',
  GAMEOVER = 'GAMEOVER'
}
