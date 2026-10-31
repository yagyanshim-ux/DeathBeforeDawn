// ============================================================
//  DEAD BEFORE DAWN
//  You died on Halloween night. Your soul jumped into a pumpkin,
//  and now the Grim Reaper is chasing you.
//  Survive until sunrise to win!
// ============================================================


// ------------------------------------------------------------
// 1. SETTINGS - change these numbers to tune the game
// ------------------------------------------------------------
const SURVIVE_SECONDS = 60;   // how long until sunrise
const GRAVITY = 0.9;          // how fast you fall after jumping
const JUMP_POWER = 16;        // how high you jump
const NORMAL_SPEED = 6;       // your normal running speed
const MIN_SPEED = 4;          // slowest you can go
const MAX_SPEED = 11;         // fastest you can go
const TOFFEE_BOOST = 0.35;    // speed you gain from each toffee
const HIT_SLOWDOWN = 1.5;     // speed you lose when you hit an obstacle
const REAPER_SPEED = 6.2;     // the Reaper's starting speed (he gets faster over time)
const HIDE_SECONDS = 3;       // how long you hide in a pumpkin patch
const STUN_SECONDS = 2;       // how long the Lantern Bomb knocks the Reaper down


// ------------------------------------------------------------
// 2. CANVAS SETUP
// ------------------------------------------------------------
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");   // ctx is our "paintbrush"
const WIDTH = canvas.width;            // 900
const HEIGHT = canvas.height;          // 450
const GROUND = 380;                    // y position of the ground
const PLAYER_X = 380;                  // the pumpkin stays here - the world moves past it
const REAPER_MIN_X = 10;               // the Reaper never goes further left (always on screen)


// ------------------------------------------------------------
// 3. GAME VARIABLES
// ------------------------------------------------------------
let scene = "intro";     // which screen: "intro", "play", "gameover" or "win"
let introTimer = 0;      // counts frames in the intro (60 frames = 1 second)
let endTimer = 0;        // counts frames on the end screens

let frames = 0;          // frames since the chase started
let playerY, playerSpeedY, onGround;
let speed;               // your running speed
let toffees;             // how many toffees you collected
let hitCooldown;         // a short safe time after getting hit
let hideTimer;           // more than 0 while you are hiding
let hasBomb;             // true if you are holding a Lantern Bomb

let reaperX;             // where the Reaper is on screen
let reaperMode;          // "chasing", "searching" or "knockedDown"
let knockedDownTimer;    // how long he stays on the ground
let throwTimer;          // counts down to his next scythe throw
let warningTimer;        // the red "!" shown before a throw

let obstacles, toffeeList, patches, scythes, bombs;   // lists of things on screen
let obstacleTimer, toffeeTimer, patchTimer;           // count down to the next one
let message = "";
let messageTimer = 0;
let scroll = 0;          // how far the world has moved (used to move the hills)

// random stars for the night sky
const stars = [];
for (let i = 0; i < 80; i++) {
  stars.push({ x: Math.random() * WIDTH, y: Math.random() * 260 });
}

// reset everything and start the chase
function startGame() {
  scene = "play";
  frames = 0;
  playerY = GROUND;
  playerSpeedY = 0;
  onGround = true;
  speed = NORMAL_SPEED;
  toffees = 0;
  hitCooldown = 0;
  hideTimer = 0;
  hasBomb = false;

  reaperX = REAPER_MIN_X;
  reaperMode = "chasing";
  knockedDownTimer = 0;
  throwTimer = 8 * 60;      // first scythe throw after about 8 seconds
  warningTimer = 0;

  obstacles = [];
  toffeeList = [];
  patches = [];
  scythes = [];
  bombs = [];
  obstacleTimer = 90;
  toffeeTimer = 60;
  patchTimer = 6 * 60;      // first pumpkin patch after about 6 seconds
  messageTimer = 0;
  scroll = 0;
}


// ------------------------------------------------------------
// 4. CONTROLS
// ------------------------------------------------------------
document.addEventListener("keydown", function (event) {
  if (event.code === "Space") event.preventDefault();   // stop the page scrolling
  if (event.repeat) return;                             // ignore keys being held down

  if (event.code === "Space") pressSpace();
  if (event.code === "KeyH") hide();
  if (event.code === "KeyT") throwBomb();
  if (event.code === "KeyR") { scene = "intro"; introTimer = 0; }
});

canvas.addEventListener("mousedown", pressSpace);   // clicking also works like SPACE

function pressSpace() {
  if (scene === "intro") startGame();          // skip the intro
  else if (scene === "play") jump();
  else if (endTimer > 45) startGame();         // play again from the end screen
}

function jump() {
  if (onGround && hideTimer === 0) {
    playerSpeedY = -JUMP_POWER;
    onGround = false;
    beep(520, 0.1);
  }
}

function hide() {
  if (scene !== "play" || hideTimer > 0 || !onGround) return;

  for (const patch of patches) {
    const nearPatch = PLAYER_X > patch.x - 40 && PLAYER_X < patch.x + patch.width;
    if (nearPatch && !patch.used) {
      patch.used = true;
      hideTimer = HIDE_SECONDS * 60;
      if (reaperMode === "chasing") reaperMode = "searching";
      warningTimer = 0;
      scythes = [];

      if (!hasBomb) {
        hasBomb = true;
        showMessage("You found a LANTERN BOMB! Press T to throw it");
      } else {
        showMessage("Shhh... hiding...");
      }
      beep(300, 0.2);
    }
  }
}

function throwBomb() {
  if (scene === "play" && hasBomb) {
    hasBomb = false;
    bombs.push({ x: PLAYER_X - 20, y: playerY - 30 });
    beep(400, 0.15);
  }
}


// ------------------------------------------------------------
// 5. HELPER FUNCTIONS
// ------------------------------------------------------------
function random(min, max) {
  return min + Math.random() * (max - min);
}

// do two boxes overlap?
function touching(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function showMessage(text) {
  message = text;
  messageTimer = 120;   // show it for 2 seconds
}

// play a short beep sound
let audio = null;
function beep(frequency, seconds) {
  if (!audio) audio = new AudioContext();
  const sound = audio.createOscillator();
  const volume = audio.createGain();
  sound.frequency.value = frequency;
  volume.gain.value = 0.05;
  sound.connect(volume);
  volume.connect(audio.destination);
  sound.start();
  sound.stop(audio.currentTime + seconds);
}


// ------------------------------------------------------------
// 6. UPDATE THE GAME (runs 60 times every second)
// ------------------------------------------------------------
function updateGame() {
  frames++;

  // the sun comes up - you win!
  if (frames >= SURVIVE_SECONDS * 60) {
    scene = "win";
    endTimer = 0;
    beep(880, 0.4);
    return;
  }

  if (hideTimer > 0) {
    // HIDING: the world stops and the Reaper searches for you
    hideTimer--;
    if (hideTimer === 0) {
      if (reaperMode === "searching") reaperMode = "chasing";
      showMessage("RUN!");
    }
  } else {
    // RUNNING
    updateSpeed();
    updateJump();
    spawnThings();
    moveThings();
    checkHits();
    collectToffees();
  }

  updateReaper();
  updateBombs();
  if (hitCooldown > 0) hitCooldown--;
  if (messageTimer > 0) messageTimer--;

  // did the Reaper catch you?
  if (reaperMode === "chasing" && reaperX + 75 >= PLAYER_X - 16) {
    scene = "gameover";
    endTimer = 0;
    beep(90, 0.6);
  }
}

function updateSpeed() {
  // your speed slowly goes back to normal
  if (speed > NORMAL_SPEED) speed -= 0.008;
  if (speed < NORMAL_SPEED) speed += 0.012;
}

function updateJump() {
  playerSpeedY += GRAVITY;      // gravity pulls you down
  playerY += playerSpeedY;
  if (playerY >= GROUND) {      // landed
    playerY = GROUND;
    playerSpeedY = 0;
    onGround = true;
  }
}

function spawnThings() {
  obstacleTimer--;
  if (obstacleTimer <= 0) {
    addObstacle();
    obstacleTimer = random(60, 120);
  }

  toffeeTimer--;
  if (toffeeTimer <= 0) {
    addToffees();
    toffeeTimer = random(80, 140);
  }

  patchTimer--;
  if (patchTimer <= 0) {
    patches.push({ x: WIDTH + 40, width: 180, used: false });
    obstacleTimer = Math.max(obstacleTimer, 90);   // no obstacles right next to the patch
    patchTimer = random(12, 16) * 60;              // next patch in 12-16 seconds
  }
}

function addObstacle() {
  const pick = Math.random();
  if (pick < 0.45) {
    obstacles.push({ type: "gravestone", x: WIDTH, width: 34, height: random(30, 60) });
  } else if (pick < 0.75) {
    obstacles.push({ type: "grave", x: WIDTH, width: random(55, 80) });
  } else {
    obstacles.push({ type: "bat", x: WIDTH, width: 40 });   // bats fly high - don't jump!
  }
}

function addToffees() {
  const high = Math.random() < 0.4;          // some toffees float high - jump for them
  const y = high ? GROUND - 110 : GROUND - 25;
  const count = Math.floor(random(3, 6));    // 3 to 5 toffees in a row
  for (let i = 0; i < count; i++) {
    toffeeList.push({ x: WIDTH + i * 38, y: y, taken: false });
  }
}

function moveThings() {
  scroll += speed;
  for (const o of obstacles) {
    o.x -= speed;
    if (o.type === "bat") o.x -= 1.5;    // bats fly towards you a bit faster
  }
  for (const t of toffeeList) t.x -= speed;
  for (const p of patches) p.x -= speed;
  for (const s of scythes) {
    s.x += 7;          // scythes fly to the right, towards you
    s.angle += 0.35;   // and spin
  }

  // remove things that have left the screen
  obstacles = obstacles.filter(o => o.x > -100);
  toffeeList = toffeeList.filter(t => t.x > -30 && !t.taken);
  patches = patches.filter(p => p.x > -200);
  scythes = scythes.filter(s => s.x < WIDTH + 40);
}

function checkHits() {
  // the pumpkin's "hit box"
  const me = { x: PLAYER_X - 16, y: playerY - 36, w: 32, h: 34 };

  for (const o of obstacles) {
    let hit = false;
    if (o.type === "gravestone") {
      hit = touching(me, { x: o.x + 4, y: GROUND - o.height, w: o.width - 8, h: o.height });
    }
    if (o.type === "bat") {
      hit = touching(me, { x: o.x + 6, y: GROUND - 115, w: o.width - 12, h: 20 });
    }
    if (o.type === "grave") {
      hit = onGround && PLAYER_X > o.x + 10 && PLAYER_X < o.x + o.width - 10;
    }
    if (hit) getHit();
  }

  for (const s of scythes) {
    if (touching(me, { x: s.x - 16, y: GROUND - 38, w: 32, h: 32 })) getHit();
  }
}

function getHit() {
  if (hitCooldown > 0) return;
  speed = Math.max(MIN_SPEED, speed - HIT_SLOWDOWN);   // you slow down
  reaperX += 30;                                       // and the Reaper gets closer
  hitCooldown = 60;                                    // 1 second before you can be hit again
  showMessage("OUCH! Slowed down!");
  beep(110, 0.3);
}

function collectToffees() {
  for (const t of toffeeList) {
    const close = Math.abs(t.x - PLAYER_X) < 24 && Math.abs(t.y - (playerY - 20)) < 28;
    if (close && !t.taken) {
      t.taken = true;
      toffees++;
      speed = Math.min(MAX_SPEED, speed + TOFFEE_BOOST);   // toffee = more speed!
      beep(880, 0.05);
    }
  }
}

function updateReaper() {
  if (reaperMode === "chasing") {
    // The Reaper gets faster as dawn gets closer.
    // If he is faster than you, he moves closer. If you are faster, he falls behind.
    const reaperSpeed = REAPER_SPEED + frames / 4000;
    reaperX += (reaperSpeed - speed) * 0.6;
    updateScytheThrow();
  }

  if (reaperMode === "knockedDown") {
    knockedDownTimer--;
    reaperX -= 2.4;   // you get away while he is on the ground
    if (knockedDownTimer <= 0) {
      if (hideTimer > 0) reaperMode = "searching";
      else reaperMode = "chasing";
    }
  }

  // keep the Reaper on the screen
  if (reaperX < REAPER_MIN_X) reaperX = REAPER_MIN_X;
}

function updateScytheThrow() {
  // the red "!" warning is showing - throw when it ends
  if (warningTimer > 0) {
    warningTimer--;
    if (warningTimer === 0) {
      if (roadIsClear()) {
        scythes.push({ x: reaperX + 80, angle: 0 });
        throwTimer = random(6, 10) * 60;   // next throw in 6-10 seconds
        beep(180, 0.25);
      } else {
        throwTimer = 20;                   // an obstacle appeared - cancel, try again soon
      }
    }
    return;
  }

  throwTimer--;
  if (throwTimer <= 0) {
    if (roadIsClear()) warningTimer = 45;  // show "!" for 45 frames, then throw
    else throwTimer = 20;
  }
}

// the Reaper only throws when there is no obstacle near you
function roadIsClear() {
  for (const o of obstacles) {
    if (o.x + o.width > PLAYER_X - 80 && o.x < PLAYER_X + 320) return false;
  }
  return true;
}

function updateBombs() {
  for (const b of bombs) {
    b.x -= 11;   // the bomb flies left, towards the Reaper
    if (b.x < reaperX + 75 && reaperMode !== "knockedDown") {
      b.used = true;
      reaperMode = "knockedDown";
      knockedDownTimer = STUN_SECONDS * 60;
      showMessage("REAPER DOWN! 2 second head start!");
      beep(200, 0.4);
    }
  }
  bombs = bombs.filter(b => !b.used && b.x > -40);
}

function patchIsNear() {
  for (const p of patches) {
    if (!p.used && p.x < PLAYER_X + 220 && p.x + p.width > PLAYER_X - 40) return true;
  }
  return false;
}


// ------------------------------------------------------------
// 7. DRAW THE GAME
// ------------------------------------------------------------
function drawGame() {
  const progress = frames / (SURVIVE_SECONDS * 60);   // 0 = midnight, 1 = sunrise
  drawSky(progress);
  drawGround();

  for (const p of patches) drawPatch(p);
  for (const o of obstacles) {
    if (o.type === "gravestone") drawGravestone(o.x, o.height, o.width);
    if (o.type === "grave") drawGrave(o.x, o.width);
    if (o.type === "bat") drawBat(o.x);
  }
  for (const t of toffeeList) drawToffee(t.x, t.y);
  for (const s of scythes) drawScythe(s.x, GROUND - 22, s.angle);
  for (const b of bombs) drawLantern(b.x, b.y);

  // the Reaper
  if (reaperMode === "knockedDown") {
    drawReaper(reaperX, { fallen: true });
  } else {
    drawReaper(reaperX, { scythe: true });
  }
  if (reaperMode === "searching") speechBubble("Where did you go...?", reaperX + 50, GROUND - 145);
  if (warningTimer > 0) bigText("!", reaperX + 40, GROUND - 160, "red", 40);

  // the pumpkin: blinks after a hit, face turns off while hiding (so you blend in!)
  const blinking = hitCooldown > 0 && Math.floor(hitCooldown / 5) % 2 === 1;
  if (!blinking) drawPumpkin(PLAYER_X, playerY, hideTimer === 0);

  if (hideTimer > 0) {
    smallText("hiding " + Math.ceil(hideTimer / 60) + "...", PLAYER_X, GROUND - 85);
  } else if (patchIsNear() && Math.floor(frames / 8) % 2 === 0) {
    bigText("Press H!", PLAYER_X, playerY - 70, "#ffe14d", 26);
  }

  drawHUD();
}

function drawHUD() {
  const secondsLeft = Math.ceil(SURVIVE_SECONDS - frames / 60);
  hudText("🍬 Toffees: " + toffees, 20, 35, "left");
  hudText("Speed: " + speed.toFixed(1), 20, 62, "left");
  hudText("☀️ Sunrise in " + secondsLeft + "s", WIDTH - 20, 35, "right");
  if (hasBomb) hudText("🏮 Lantern Bomb: press T", 20, 89, "left");

  // danger bar: fuller = the Reaper is closer
  const maxGap = (PLAYER_X - 16) - (REAPER_MIN_X + 75);
  const gap = (PLAYER_X - 16) - (reaperX + 75);
  const danger = Math.min(1, Math.max(0, 1 - gap / maxGap));
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(350, 18, 200, 18);
  if (danger > 0.7) ctx.fillStyle = "red";
  else if (danger > 0.4) ctx.fillStyle = "orange";
  else ctx.fillStyle = "limegreen";
  ctx.fillRect(350, 18, 200 * danger, 18);
  ctx.strokeStyle = "white";
  ctx.strokeRect(350, 18, 200, 18);
  hudText("💀 REAPER DANGER", 450, 54, "center", 13);

  if (messageTimer > 0) bigText(message, WIDTH / 2, 150, "#ffe14d", 28);
}


// ------------------------------------------------------------
// 8. THE INTRO STORY  (t counts frames: 60 = 1 second)
// ------------------------------------------------------------
function updateIntro() {
  introTimer++;
  const t = introTimer;

  drawSky(0);
  drawGround();

  // the scene: mourners, your grave, your body and the Reaper
  drawPerson(220);
  drawPerson(600);
  drawPerson(645);
  drawGravestone(510, 70, 40);
  drawBody(400);
  drawReaper(270, { scythe: t > 660 });     // he takes out his scythe after 11 seconds
  drawPumpkin(790, GROUND, t > 400);        // the jack-o'-lantern lights up

  // your ghost rises out of your body...
  if (t > 60 && t < 580) {
    let ghostX = 440;
    let ghostY = GROUND - 10 - Math.min(110, (t - 60) * 1.2);
    let ghostSize = 1;

    // ...then gets sucked into the jack-o'-lantern
    if (t > 470) {
      const k = (t - 470) / 110;            // goes from 0 to 1
      ghostX = 440 + 350 * k * k;
      ghostY = 260 + 95 * k * k;
      ghostSize = 1 - 0.9 * k;
    }
    drawGhost(ghostX, ghostY, ghostSize);

    if (t > 170 && t < 270) speechBubble("Wait... is that ME?!", ghostX, ghostY - 60);
    if (t > 400 && t < 470) speechBubble("A jack-o'-lantern...?", ghostX, ghostY - 60);
    if (t > 480) speechBubble("WHOAAA!", ghostX, ghostY - 50);
  }

  if (t < 140) bigText("Halloween night...", WIDTH / 2, 110, "#ffb347", 36);
  if (t > 20 && t < 260) smallText("*sniff*", 622, GROUND - 90);
  if (t > 280 && t < 390) speechBubble("Your time is up.", 310, GROUND - 145);
  if (t > 590 && t < 660) speechBubble("I'm... a PUMPKIN?!", 790, GROUND - 60);
  if (t > 665 && t < 760) speechBubble("You can't escape me!", 310, GROUND - 165);
  if (t > 740) bigText("Press SPACE to run!", WIDTH / 2, 110, "#ff7a1a", 40);
  if (t < 740) smallText("SPACE to skip", WIDTH - 70, HEIGHT - 15);
}


// ------------------------------------------------------------
// 9. END SCREENS
// ------------------------------------------------------------
function drawGameOver() {
  endTimer++;
  drawSky(frames / (SURVIVE_SECONDS * 60));
  drawGround();
  drawReaper(PLAYER_X - 90, { scythe: true });
  drawGhost(PLAYER_X + 40, GROUND - 40 - Math.min(40, endTimer), 1);

  ctx.fillStyle = "rgba(120, 0, 0, 0.4)";   // red tint
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  bigText("THE REAPER GOT YOU", WIDTH / 2, 120, "#ff4040", 48);
  bigText("Toffees: " + toffees + "   Survived: " + Math.floor(frames / 60) + "s", WIDTH / 2, 170, "white", 24);
  if (endTimer > 45) bigText("Press SPACE to try again", WIDTH / 2, 215, "#ffb347", 26);
}

function drawWin() {
  endTimer++;
  drawSky(1);
  drawGround();

  // the Reaper fades away
  if (endTimer < 120) {
    ctx.globalAlpha = 1 - endTimer / 120;
    drawReaper(80, { scythe: true });
    ctx.globalAlpha = 1;
    speechBubble("Next year...", 130, GROUND - 145);
  }

  drawPumpkin(PLAYER_X, GROUND, true);
  bigText("YOU SURVIVED UNTIL DAWN!", WIDTH / 2, 140, "#ffe14d", 46);
  bigText("Toffees: " + toffees, WIDTH / 2, 195, "white", 28);
  if (endTimer > 45) bigText("Press SPACE to play again", WIDTH / 2, 250, "#ff7a1a", 26);
}


// ------------------------------------------------------------
// 10. DRAWING THE WORLD
// ------------------------------------------------------------
function drawSky(progress) {
  // night sky
  ctx.fillStyle = "#1a0f2e";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // sunrise colours fade in as dawn gets closer
  ctx.globalAlpha = progress;
  const dawn = ctx.createLinearGradient(0, 0, 0, GROUND);
  dawn.addColorStop(0, "#5a6ebe");
  dawn.addColorStop(1, "#ffaa6e");
  ctx.fillStyle = dawn;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.globalAlpha = 1;

  // stars fade out
  ctx.fillStyle = "rgba(255, 255, 255, " + (1 - progress) + ")";
  for (const s of stars) ctx.fillRect(s.x, s.y, 2, 2);

  // the moon sinks and the sun rises
  ctx.fillStyle = "#f5f0d2";
  circle(720, 80 + progress * 260, 36);
  if (progress > 0.6) {
    ctx.fillStyle = "#ffd25e";
    circle(180, GROUND + 60 - (progress - 0.6) * 250, 45);
  }
}

function drawGround() {
  // hills in the background (they move slowly)
  ctx.fillStyle = "#1e0e2c";
  ctx.beginPath();
  ctx.moveTo(0, GROUND);
  for (let x = 0; x <= WIDTH; x += 10) {
    ctx.lineTo(x, GROUND - 50 - Math.sin((x + scroll * 0.3) / 80) * 20);
  }
  ctx.lineTo(WIDTH, GROUND);
  ctx.fill();

  // the ground and grass
  ctx.fillStyle = "#140b1c";
  ctx.fillRect(0, GROUND, WIDTH, HEIGHT - GROUND);
  ctx.fillStyle = "#2e4a24";
  ctx.fillRect(0, GROUND, WIDTH, 5);
}


// ------------------------------------------------------------
// 11. DRAWING THE CHARACTERS
//     (Art teammate: change the colours and shapes here!)
// ------------------------------------------------------------
function drawPumpkin(x, y, faceOn, size = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  ctx.fillStyle = "#d85a0b";
  ellipse(-12, -20, 14, 20);              // left side
  ellipse(12, -20, 14, 20);               // right side
  ctx.fillStyle = "#ff7f1f";
  ellipse(0, -20, 16, 21);                // middle
  ctx.fillStyle = "#3f7a2a";
  ctx.fillRect(-3, -48, 6, 10);           // stem
  if (faceOn) {
    ctx.fillStyle = "#ffe14d";
    triangle(-12, -26, -4, -26, -8, -33); // left eye
    triangle(12, -26, 4, -26, 8, -33);    // right eye
    ctx.fillRect(-10, -15, 20, 6);        // mouth
  }
  ctx.restore();
}

function drawGhost(x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  ctx.fillStyle = "rgba(235, 240, 255, 0.9)";
  ctx.beginPath();
  ctx.arc(0, -30, 22, Math.PI, 0);        // round head
  ctx.lineTo(22, 0);                      // zig-zag bottom
  ctx.lineTo(11, -8);
  ctx.lineTo(0, 0);
  ctx.lineTo(-11, -8);
  ctx.lineTo(-22, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#222";
  ellipse(-8, -32, 4, 6);                 // eyes
  ellipse(8, -32, 4, 6);
  ellipse(0, -18, 5, 7);                  // mouth
  ctx.restore();
}

function drawReaper(x, options) {
  ctx.save();
  const float = Math.sin(Date.now() / 250) * 5;     // he floats up and down
  ctx.translate(x + 40, GROUND - 10 + float);
  if (options.fallen) {                             // knocked down: lie flat
    ctx.translate(0, -20 - float);
    ctx.rotate(Math.PI / 2);
  }

  if (options.scythe) {
    ctx.strokeStyle = "#6b4a2b";                    // handle
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(30, 0);
    ctx.lineTo(30, -120);
    ctx.stroke();
    ctx.fillStyle = "#cfd6e0";                      // blade
    ctx.beginPath();
    ctx.moveTo(30, -120);
    ctx.quadraticCurveTo(80, -135, 95, -90);
    ctx.quadraticCurveTo(70, -115, 30, -108);
    ctx.fill();
  }

  ctx.fillStyle = "#15101c";                        // black cloak
  ctx.beginPath();
  ctx.moveTo(-35, 0);
  ctx.quadraticCurveTo(-30, -60, -18, -95);
  ctx.quadraticCurveTo(0, -125, 18, -95);
  ctx.quadraticCurveTo(30, -60, 35, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "black";
  ellipse(2, -90, 13, 16);                          // dark face
  ctx.fillStyle = options.fallen ? "gray" : "red";
  circle(-3, -92, 3);                               // eyes
  circle(7, -92, 3);
  ctx.restore();

  if (options.fallen) bigText("★ ★ ★", x + 130, GROUND - 50, "#ffe14d", 18);   // dizzy stars
}

function drawPerson(x) {
  // a mourner at the funeral
  ctx.fillStyle = "#2b2b3a";
  ctx.beginPath();
  ctx.moveTo(x - 16, GROUND);
  ctx.lineTo(x - 11, GROUND - 55);
  ctx.lineTo(x + 11, GROUND - 55);
  ctx.lineTo(x + 16, GROUND);
  ctx.fill();
  ctx.fillStyle = "#b89478";
  circle(x + 3, GROUND - 61, 10);          // head (bowed)
}

function drawBody(x) {
  // your body lying on the ground
  ctx.fillStyle = "#6a7bb0";
  ctx.fillRect(x, GROUND - 14, 70, 14);
  ctx.fillStyle = "#c9a98a";
  circle(x + 82, GROUND - 10, 11);
}

function drawPatch(p) {
  // a group of pumpkins you can hide in
  drawPumpkin(p.x + 20, GROUND, false, 0.8);
  drawPumpkin(p.x + 62, GROUND, false, 1);
  drawPumpkin(p.x + 118, GROUND, false, 0.9);
  drawPumpkin(p.x + 160, GROUND, false, 0.75);
  if (!p.used) smallText("HIDE HERE", p.x + p.width / 2, GROUND - 62);
}


// ------------------------------------------------------------
// 12. DRAWING OBSTACLES AND ITEMS
// ------------------------------------------------------------
function drawGravestone(x, height, width) {
  ctx.fillStyle = "#7d7f8c";
  ctx.fillRect(x, GROUND - height + width / 2, width, height - width / 2);
  circle(x + width / 2, GROUND - height + width / 2, width / 2);   // round top
  ctx.fillStyle = "#4e505c";
  ctx.font = "bold 11px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText("RIP", x + width / 2, GROUND - height + width / 2 + 6);
}

function drawGrave(x, width) {
  // an open grave - a hole in the ground
  ctx.fillStyle = "#4a3324";
  ellipse(x + width + 12, GROUND, 22, 12);   // pile of dirt
  ctx.fillStyle = "#050208";
  ctx.fillRect(x, GROUND, width, 40);        // the hole
}

function drawBat(x) {
  const flap = Math.sin(Date.now() / 60) * 8;   // wings flap up and down
  const y = GROUND - 105;
  ctx.fillStyle = "#1b1022";
  triangle(x + 20, y, x, y - 8 - flap, x + 8, y + 6);         // left wing
  triangle(x + 20, y, x + 40, y - 8 - flap, x + 32, y + 6);   // right wing
  circle(x + 20, y + 2, 7);                                   // body
  ctx.fillStyle = "red";
  circle(x + 17, y + 1, 1.6);                                 // eyes
  circle(x + 23, y + 1, 1.6);
}

function drawToffee(x, y) {
  ctx.fillStyle = "#ffd84f";
  triangle(x - 7, y, x - 16, y - 7, x - 16, y + 7);   // wrapper ends
  triangle(x + 7, y, x + 16, y - 7, x + 16, y + 7);
  ctx.fillStyle = "#a0612b";
  ctx.fillRect(x - 9, y - 7, 18, 14);                 // toffee
}

function drawScythe(x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = "#6b4a2b";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-18, 0);
  ctx.lineTo(18, 0);
  ctx.stroke();
  ctx.fillStyle = "#cfd6e0";
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.quadraticCurveTo(30, -25, 5, -28);
  ctx.quadraticCurveTo(22, -18, 14, 0);
  ctx.fill();
  ctx.restore();
}

function drawLantern(x, y) {
  ctx.fillStyle = "#ffe98a";
  ctx.fillRect(x - 8, y - 10, 16, 20);   // glowing glass
  ctx.fillStyle = "#3b2a1a";
  ctx.fillRect(x - 9, y - 13, 18, 4);    // top
  ctx.fillRect(x - 9, y + 9, 18, 4);     // bottom
}


// ------------------------------------------------------------
// 13. SHAPE AND TEXT HELPERS
// ------------------------------------------------------------
function circle(x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function ellipse(x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function triangle(x1, y1, x2, y2, x3, y3) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.fill();
}

function bigText(text, x, y, color, size) {
  ctx.font = "bold " + size + "px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.lineWidth = 6;
  ctx.strokeStyle = "black";
  ctx.strokeText(text, x, y);   // black outline
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function smallText(text, x, y) {
  ctx.font = "bold 14px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillStyle = "#e0e0ff";
  ctx.fillText(text, x, y);
}

function hudText(text, x, y, align, size = 20) {
  ctx.font = "bold " + size + "px Trebuchet MS";
  ctx.textAlign = align;
  ctx.fillStyle = "white";
  ctx.fillText(text, x, y);
}

function speechBubble(text, x, y) {
  ctx.font = "bold 18px Trebuchet MS";
  const w = ctx.measureText(text).width + 24;
  ctx.fillStyle = "white";
  ctx.fillRect(x - w / 2, y - 38, w, 32);
  triangle(x - 8, y - 6, x + 8, y - 6, x, y + 6);   // little pointer
  ctx.fillStyle = "#222";
  ctx.textAlign = "center";
  ctx.fillText(text, x, y - 16);
}


// ------------------------------------------------------------
// 14. THE GAME LOOP - runs 60 times every second
// ------------------------------------------------------------
function gameLoop() {
  if (scene === "intro") {
    updateIntro();
  } else if (scene === "play") {
    updateGame();
    drawGame();
  } else if (scene === "gameover") {
    drawGameOver();
  } else if (scene === "win") {
    drawWin();
  }
  requestAnimationFrame(gameLoop);   // run again on the next frame
}

gameLoop();   // start!