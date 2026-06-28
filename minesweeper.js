const DIRECTIONS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

const DIFFICULTIES = {
    beginner: { rows: 9, columns: 9, mines: 10 },
    intermediate: { rows: 16, columns: 16, mines: 40 },
    expert: { rows: 16, columns: 30, mines: 99 }
};

let board = [];
let cellState = [];
let rows = 9;
let columns = 9;
let minesCount = 10;
let minesLocation = [];
let tilesClicked = 0;
let flagsPlaced = 0;
let flagEnabled = false;
let gameOver = false;
let minesPlaced = false;
let timerInterval = null;
let elapsedSeconds = 0;
let gameStarted = false;

function tileId(r, c) {
    return r + "-" + c;
}

function getCoords(tile) {
    return [parseInt(tile.dataset.row, 10), parseInt(tile.dataset.col, 10)];
}

function resetGameState() {
    board = [];
    cellState = [];
    minesLocation = [];
    tilesClicked = 0;
    flagsPlaced = 0;
    gameOver = false;
    minesPlaced = false;
    gameStarted = false;
    elapsedSeconds = 0;
    stopTimer();
    updateTimerDisplay();
    updateMinesDisplay();
    setStatus("");
    document.getElementById("board").innerHTML = "";
}

function applyDifficulty() {
    const preset = DIFFICULTIES[document.getElementById("difficulty").value];
    rows = preset.rows;
    columns = preset.columns;
    minesCount = preset.mines;
}

function updateBoardLayout() {
    const boardEl = document.getElementById("board");
    const tileSize = Math.floor(Math.min(
        (window.innerWidth * 0.92) / columns,
        ((window.innerHeight - 220) * 0.92) / rows,
        40
    ));
    boardEl.style.setProperty("--cols", columns);
    boardEl.style.setProperty("--rows", rows);
    boardEl.style.setProperty("--tile-size", Math.max(tileSize, 18) + "px");
}

function updateMinesDisplay() {
    const el = document.getElementById("mines-count");
    if (gameOver && tilesClicked === rows * columns - minesCount) {
        el.textContent = "Cleared";
        return;
    }
    el.textContent = String(Math.max(minesCount - flagsPlaced, 0)).padStart(3, "0");
}

function updateTimerDisplay() {
    document.getElementById("timer").textContent = String(elapsedSeconds).padStart(3, "0");
}

function startTimer() {
    if (timerInterval) {
        return;
    }
    timerInterval = setInterval(function() {
        elapsedSeconds += 1;
        updateTimerDisplay();
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function setStatus(message, type) {
    const statusEl = document.getElementById("status");
    statusEl.textContent = message;
    statusEl.className = "status" + (type ? " " + type : "");
}

function setMines(firstR, firstC) {
    const forbidden = new Set([tileId(firstR, firstC)]);
    for (const [dr, dc] of DIRECTIONS) {
        const nr = firstR + dr;
        const nc = firstC + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < columns) {
            forbidden.add(tileId(nr, nc));
        }
    }

    let minesLeft = minesCount;
    while (minesLeft > 0) {
        const r = Math.floor(Math.random() * rows);
        const c = Math.floor(Math.random() * columns);
        const id = tileId(r, c);
        if (!forbidden.has(id) && !minesLocation.includes(id)) {
            minesLocation.push(id);
            minesLeft -= 1;
        }
    }
    minesPlaced = true;
}

function buildBoard() {
    cellState = [];
    for (let r = 0; r < rows; r++) {
        const row = [];
        const stateRow = [];
        for (let c = 0; c < columns; c++) {
            const tile = document.createElement("div");
            tile.id = tileId(r, c);
            tile.dataset.row = r;
            tile.dataset.col = c;
            tile.setAttribute("role", "gridcell");
            tile.setAttribute("aria-label", "Row " + (r + 1) + ", Column " + (c + 1) + ", hidden");
            tile.addEventListener("click", clickTile);
            tile.addEventListener("contextmenu", rightClickTile);
            setupLongPress(tile);
            document.getElementById("board").appendChild(tile);
            row.push(tile);
            stateRow.push("hidden");
        }
        board.push(row);
        cellState.push(stateRow);
    }
}

function startGame() {
    resetGameState();
    applyDifficulty();
    updateBoardLayout();
    updateMinesDisplay();
    buildBoard();
}

function setFlagMode() {
    flagEnabled = !flagEnabled;
    const button = document.getElementById("flag-button");
    button.classList.toggle("active", flagEnabled);
    button.setAttribute("aria-pressed", flagEnabled ? "true" : "false");
}

function isFlagged(r, c) {
    return cellState[r][c] === "flagged";
}

function toggleFlag(tile) {
    const [r, c] = getCoords(tile);
    if (cellState[r][c] === "revealed" || gameOver) {
        return;
    }

    if (cellState[r][c] === "flagged") {
        cellState[r][c] = "hidden";
        tile.textContent = "";
        tile.classList.remove("tile-flagged");
        flagsPlaced -= 1;
        tile.setAttribute("aria-label", "Row " + (r + 1) + ", Column " + (c + 1) + ", hidden");
    } else {
        cellState[r][c] = "flagged";
        tile.textContent = "🚩";
        tile.classList.add("tile-flagged");
        flagsPlaced += 1;
        tile.setAttribute("aria-label", "Row " + (r + 1) + ", Column " + (c + 1) + ", flagged");
    }
    updateMinesDisplay();
}

function rightClickTile(event) {
    event.preventDefault();
    if (gameOver) {
        return;
    }
    toggleFlag(this);
}

function setupLongPress(tile) {
    let pressTimer = null;
    let longPressHandled = false;

    tile.addEventListener("touchstart", function() {
        if (gameOver) {
            return;
        }
        longPressHandled = false;
        pressTimer = setTimeout(function() {
            toggleFlag(tile);
            longPressHandled = true;
            pressTimer = null;
        }, 500);
    }, { passive: true });

    tile.addEventListener("touchend", function() {
        if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
        }
    });

    tile.addEventListener("touchmove", function() {
        if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
        }
    });

    tile.addEventListener("click", function(event) {
        if (longPressHandled) {
            event.stopImmediatePropagation();
            longPressHandled = false;
        }
    }, true);
}

function clickTile() {
    const tile = this;
    const [r, c] = getCoords(tile);

    if (gameOver) {
        return;
    }

    if (flagEnabled) {
        toggleFlag(tile);
        return;
    }

    if (cellState[r][c] === "flagged") {
        return;
    }

    if (cellState[r][c] === "revealed") {
        chordClick(r, c);
        return;
    }

    if (!minesPlaced) {
        setMines(r, c);
        gameStarted = true;
        startTimer();
    }

    if (minesLocation.includes(tile.id)) {
        gameOver = true;
        stopTimer();
        tile.classList.add("tile-mine-hit");
        revealMines();
        setStatus("Game over!", "lose");
        document.getElementById("new-game").textContent = "☹";
        return;
    }

    checkMine(r, c);
    checkWin();
}

function chordClick(r, c) {
    const tile = board[r][c];
    const number = parseInt(tile.textContent, 10);
    if (!number) {
        return;
    }

    let adjacentFlags = 0;
    for (const [dr, dc] of DIRECTIONS) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < columns && isFlagged(nr, nc)) {
            adjacentFlags += 1;
        }
    }

    if (adjacentFlags !== number) {
        return;
    }

    for (const [dr, dc] of DIRECTIONS) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= columns) {
            continue;
        }
        if (cellState[nr][nc] !== "hidden") {
            continue;
        }

        const neighbor = board[nr][nc];
        if (minesLocation.includes(neighbor.id)) {
            gameOver = true;
            stopTimer();
            neighbor.classList.add("tile-mine-hit");
            revealMines();
            setStatus("Game over!", "lose");
            document.getElementById("new-game").textContent = "☹";
            return;
        }
        checkMine(nr, nc);
    }

    checkWin();
}

function revealMines() {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
            const tile = board[r][c];
            if (minesLocation.includes(tile.id)) {
                tile.textContent = "💣";
                tile.classList.add("tile-clicked");
                if (!tile.classList.contains("tile-mine-hit")) {
                    tile.style.backgroundColor = "red";
                }
            }
        }
    }
}

function countAdjacentMines(r, c) {
    let count = 0;
    for (const [dr, dc] of DIRECTIONS) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < columns && minesLocation.includes(tileId(nr, nc))) {
            count += 1;
        }
    }
    return count;
}

function checkMine(r, c) {
    if (r < 0 || r >= rows || c < 0 || c >= columns) {
        return;
    }
    if (cellState[r][c] !== "hidden") {
        return;
    }

    const tile = board[r][c];
    cellState[r][c] = "revealed";
    tile.classList.add("tile-clicked");
    tilesClicked += 1;
    tile.setAttribute("aria-label", "Row " + (r + 1) + ", Column " + (c + 1) + ", revealed");

    const minesFound = countAdjacentMines(r, c);

    if (minesFound > 0) {
        tile.textContent = minesFound;
        tile.classList.add("x" + minesFound);
        tile.setAttribute("aria-label", "Row " + (r + 1) + ", Column " + (c + 1) + ", " + minesFound + " adjacent mines");
    } else {
        tile.textContent = "";
        for (const [dr, dc] of DIRECTIONS) {
            checkMine(r + dr, c + dc);
        }
    }
}

function checkWin() {
    if (tilesClicked === rows * columns - minesCount) {
        gameOver = true;
        stopTimer();
        updateMinesDisplay();
        setStatus("You win!", "win");
        document.getElementById("new-game").textContent = "😎";
    }
}

function init() {
    document.getElementById("new-game").addEventListener("click", function() {
        document.getElementById("new-game").textContent = "🙂";
        startGame();
    });
    document.getElementById("flag-button").addEventListener("click", setFlagMode);
    document.getElementById("difficulty").addEventListener("change", function() {
        document.getElementById("new-game").textContent = "🙂";
        startGame();
    });
    window.addEventListener("resize", updateBoardLayout);
    startGame();
}

window.onload = init;
