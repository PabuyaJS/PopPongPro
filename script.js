const trail = [];
const TRAIL_LENGTH = 12;

const c = document.getElementById("game");
const ctx = c.getContext("2d");

let running = false;
let paused = false;
let muted = false;
let level = "";
let pScore = 0;
let cScore = 0;
const winScore = 11;

let paddleW = 100;
const paddleH = 14;
const player = {x: 200, y: 650, s: 7};
const ai = {x: 200, y: 30, s: 4, error: 0};
const ball = {x: 250, y: 350, r: 8, vx: 0, vy: 0, rotation: 0};

let powerUp = null;
let powerTimer = 0;
let activePower = null;

const sound = {
  hit: new Audio("https://actions.google.com/sounds/v1/cartoon/pop.ogg"),
  score: new Audio("https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg"),
  power: new Audio("https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg"),
  win: new Audio("https://actions.google.com/sounds/v1/cartoon/siren_whistle.ogg"),
  lose: new Audio("https://actions.google.com/sounds/v1/cartoon/slide_whistle.ogg")
};

const diff = {
  easy: {ball: 4, ai: 3, error: 30},
  medium: {ball: 6, ai: 5, error: 15},
  hard: {ball: 8, ai: 7, error: 5}
};

let keys = {};
let L = false;
let R = false;

document.addEventListener("keydown", e => {
  keys[e.key] = true;
  if (e.key === " " || e.key === "Escape") togglePause();
});
document.addEventListener("keyup", e => keys[e.key] = false);

// Mobile controls
const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");

["touchstart", "mousedown"].forEach(e => {
  leftBtn.addEventListener(e, (evt) => {
    evt.preventDefault();
    L = true;
  });
  rightBtn.addEventListener(e, (evt) => {
    evt.preventDefault();
    R = true;
  });
});

["touchend", "mouseup", "touchcancel"].forEach(e => {
  leftBtn.addEventListener(e, (evt) => {
    evt.preventDefault();
    L = false;
  });
  rightBtn.addEventListener(e, (evt) => {
    evt.preventDefault();
    R = false;
  });
});

function play(s) {
  if (!muted) {
    s.currentTime = 0;
    s.play().catch(() => {});
  }
}

function startGame(l) {
  level = l;
  const d = diff[l];
  ball.vy = d.ball;
  ball.vx = 2;
  ai.s = d.ai;
  ai.error = d.error;
  pScore = 0;
  cScore = 0;
  paddleW = 100;
  powerUp = null;
  powerTimer = 0;
  activePower = null;
  trail.length = 0;
  resetBall();
  overlay.style.display = "none";
  document.getElementById("exitBtn").classList.add("active");
  document.getElementById("soundBtn").classList.add("active");
  running = true;
  paused = false;
  updateHighscore();
  updatePauseBtn();
  positionControls();
}

function resetBall() {
  ball.x = 250;
  ball.y = 350;
  ball.rotation = 0;
  
  // Reset ball speed to initial difficulty settings
  const d = diff[level];
  ball.vy = d.ball;
  ball.vx = Math.random() > 0.5 ? 2 : -2;
}

function togglePause() {
  if (!running) return;
  paused = !paused;
  updatePauseBtn();
}

function exitGame() {
  if (!running) return;
  running = false;
  paused = false;
  overlay.style.display = "flex";
  document.getElementById("exitBtn").classList.remove("active");
  updatePauseBtn();
}

function updatePauseBtn() {
  const btn = document.getElementById("pauseBtn");
  btn.innerHTML = paused ? "▶" : "⏸";
}

function positionControls() {
  const canvas = document.getElementById("game");
  const rect = canvas.getBoundingClientRect();
  const canvasBottom = rect.bottom;
  
  const controls = document.getElementById("mobileControls");
  const pauseBtn = document.getElementById("pauseBtn");
  
  controls.style.top = `${canvasBottom - 69}px`;
  pauseBtn.style.top = `${canvasBottom - 69}px`;
}

window.addEventListener("resize", positionControls);
window.addEventListener("load", positionControls);

function toggleMute() {
  muted = !muted;
  const btn = event.target;
  btn.innerHTML = muted ? "🔇" : "🔊";
}

function spawnPower() {
  if (Math.random() < 0.005 && !powerUp) {
    const types = ["speed", "wide", "shrink", "slow"];
    const type = types[Math.floor(Math.random() * types.length)];
    powerUp = {
      x: Math.random() * 400 + 50,
      y: 350,
      type: type
    };
  }
}

function update() {
  if (!running || paused) return;

  // Player movement
  if ((keys["ArrowLeft"] || L) && player.x > 0) player.x -= player.s;
  if ((keys["ArrowRight"] || R) && player.x < 500 - paddleW) player.x += player.s;

  // AI movement with error
  if (Math.random() * 100 > ai.error) {
    const target = ball.x - paddleW / 2;
    if (ball.x < ai.x + paddleW / 2) ai.x = Math.max(0, ai.x - ai.s);
    if (ball.x > ai.x + paddleW / 2) ai.x = Math.min(500 - paddleW, ai.x + ai.s);
  }

  // Ball movement
  ball.x += ball.vx;
  ball.y += ball.vy;
  ball.rotation += 0.1;

  // Wall collision
  if (ball.x < ball.r || ball.x > 500 - ball.r) ball.vx *= -1;

  // Player paddle collision
  if (ball.y + ball.r > player.y && 
      ball.y < player.y + paddleH &&
      ball.x > player.x && 
      ball.x < player.x + paddleW) {
    let spin = (ball.x - (player.x + paddleW / 2)) / (paddleW / 2);
    ball.vx += spin * 3;
    ball.vy *= -1;
    play(sound.hit);
  }

  // AI paddle collision
  if (ball.y - ball.r < ai.y + paddleH && 
      ball.y > ai.y &&
      ball.x > ai.x && 
      ball.x < ai.x + paddleW) {
    let spin = (ball.x - (ai.x + paddleW / 2)) / (paddleW / 2);
    ball.vx += spin * 2.5;
    ball.vy *= -1;
    play(sound.hit);
  }

  // Scoring
  if (ball.y > 700) {
    cScore++;
    play(sound.score);
    resetBall();
    trail.length = 0;
  }
  if (ball.y < 0) {
    pScore++;
    play(sound.score);
    resetBall();
    trail.length = 0;
  }

  // Power-up collision
  if (powerUp) {
    if (Math.abs(ball.x - powerUp.x) < 15 && Math.abs(ball.y - powerUp.y) < 15) {
      play(sound.power);
      if (powerUp.type === "wide") {
        paddleW = 160;
        powerTimer = 300; // 5 seconds at 60fps
        activePower = "wide";
      }
      if (powerUp.type === "speed") {
        ball.vx *= 1.3;
        ball.vy *= 1.3;
        powerTimer = 300; // 5 seconds
        activePower = "speed";
      }
      if (powerUp.type === "shrink") {
        paddleW = 50;
        powerTimer = 300; // 5 seconds
        activePower = "shrink";
      }
      if (powerUp.type === "slow") {
        ball.vx *= 0.5;
        ball.vy *= 0.5;
        powerTimer = 600; // 10 seconds
        activePower = "slow";
      }
      powerUp = null;
    }
  }

  // Power-up timer
  if (powerTimer > 0) {
    powerTimer--;
    if (powerTimer === 0) {
      // Reset effects based on active power
      if (activePower === "wide" || activePower === "shrink") {
        paddleW = 100;
      }
      if (activePower === "speed") {
        ball.vx /= 1.5;
        ball.vy /= 1.5;
      }
      if (activePower === "slow") {
        ball.vx /= 0.5;
        ball.vy /= 0.5;
      }
      activePower = null;
    }
  }

  spawnPower();

  // Update score display
  const scoreText = document.querySelector('#score span:first-child');
  scoreText.innerText = `${pScore} : ${cScore}`;
  
  // Update power-up timer display
  const timerEl = document.getElementById('powerupTimer');
  if (powerTimer > 0 && activePower) {
    const seconds = Math.ceil(powerTimer / 60);
    let color = "#2ecc71";
    let label = "";
    if (activePower === "wide") { color = "#2ecc71"; label = "Wide"; }
    if (activePower === "speed") { color = "#f39c12"; label = "Speed"; }
    if (activePower === "shrink") { color = "#e74c3c"; label = "Shrink"; }
    if (activePower === "slow") { color = "#9b59b6"; label = "Slow"; }
    
    timerEl.style.display = "block";
    timerEl.style.position = "relative";
    timerEl.style.backgroundColor = color;
    timerEl.style.color = "white";
    timerEl.innerText = `${label}: ${seconds}s`;
  } else {
    timerEl.style.display = "none";
  }

  // Win condition
  if (pScore === winScore || cScore === winScore) {
    saveHighscore();
    running = false;
    paused = false;
    showGameOver(pScore === winScore);
  }

  // Trail effect
  trail.push({x: ball.x, y: ball.y});
  if (trail.length > TRAIL_LENGTH) {
    trail.shift();
  }
}

function draw() {
  ctx.clearRect(0, 0, 500, 700);

  // Center line
  ctx.setLineDash([10, 10]);
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.moveTo(0, 350);
  ctx.lineTo(500, 350);
  ctx.stroke();
  ctx.setLineDash([]);

  // Trail
  drawTrail();

  // Player paddle
  ctx.fillStyle = "#1abc9c";
  ctx.shadowBlur = 10;
  ctx.shadowColor = "#1abc9c";
  ctx.fillRect(player.x, player.y, paddleW, paddleH);

  // AI paddle
  ctx.fillStyle = "#e74c3c";
  ctx.shadowColor = "#e74c3c";
  ctx.fillRect(ai.x, ai.y, paddleW, paddleH);
  
  ctx.shadowBlur = 0;

  // Ball
  drawBall();

  // Power-up
  if (powerUp) {
    let color = "#2ecc71"; // default green
    if (powerUp.type === "wide") color = "#2ecc71";
    if (powerUp.type === "speed") color = "#f39c12";
    if (powerUp.type === "shrink") color = "#e74c3c"; // red
    if (powerUp.type === "slow") color = "#9b59b6"; // purple
    
    ctx.fillStyle = color;
    ctx.shadowBlur = 15;
    ctx.shadowColor = color;
    ctx.beginPath();
    ctx.arc(powerUp.x, powerUp.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Pause overlay
  if (paused) {
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, 500, 700);
    ctx.fillStyle = "white";
    ctx.font = "bold 32px Arial";
    ctx.textAlign = "center";
    ctx.fillText("🏓 PopPong Pro", 250, 300);
    ctx.marginStyle = "15px";
    ctx.font = "bold 48px Arial";
    ctx.fillText("PAUSED", 250, 370);
  }
}

function drawBall() {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(ball.x, ball.y + 12, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(ball.x, ball.y);
  ctx.rotate(ball.rotation);

  const g = ctx.createRadialGradient(-3, -3, 2, 0, 0, ball.r);
  g.addColorStop(0, "#fff");
  g.addColorStop(0.4, "#f1c40f");
  g.addColorStop(1, "#b7950b");

  ctx.fillStyle = g;
  ctx.shadowBlur = 15;
  ctx.shadowColor = "#f1c40f";
  ctx.beginPath();
  ctx.arc(0, 0, ball.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-ball.r, 0);
  ctx.lineTo(ball.r, 0);
  ctx.stroke();

  ctx.restore();
}

function drawTrail() {
  for (let i = 0; i < trail.length; i++) {
    const p = trail[i];
    const alpha = i / trail.length;
    ctx.fillStyle = `rgba(241, 196, 15, ${alpha * 0.4})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, ball.r * alpha, 0, Math.PI * 2);
    ctx.fill();
  }
}

function saveHighscore() {
  const key = "tt_" + level;
  const best = parseInt(localStorage.getItem(key) || 0);
  if (pScore > best) localStorage.setItem(key, pScore);
}

function updateHighscore() {
  const e = localStorage.getItem("tt_easy") || 0;
  const m = localStorage.getItem("tt_medium") || 0;
  const h = localStorage.getItem("tt_hard") || 0;
  highscore.innerText = `Highscores — Easy: ${e} | Medium: ${m} | Hard: ${h}`;
}

function showGameOver(playerWon) {
  const modal = document.getElementById('gameOverModal');
  const title = document.getElementById('modalTitle');
  const message = document.getElementById('modalMessage');
  const result = document.getElementById('modalResult');
  
  title.innerText = "GAME OVER";
  result.innerText = `${pScore} : ${cScore}`;
  
  if (playerWon) {
    message.innerText = "🎉 Congrats! You win! 🏆";
    modal.style.borderColor = "#2ecc71";
    modal.style.color = "#2ecc71";
    play(sound.win);
    createConfetti();
  } else {
    message.innerText = "🤖 PONG bot wins! You lose. 🫵";
    modal.style.borderColor = "#e74c3c";
    modal.style.color = "#e74c3c";
    play(sound.lose);
  }
  
  modal.style.display = "block";
  
  setTimeout(() => {
    modal.style.display = "none";
    overlay.style.display = "flex";
    document.getElementById("exitBtn").classList.remove("active");
  }, 5000);
}

function createConfetti() {
  const colors = ["#f39c12", "#e74c3c", "#3498db", "#2ecc71", "#9b59b6", "#f1c40f"];
  
  for (let i = 0; i < 100; i++) {
    setTimeout(() => {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.top = Math.random() * 100 + '%';
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.animationDelay = Math.random() * 0.5 + 's';
      confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
      document.body.appendChild(confetti);
      
      setTimeout(() => confetti.remove(), 5000);
    }, i * 20);
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

updateHighscore();
loop();