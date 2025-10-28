// キャンバスの設定
const canvas = document.getElementById('tetris');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-piece');
const nextCtx = nextCanvas.getContext('2d');

// ゲームボードのサイズ
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;

// スコア要素
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const linesElement = document.getElementById('lines');
const finalScoreElement = document.getElementById('final-score');

// ゲーム状態
let board = [];
let score = 0;
let level = 1;
let lines = 0;
let gameOver = false;
let isPaused = false;
let dropInterval = 1000;
let lastDropTime = 0;
let animationId;

// テトロミノの形状定義
const SHAPES = {
    I: [[1, 1, 1, 1]],
    O: [[1, 1], [1, 1]],
    T: [[0, 1, 0], [1, 1, 1]],
    S: [[0, 1, 1], [1, 1, 0]],
    Z: [[1, 1, 0], [0, 1, 1]],
    J: [[1, 0, 0], [1, 1, 1]],
    L: [[0, 0, 1], [1, 1, 1]]
};

// テトロミノの色
const COLORS = {
    I: '#00f0f0',
    O: '#f0f000',
    T: '#a000f0',
    S: '#00f000',
    Z: '#f00000',
    J: '#0000f0',
    L: '#f0a000'
};

// 現在のピースと次のピース
let currentPiece;
let nextPiece;

// ゲームボードの初期化
function createBoard() {
    board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
}

// ピースの作成
function createPiece() {
    const shapes = Object.keys(SHAPES);
    const type = shapes[Math.floor(Math.random() * shapes.length)];
    return {
        shape: SHAPES[type],
        color: COLORS[type],
        type: type,
        x: Math.floor(COLS / 2) - Math.floor(SHAPES[type][0].length / 2),
        y: 0
    };
}

// ピースを描画
function drawPiece(piece, offsetX = 0, offsetY = 0, context = ctx) {
    piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                context.fillStyle = piece.color;
                context.fillRect(
                    (piece.x + x + offsetX) * BLOCK_SIZE,
                    (piece.y + y + offsetY) * BLOCK_SIZE,
                    BLOCK_SIZE,
                    BLOCK_SIZE
                );
                context.strokeStyle = '#000';
                context.strokeRect(
                    (piece.x + x + offsetX) * BLOCK_SIZE,
                    (piece.y + y + offsetY) * BLOCK_SIZE,
                    BLOCK_SIZE,
                    BLOCK_SIZE
                );
            }
        });
    });
}

// 次のピースを描画
function drawNextPiece() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (nextPiece) {
        const tempPiece = {
            ...nextPiece,
            x: (4 - nextPiece.shape[0].length) / 2,
            y: (4 - nextPiece.shape.length) / 2
        };
        drawPiece(tempPiece, 0, 0, nextCtx);
    }
}

// ボードを描画
function drawBoard() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    board.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                ctx.fillStyle = value;
                ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                ctx.strokeStyle = '#000';
                ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            }
        });
    });
}

// 衝突検出
function collision(piece, offsetX = 0, offsetY = 0) {
    return piece.shape.some((row, y) => {
        return row.some((value, x) => {
            if (value) {
                const newX = piece.x + x + offsetX;
                const newY = piece.y + y + offsetY;
                return (
                    newX < 0 ||
                    newX >= COLS ||
                    newY >= ROWS ||
                    (newY >= 0 && board[newY][newX])
                );
            }
            return false;
        });
    });
}

// ピースを固定
function mergePiece() {
    currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                const boardY = currentPiece.y + y;
                const boardX = currentPiece.x + x;
                if (boardY >= 0) {
                    board[boardY][boardX] = currentPiece.color;
                }
            }
        });
    });
}

// ラインクリア
function clearLines() {
    let linesCleared = 0;

    for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y].every(cell => cell !== 0)) {
            board.splice(y, 1);
            board.unshift(Array(COLS).fill(0));
            linesCleared++;
            y++;
        }
    }

    if (linesCleared > 0) {
        lines += linesCleared;
        score += [0, 100, 300, 500, 800][linesCleared] * level;
        level = Math.floor(lines / 10) + 1;
        dropInterval = Math.max(100, 1000 - (level - 1) * 100);
        updateScore();
    }
}

// スコア更新
function updateScore() {
    scoreElement.textContent = score;
    levelElement.textContent = level;
    linesElement.textContent = lines;
}

// ピースを移動
function movePiece(dir) {
    if (!collision(currentPiece, dir, 0)) {
        currentPiece.x += dir;
        draw();
    }
}

// ピースを回転
function rotatePiece() {
    const rotated = currentPiece.shape[0].map((_, i) =>
        currentPiece.shape.map(row => row[i]).reverse()
    );

    const previousShape = currentPiece.shape;
    currentPiece.shape = rotated;

    // 壁キック
    let offset = 0;
    if (collision(currentPiece)) {
        if (currentPiece.x > COLS / 2) {
            offset = -1;
            while (collision(currentPiece, offset, 0) && Math.abs(offset) < currentPiece.shape[0].length) {
                offset--;
            }
        } else {
            offset = 1;
            while (collision(currentPiece, offset, 0) && offset < currentPiece.shape[0].length) {
                offset++;
            }
        }

        if (collision(currentPiece, offset, 0)) {
            currentPiece.shape = previousShape;
            return;
        }
        currentPiece.x += offset;
    }

    draw();
}

// ピースを落とす
function dropPiece() {
    if (!collision(currentPiece, 0, 1)) {
        currentPiece.y++;
    } else {
        mergePiece();
        clearLines();
        currentPiece = nextPiece;
        nextPiece = createPiece();
        drawNextPiece();

        if (collision(currentPiece)) {
            endGame();
        }
    }
    draw();
}

// ハードドロップ
function hardDrop() {
    while (!collision(currentPiece, 0, 1)) {
        currentPiece.y++;
        score += 2;
    }
    updateScore();
    dropPiece();
}

// 描画
function draw() {
    drawBoard();
    drawPiece(currentPiece);
}

// ゲームループ
function gameLoop(timestamp) {
    if (gameOver || isPaused) return;

    const deltaTime = timestamp - lastDropTime;

    if (deltaTime > dropInterval) {
        dropPiece();
        lastDropTime = timestamp;
    }

    animationId = requestAnimationFrame(gameLoop);
}

// ゲーム開始
function startGame() {
    createBoard();
    score = 0;
    level = 1;
    lines = 0;
    gameOver = false;
    isPaused = false;
    dropInterval = 1000;

    currentPiece = createPiece();
    nextPiece = createPiece();

    updateScore();
    drawNextPiece();
    draw();

    document.getElementById('start-button').style.display = 'none';
    document.getElementById('game-over').classList.add('hidden');

    lastDropTime = performance.now();
    animationId = requestAnimationFrame(gameLoop);
}

// ゲーム終了
function endGame() {
    gameOver = true;
    cancelAnimationFrame(animationId);
    finalScoreElement.textContent = score;
    document.getElementById('game-over').classList.remove('hidden');
}

// 一時停止
function togglePause() {
    if (gameOver) return;

    isPaused = !isPaused;

    if (!isPaused) {
        lastDropTime = performance.now();
        animationId = requestAnimationFrame(gameLoop);
    } else {
        cancelAnimationFrame(animationId);
    }
}

// キーボード操作
document.addEventListener('keydown', (e) => {
    if (gameOver && e.key !== 'r' && e.key !== 'R') return;

    switch(e.key) {
        case 'ArrowLeft':
            e.preventDefault();
            if (!isPaused) movePiece(-1);
            break;
        case 'ArrowRight':
            e.preventDefault();
            if (!isPaused) movePiece(1);
            break;
        case 'ArrowDown':
            e.preventDefault();
            if (!isPaused) {
                dropPiece();
                score += 1;
                updateScore();
            }
            break;
        case 'ArrowUp':
        case ' ':
            e.preventDefault();
            if (!isPaused) rotatePiece();
            break;
        case 'p':
        case 'P':
            e.preventDefault();
            togglePause();
            break;
        case 'r':
        case 'R':
            e.preventDefault();
            startGame();
            break;
    }
});

// ボタンイベント
document.getElementById('start-button').addEventListener('click', startGame);
document.getElementById('restart-button').addEventListener('click', startGame);

// 初期描画
createBoard();
drawBoard();
