export interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
}

export interface Ball {
  x: number;
  y: number;
  radius: number;
  velocityX: number;
  velocityY: number;
  speed: number;
}

export interface PongState {
  playerScore: number;
  cpuScore: number;
  gameStatus: "playing" | "scored" | "game-over";
  winner: "player" | "cpu" | null;
}

export interface PongConfig {
  winningScore: number;
  ballSpeed: number;
  paddleSpeed: number;
  aiDifficulty: number;
}
