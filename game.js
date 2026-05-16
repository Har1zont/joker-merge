// Joker Merge - Pixel Art Merge Game with Jokers
// Fully responsive version for mobile
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highscoreEl = document.getElementById('highscore');
const newGameBtn = document.getElementById('newGame');

let grid = [];
let score = 0;
let highscore = parseInt(localStorage.getItem('jokerMergeHigh') || '0');
let isGameOver = false;
let gameStarted = false;

const GRID_SIZE = 6;
let CELL_SIZE = 75;
let PADDING = 8;

let colors = ['#ff4757', '#ffa502', '#2ed573', '#1e90ff', '#3742fa', '#a55eea'];
let audioCtx;

function resizeCanvas() {
  const containerWidth = Math.min(window.innerWidth * 0.92, 520);
  const totalSize = containerWidth;
  CELL_SIZE = Math.floor((totalSize - (GRID_SIZE + 1) * PADDING) / GRID_SIZE);
  
  canvas.width = GRID_SIZE * CELL_SIZE + (GRID_SIZE + 1) * PADDING;
  canvas.height = canvas.width;
  
  // CSS size is already handled
}

function initAudio() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playMergeSound(value) {
  if (!audioCtx) initAudio();
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = value === 1 ? 'sawtooth' : 'square';
    osc.frequency.value = 400 + Math.log2(value || 2) * 120;
    gain.gain.value = 0.15;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    setTimeout(() => osc.stop(), 60);
  } catch(e) {}
}

function playJokerSound() {
  if (!audioCtx) initAudio();
  try {
    const noise = audioCtx.createBufferSource();
    const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.3, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < buffer.length; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = buffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1200;
    noise.connect(filter);
    filter.connect(audioCtx.destination);
    noise.start();
  } catch(e) {}
}

function createEmptyGrid() {
  return Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
}

function addRandomTile() {
  const emptyCells = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === 0) emptyCells.push({r, c});
    }
  }
  if (emptyCells.length === 0) return false;
  const {r, c} = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  grid[r][c] = Math.random() < 0.12 ? 1 : Math.pow(2, Math.floor(Math.random()*3)+1);
  return true;
}

function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#0f1626';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const x = c * (CELL_SIZE + PADDING) + PADDING;
      const y = r * (CELL_SIZE + PADDING) + PADDING;
      
      ctx.fillStyle = '#16213e';
      ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
      
      const val = grid[r][c];
      if (val > 0) {
        const isJoker = val === 1;
        ctx.fillStyle = isJoker ? '#f1f1f1' : colors[Math.min(Math.floor(Math.log2(val))-1, colors.length-1)];
        ctx.fillRect(x+4, y+4, CELL_SIZE-8, CELL_SIZE-8);
        
        ctx.fillStyle = isJoker ? '#111' : '#fff';
        ctx.font = isJoker ? `bold ${Math.floor(CELL_SIZE*0.45)}px Courier New` : `bold ${Math.floor(CELL_SIZE*0.5)}px Courier New`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isJoker ? '★' : val.toString(), x + CELL_SIZE/2, y + CELL_SIZE/2 + 3);
      }
    }
  }
}

function slide(row) {
  let newRow = row.filter(n => n !== 0);
  for (let i = 0; i < newRow.length - 1; i++) {
    if (newRow[i] === newRow[i+1] || newRow[i] === 1 || newRow[i+1] === 1) {
      const mergeVal = newRow[i] === 1 || newRow[i+1] === 1 ? Math.max(newRow[i], newRow[i+1]) * 3 : newRow[i] * 2;
      newRow[i] = mergeVal;
      newRow.splice(i+1, 1);
      score += mergeVal * 2;
      if (newRow[i] === 1 || mergeVal > 8) playJokerSound();
      else playMergeSound(mergeVal);
      i--;
    }
  }
  while (newRow.length < GRID_SIZE) newRow.push(0);
  return newRow;
}

function move(direction) {
  if (isGameOver || !gameStarted) return;
  let moved = false;

  if (direction === 'left') {
    for (let r = 0; r < GRID_SIZE; r++) {
      const newRow = slide(grid[r]);
      if (JSON.stringify(newRow) !== JSON.stringify(grid[r])) moved = true;
      grid[r] = newRow;
    }
  } else if (direction === 'right') {
    for (let r = 0; r < GRID_SIZE; r++) {
      let row = grid[r].slice().reverse();
      row = slide(row);
      row = row.reverse();
      if (JSON.stringify(row) !== JSON.stringify(grid[r])) moved = true;
      grid[r] = row;
    }
  } else if (direction === 'up') {
    for (let c = 0; c < GRID_SIZE; c++) {
      let col = grid.map(row => row[c]);
      col = slide(col);
      for (let r = 0; r < GRID_SIZE; r++) {
        if (grid[r][c] !== col[r]) moved = true;
        grid[r][c] = col[r];
      }
    }
  } else if (direction === 'down') {
    for (let c = 0; c < GRID_SIZE; c++) {
      let col = grid.map(row => row[c]).reverse();
      col = slide(col);
      col = col.reverse();
      for (let r = 0; r < GRID_SIZE; r++) {
        if (grid[r][c] !== col[r]) moved = true;
        grid[r][c] = col[r];
      }
    }
  }

  if (moved) {
    addRandomTile();
    drawGrid();
    updateUI();
    checkGameOver();
  }
}

function updateUI() {
  scoreEl.textContent = score;
  if (score > highscore) {
    highscore = score;
    highscoreEl.textContent = highscore;
    localStorage.setItem('jokerMergeHigh', highscore);
  }
}

function checkGameOver() {
  let hasEmpty = false;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === 0) hasEmpty = true;
    }
  }
  if (!hasEmpty) {
    isGameOver = true;
    setTimeout(() => {
      if (confirm(`Game Over!\nYour score: ${score}\nPlay again?`)) {
        startNewGame();
      }
    }, 300);
  }
}

function startNewGame() {
  grid = createEmptyGrid();
  score = 0;
  isGameOver = false;
  gameStarted = true;
  addRandomTile();
  addRandomTile();
  updateUI();
  drawGrid();
}

// Resize handler
window.addEventListener('resize', () => {
  resizeCanvas();
  drawGrid();
});

// Event listeners
newGameBtn.addEventListener('click', () => {
  resizeCanvas();
  startNewGame();
});

// Touch swipe
let startX, startY;
canvas.addEventListener('touchstart', e => {
  startX = e.changedTouches[0].screenX;
  startY = e.changedTouches[0].screenY;
});

canvas.addEventListener('touchend', e => {
  const endX = e.changedTouches[0].screenX;
  const endY = e.changedTouches[0].screenY;
  const dx = endX - startX;
  const dy = endY - startY;

  if (Math.abs(dx) > 40 || Math.abs(dy) > 40) {
    if (Math.abs(dx) > Math.abs(dy)) {
      move(dx > 0 ? 'right' : 'left');
    } else {
      move(dy > 0 ? 'down' : 'up');
    }
  }
});

document.addEventListener('keydown', e => {
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].indexOf(e.key) > -1) {
    e.preventDefault();
    switch(e.key) {
      case 'ArrowLeft': move('left'); break;
      case 'ArrowRight': move('right'); break;
      case 'ArrowUp': move('up'); break;
      case 'ArrowDown': move('down'); break;
    }
  }
});

// Initial setup
resizeCanvas();
startNewGame();
drawGrid();

console.log('%c🎮 Joker Merge v0.3 - Fully Responsive!', 'color:#ffcc00;font-family:monospace');