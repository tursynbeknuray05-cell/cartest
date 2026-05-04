let bgImg;
let carImg;
let obstacleImg;
let palmLeftImg;
let palmRightImg;

const CONFIG = {
  canvasW: 480,
  canvasH: 540,
  horizonY: 195,
  vanishX: 240,
  roadHalfBottom: 180,
  initialSpeed: 2,
  maxExtraSpeed: 5,
  speedupRate: 120,
  barrierSpawnBase: 90,
  barrierSpawnMin: 50,
  barrierSpawnRate: 8,
  carSmoothness: 0.12,
};

let state = "idle";
let score = 0;
let best = 0;
let frameCounter = 0;
let speed = CONFIG.initialSpeed;
let mouseTargetX = CONFIG.canvasW / 2;
let carOffset = 0;
let barriers = [];
let palms = [];
let lastSpawn = 0;

function preload() {
  bgImg = loadImage("background.png");
  carImg = loadImage("car.png");
  obstacleImg = loadImage("obstacle.png");
  palmLeftImg = loadImage("palmLeft.png");
  palmRightImg = loadImage("palmRight.png");
}

function setup() {
  createCanvas(CONFIG.canvasW, CONFIG.canvasH);
  textFont("monospace");
  textAlign(CENTER, CENTER);
  imageMode(CORNER);
  initPalms();
}

function draw() {
  if (state === "playing") {
    updateGame();
  }

  drawScene();
  drawHUD();

  if (state === "idle") {
    drawOverlay("FLASH", "Move mouse left and right\nClick to start");
  } else if (state === "dead") {
    drawOverlay("CRASHED!", "Score: " + score + "\nClick to retry");
  }
}

function mouseMoved() {
  mouseTargetX = mouseX;
}

function touchMoved() {
  if (touches.length > 0) {
    mouseTargetX = touches[0].x;
  }
  return false;
}

function mousePressed() {
  if (state === "idle" || state === "dead") {
    startGame();
  }
}

function touchStarted() {
  if (state === "idle" || state === "dead") {
    startGame();
  }
  return false;
}

function startGame() {
  state = "playing";
  score = 0;
  frameCounter = 0;
  speed = CONFIG.initialSpeed;
  barriers = [];
  carOffset = 0;
  lastSpawn = 0;
  mouseTargetX = width / 2;
  initPalms();
}

function endGame() {
  state = "dead";
  if (score > best) {
    best = score;
  }
}

function updateGame() {
  frameCounter++;
  score = floor((frameCounter * speed) / 50);

  speed =
    CONFIG.initialSpeed +
    min(score / CONFIG.speedupRate, CONFIG.maxExtraSpeed);

  mouseTargetX = constrain(mouseTargetX, 0, width);

  const targetOffset = ((mouseTargetX - width / 2) / (width / 2)) * 0.95;
  carOffset += (targetOffset - carOffset) * CONFIG.carSmoothness;
  carOffset = constrain(carOffset, -1, 1);

  const spawnInterval = max(
    CONFIG.barrierSpawnMin,
    CONFIG.barrierSpawnBase - score / CONFIG.barrierSpawnRate
  );

  if (frameCounter - lastSpawn > spawnInterval) {
    spawnBarrier();
    lastSpawn = frameCounter;
  }

  for (let b of barriers) {
    b.z += b.speed * (speed / 2);
  }
  barriers = barriers.filter((b) => b.z < 1.15);

  updatePalms();
  checkCollision();
}

function spawnBarrier() {
  const lane = random() > 0.5 ? -0.38 : 0.38;

  barriers.push({
    lane: lane,
    z: 0.12,
    speed: 0.010 + speed * 0.0018,
  });
}

function checkCollision() {
  const maxShift = roadX(1, 1) - CONFIG.vanishX;
  const carScreenX = width / 2 + carOffset * maxShift * 0.85;

  for (const b of barriers) {
    if (b.z > 0.72 && b.z < 1.05) {
      const bScreenX = roadX(b.lane, b.z);
      const scale = 0.45 + b.z * 0.95;

      const obstacleHalfWidth = (180 * scale) * 0.28;
      const carHalfWidth = 40;

      if (abs(bScreenX - carScreenX) < obstacleHalfWidth + carHalfWidth) {
        endGame();
        return;
      }
    }
  }
}

function roadX(normX, z) {
  const half = CONFIG.roadHalfBottom * z;
  return CONFIG.vanishX + normX * half;
}

function roadY(z) {
  return CONFIG.horizonY + (CONFIG.canvasH - CONFIG.horizonY) * z;
}

// ---------- PALMS ----------

function initPalms() {
  palms = [];
  const countPerSide = 4;

  for (let i = 0; i < countPerSide; i++) {
    palms.push({
      side: "left",
      z: 0.15 + i * 0.22,
      speed: 0.008
    });

    palms.push({
      side: "right",
      z: 0.26 + i * 0.22,
      speed: 0.008
    });
  }
}

function updatePalms() {
  for (let p of palms) {
    p.z += p.speed * (speed / 2);
  }

  for (let p of palms) {
    if (p.z > 1.12) {
      p.z = random(0.05, 0.18);
    }
  }
}

function drawPalmSprite(p) {
  const scale = 0.35 + p.z * 0.95;
  const y = roadY(p.z);

  // Place palms just outside the road edges
  const edgePadding = 42 + p.z * 30;
  let x;

  if (p.side === "left") {
    x = roadX(-1, p.z) - edgePadding;
  } else {
    x = roadX(1, p.z) + edgePadding;
  }

  const w = 85 * scale;
  const h = 135 * scale;

  if (p.side === "left") {
    image(palmLeftImg, x - w * 0.5, y - h, w, h);
  } else {
    image(palmRightImg, x - w * 0.5, y - h, w, h);
  }
}

// ---------- DRAW ----------

function drawScene() {
  background(0);

  drawBackgroundImage();
  drawRoadLaneDashes();

  // draw far palms first, near palms later
  const sortedPalms = [...palms].sort((a, b) => a.z - b.z);
  for (const p of sortedPalms) {
    drawPalmSprite(p);
  }

  const sortedBarriers = [...barriers].sort((a, b) => a.z - b.z);
  for (const b of sortedBarriers) {
    drawBarrier(b);
  }

  drawPlayerCar();
}

function drawBackgroundImage() {
  image(bgImg, 0, 0, width, height);
}

function drawRoadLaneDashes() {
  stroke(255);
  noFill();

  for (let i = 0; i < 9; i++) {
    let z = ((i * 0.17) + (frameCounter * speed * 0.0035)) % 1;

    if (z < 0.05) continue;

    let y1 = roadY(z);
    let y2 = roadY(min(z + 0.08, 1));

    let dashWidth = map(z, 0, 1, 2, 14);
    strokeWeight(dashWidth);
    line(CONFIG.vanishX, y1, CONFIG.vanishX, y2);
  }

  noStroke();
}

function drawBarrier(b) {
  const scale = 0.45 + b.z * 0.95;
  const cx = roadX(b.lane, b.z);
  const cy = roadY(b.z);

  const w = 180 * scale;
  const h = 95 * scale;

  image(obstacleImg, cx - w / 2, cy - h / 2, w, h);
}

function drawPlayerCar() {
  const maxShift = roadX(1, 1) - CONFIG.vanishX;
  const cx = width / 2 + carOffset * maxShift * 0.85;
  const cy = height - 112;

  const w = 160;
  const h = 110;

  image(carImg, cx - w / 2, cy, w, h);
}

function drawHUD() {
  fill(170);
  noStroke();

  textAlign(LEFT, TOP);
  textSize(14);
  text("Score: " + score, 18, 14);

  textAlign(RIGHT, TOP);
  text("Best: " + best, width - 18, 14);
}

function drawOverlay(title, msg) {
  fill(0, 150);
  rect(0, 0, width, height);

  textAlign(CENTER, CENTER);

  fill(255, 60, 60);
  textSize(30);
  text(title, width / 2, height / 2 - 46);

  fill(255);
  textSize(14);
  text(msg, width / 2, height / 2 + 2);

  fill(230);
  textSize(13);
  text("CLICK / TAP", width / 2, height / 2 + 58);
}