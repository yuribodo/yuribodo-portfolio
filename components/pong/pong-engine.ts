import type { Paddle, Ball, PongState, PongConfig } from "@/lib/pong-types";

const PADDLE_MARGIN = 20;
const PADDLE_WIDTH = 12;
const PADDLE_HEIGHT_RATIO = 0.15;
const BALL_RADIUS_RATIO = 0.012;

export class PongEngine {
  private width: number;
  private height: number;
  private config: PongConfig;

  private playerPaddle: Paddle;
  private cpuPaddle: Paddle;
  private ball: Ball;

  private playerScore = 0;
  private cpuScore = 0;

  private scorePause = 0;
  private aiOffset = 0;
  private aiOffsetTimer = 0;
  private aiReactionDelay = 0;

  constructor(width: number, height: number, config: PongConfig) {
    this.width = width;
    this.height = height;
    this.config = config;

    const paddleHeight = height * PADDLE_HEIGHT_RATIO;
    const ballRadius = Math.max(6, width * BALL_RADIUS_RATIO);

    this.playerPaddle = {
      x: PADDLE_MARGIN,
      y: height / 2 - paddleHeight / 2,
      width: PADDLE_WIDTH,
      height: paddleHeight,
      speed: config.paddleSpeed,
    };

    this.cpuPaddle = {
      x: width - PADDLE_MARGIN - PADDLE_WIDTH,
      y: height / 2 - paddleHeight / 2,
      width: PADDLE_WIDTH,
      height: paddleHeight,
      speed: config.paddleSpeed,
    };

    this.ball = {
      x: width / 2,
      y: height / 2,
      radius: ballRadius,
      velocityX: config.ballSpeed * (Math.random() > 0.5 ? 1 : -1),
      velocityY: config.ballSpeed * (Math.random() * 0.6 - 0.3),
      speed: config.ballSpeed,
    };
  }

  movePaddle(normalizedY: number): void {
    const targetY = normalizedY * this.height - this.playerPaddle.height / 2;
    this.playerPaddle.y = Math.max(
      0,
      Math.min(this.height - this.playerPaddle.height, targetY)
    );
  }

  resize(newWidth: number, newHeight: number): void {
    const scaleX = newWidth / this.width;
    const scaleY = newHeight / this.height;

    this.width = newWidth;
    this.height = newHeight;

    const paddleHeight = newHeight * PADDLE_HEIGHT_RATIO;
    this.playerPaddle.x = PADDLE_MARGIN;
    this.playerPaddle.y *= scaleY;
    this.playerPaddle.height = paddleHeight;

    this.cpuPaddle.x = newWidth - PADDLE_MARGIN - PADDLE_WIDTH;
    this.cpuPaddle.y *= scaleY;
    this.cpuPaddle.height = paddleHeight;

    this.ball.x *= scaleX;
    this.ball.y *= scaleY;
    this.ball.radius = Math.max(6, newWidth * BALL_RADIUS_RATIO);
  }

  update(deltaTime: number): PongState {
    if (this.scorePause > 0) {
      this.scorePause -= deltaTime;
      if (this.scorePause <= 0) {
        this.resetBall();
      }
      return this.getState();
    }

    // Move ball
    this.ball.x += this.ball.velocityX * deltaTime;
    this.ball.y += this.ball.velocityY * deltaTime;

    // Top/bottom wall collision
    if (this.ball.y - this.ball.radius <= 0) {
      this.ball.y = this.ball.radius;
      this.ball.velocityY = Math.abs(this.ball.velocityY);
    } else if (this.ball.y + this.ball.radius >= this.height) {
      this.ball.y = this.height - this.ball.radius;
      this.ball.velocityY = -Math.abs(this.ball.velocityY);
    }

    // Paddle collisions
    if (this.checkPaddleCollision(this.playerPaddle)) {
      this.ball.x = this.playerPaddle.x + this.playerPaddle.width + this.ball.radius;
      this.handlePaddleBounce(this.playerPaddle, 1);
    } else if (this.checkPaddleCollision(this.cpuPaddle)) {
      this.ball.x = this.cpuPaddle.x - this.ball.radius;
      this.handlePaddleBounce(this.cpuPaddle, -1);
    }

    // Scoring
    if (this.ball.x + this.ball.radius < 0) {
      this.cpuScore++;
      this.scorePause = 0.8;
    } else if (this.ball.x - this.ball.radius > this.width) {
      this.playerScore++;
      this.scorePause = 0.8;
    }

    // AI movement
    this.updateAI(deltaTime);

    return this.getState();
  }

  render(ctx: CanvasRenderingContext2D): void {
    // Clear
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, this.width, this.height);

    // Center net
    ctx.strokeStyle = "rgba(237, 237, 237, 0.15)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 12]);
    ctx.beginPath();
    ctx.moveTo(this.width / 2, 0);
    ctx.lineTo(this.width / 2, this.height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Paddles
    ctx.fillStyle = "#4ade80";
    ctx.fillRect(
      this.playerPaddle.x,
      this.playerPaddle.y,
      this.playerPaddle.width,
      this.playerPaddle.height
    );
    ctx.fillRect(
      this.cpuPaddle.x,
      this.cpuPaddle.y,
      this.cpuPaddle.width,
      this.cpuPaddle.height
    );

    // Ball
    if (this.scorePause <= 0) {
      ctx.fillStyle = "#ededed";
      ctx.beginPath();
      ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private checkPaddleCollision(paddle: Paddle): boolean {
    return (
      this.ball.x - this.ball.radius <= paddle.x + paddle.width &&
      this.ball.x + this.ball.radius >= paddle.x &&
      this.ball.y + this.ball.radius >= paddle.y &&
      this.ball.y - this.ball.radius <= paddle.y + paddle.height
    );
  }

  private handlePaddleBounce(paddle: Paddle, directionX: number): void {
    const hitPosition =
      (this.ball.y - paddle.y) / paddle.height;
    const angle = (hitPosition - 0.5) * Math.PI * 0.6;

    const speed = Math.min(this.ball.speed * 1.05, this.config.ballSpeed * 1.8);
    this.ball.speed = speed;
    this.ball.velocityX = Math.cos(angle) * speed * directionX;
    this.ball.velocityY = Math.sin(angle) * speed;
  }

  private updateAI(deltaTime: number): void {
    const paddleCenterY = this.cpuPaddle.y + this.cpuPaddle.height / 2;

    // Periodically shift the AI's target offset so it misjudges position
    this.aiOffsetTimer -= deltaTime;
    if (this.aiOffsetTimer <= 0) {
      this.aiOffset = (Math.random() - 0.5) * this.cpuPaddle.height * 0.8;
      this.aiOffsetTimer = 1.0 + Math.random() * 1.5;
    }

    // Only track when ball moves toward CPU
    if (this.ball.velocityX > 0) {
      // Reaction delay: CPU doesn't react until ball crosses midfield
      if (this.ball.x < this.width * 0.25) {
        // Drift slowly toward center — not reacting yet
        const centerError = this.height / 2 - paddleCenterY;
        const maxMove = this.cpuPaddle.speed * deltaTime * 0.2;
        this.cpuPaddle.y += Math.max(-maxMove, Math.min(centerError * 0.3, maxMove));
      } else {
        const targetY = this.ball.y + this.aiOffset;
        const error = targetY - paddleCenterY;
        // CPU speed is capped below player speed so fast balls can beat it
        const cpuSpeed = this.cpuPaddle.speed * 0.85;
        const maxMove = cpuSpeed * deltaTime;
        const move = Math.max(-maxMove, Math.min(error * this.config.aiDifficulty, maxMove));
        this.cpuPaddle.y += move;
      }
    } else {
      // Slowly drift toward center when ball goes away
      const centerError = this.height / 2 - paddleCenterY;
      const maxMove = this.cpuPaddle.speed * deltaTime * 0.25;
      this.cpuPaddle.y += Math.max(-maxMove, Math.min(centerError * 0.4, maxMove));
    }

    this.cpuPaddle.y = Math.max(
      0,
      Math.min(this.height - this.cpuPaddle.height, this.cpuPaddle.y)
    );
  }

  private resetBall(): void {
    this.ball.x = this.width / 2;
    this.ball.y = this.height / 2;
    this.ball.speed = this.config.ballSpeed;

    const direction = Math.random() > 0.5 ? 1 : -1;
    this.ball.velocityX = this.config.ballSpeed * direction;
    this.ball.velocityY = this.config.ballSpeed * (Math.random() * 0.6 - 0.3);
  }

  private getState(): PongState {
    const isGameOver =
      this.playerScore >= this.config.winningScore ||
      this.cpuScore >= this.config.winningScore;

    return {
      playerScore: this.playerScore,
      cpuScore: this.cpuScore,
      gameStatus: isGameOver ? "game-over" : "playing",
      winner: isGameOver
        ? this.playerScore >= this.config.winningScore
          ? "player"
          : "cpu"
        : null,
    };
  }
}
