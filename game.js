class Game2048 {
    constructor() {
        this.size = 4;
        this.grid = [];
        this.score = 0;
        this.bestScore = parseInt(localStorage.getItem('bestScore')) || 0;
        this.history = [];
        this.gameOver = false;
        this.won = false;
        this.keepPlaying = false;

        this.tileContainer = document.getElementById('tile-container');
        this.scoreElement = document.getElementById('score');
        this.bestScoreElement = document.getElementById('best-score');
        this.gameMessage = document.getElementById('game-message');
        this.messageText = document.getElementById('message-text');
        this.undoButton = document.getElementById('undo');
        this.undoOverlayButton = document.getElementById('undo-overlay');
        this.undoCount = document.getElementById('undo-count');
        this.newGameButton = document.getElementById('new-game');
        this.tryAgainButton = document.getElementById('try-again');
        this.keepPlayingButton = document.getElementById('keep-playing');
        this.gameContainer = document.getElementById('game-container');

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateBestScore();
        this.newGame();
    }

    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));

        // Button controls
        this.newGameButton.addEventListener('click', () => this.newGame());
        this.tryAgainButton.addEventListener('click', () => this.newGame());
        this.keepPlayingButton.addEventListener('click', () => this.continueGame());
        this.undoButton.addEventListener('click', () => this.undo());
        this.undoOverlayButton.addEventListener('click', () => this.undo());

        // Touch controls
        this.setupTouchControls();
    }

    setupTouchControls() {
        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let touchEndY = 0;
        const minSwipeDistance = 30;

        const handleTouchStart = (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        };

        const handleTouchMove = (e) => {
            e.preventDefault();
            touchEndX = e.touches[0].clientX;
            touchEndY = e.touches[0].clientY;
        };

        const handleTouchEnd = () => {
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            const absDeltaX = Math.abs(deltaX);
            const absDeltaY = Math.abs(deltaY);

            if (Math.max(absDeltaX, absDeltaY) < minSwipeDistance) return;

            if (absDeltaX > absDeltaY) {
                // Horizontal swipe
                if (deltaX > 0) {
                    this.move('right');
                } else {
                    this.move('left');
                }
            } else {
                // Vertical swipe
                if (deltaY > 0) {
                    this.move('down');
                } else {
                    this.move('up');
                }
            }
        };

        this.gameContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
        this.gameContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
        this.gameContainer.addEventListener('touchend', handleTouchEnd, { passive: true });
    }

    handleKeyDown(e) {
        // Allow undo even when game is over
        if ((e.ctrlKey || e.metaKey || e.altKey) && e.key === 'z') {
            e.preventDefault();
            this.undo();
            return;
        }

        if (this.gameOver && !this.keepPlaying) return;

        const keyMap = {
            'ArrowUp': 'up',
            'ArrowDown': 'down',
            'ArrowLeft': 'left',
            'ArrowRight': 'right',
            'w': 'up',
            's': 'down',
            'a': 'left',
            'd': 'right'
        };

        const direction = keyMap[e.key];
        if (direction) {
            e.preventDefault();
            this.move(direction);
        }
    }

    newGame() {
        this.grid = this.createEmptyGrid();
        this.score = 0;
        this.history = [];
        this.gameOver = false;
        this.won = false;
        this.keepPlaying = false;

        this.hideMessage();
        this.updateScore();
        this.updateUndoButton();
        this.clearTiles();

        this.addRandomTile();
        this.addRandomTile();
        this.renderGrid();
    }

    createEmptyGrid() {
        return Array(this.size).fill(null).map(() => Array(this.size).fill(0));
    }

    saveState() {
        this.history.push({
            grid: this.grid.map(row => [...row]),
            score: this.score
        });
        this.updateUndoButton();
    }

    undo() {
        if (this.history.length === 0) return;

        const previousState = this.history.pop();
        this.grid = previousState.grid;
        this.score = previousState.score;
        this.gameOver = false;

        this.hideMessage();
        this.updateScore();
        this.updateUndoButton();
        this.renderGrid();
    }

    updateUndoButton() {
        const count = this.history.length;
        this.undoButton.disabled = count === 0;
        this.undoCount.textContent = count > 0 ? count : '';
    }

    addRandomTile() {
        const emptyCells = [];
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (this.grid[row][col] === 0) {
                    emptyCells.push({ row, col });
                }
            }
        }

        if (emptyCells.length > 0) {
            const { row, col } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            this.grid[row][col] = Math.random() < 0.9 ? 2 : 4;
            return { row, col, value: this.grid[row][col] };
        }
        return null;
    }

    move(direction) {
        if (this.gameOver && !this.keepPlaying) return;

        const previousGrid = this.grid.map(row => [...row]);
        const previousScore = this.score;

        let moved = false;
        let mergedPositions = [];

        switch (direction) {
            case 'up':
                ({ moved, mergedPositions } = this.moveUp());
                break;
            case 'down':
                ({ moved, mergedPositions } = this.moveDown());
                break;
            case 'left':
                ({ moved, mergedPositions } = this.moveLeft());
                break;
            case 'right':
                ({ moved, mergedPositions } = this.moveRight());
                break;
        }

        if (moved) {
            // Save state before adding new tile
            this.history.push({
                grid: previousGrid,
                score: previousScore
            });
            this.updateUndoButton();

            const newTile = this.addRandomTile();
            this.renderGrid(newTile, mergedPositions);
            this.updateScore();

            if (this.checkWin() && !this.won && !this.keepPlaying) {
                this.won = true;
                this.showMessage('You Win!', true);
            } else if (this.checkGameOver()) {
                this.gameOver = true;
                this.showMessage('Game Over!', false);
            }
        }
    }

    moveLeft() {
        let moved = false;
        let mergedPositions = [];

        for (let row = 0; row < this.size; row++) {
            const result = this.slideAndMerge(this.grid[row]);
            if (result.moved) moved = true;
            this.grid[row] = result.line;
            result.mergedIndices.forEach(col => {
                mergedPositions.push({ row, col });
            });
        }

        return { moved, mergedPositions };
    }

    moveRight() {
        let moved = false;
        let mergedPositions = [];

        for (let row = 0; row < this.size; row++) {
            const reversed = [...this.grid[row]].reverse();
            const result = this.slideAndMerge(reversed);
            if (result.moved) moved = true;
            this.grid[row] = result.line.reverse();
            result.mergedIndices.forEach(idx => {
                mergedPositions.push({ row, col: this.size - 1 - idx });
            });
        }

        return { moved, mergedPositions };
    }

    moveUp() {
        let moved = false;
        let mergedPositions = [];

        for (let col = 0; col < this.size; col++) {
            const column = this.grid.map(row => row[col]);
            const result = this.slideAndMerge(column);
            if (result.moved) moved = true;
            for (let row = 0; row < this.size; row++) {
                this.grid[row][col] = result.line[row];
            }
            result.mergedIndices.forEach(row => {
                mergedPositions.push({ row, col });
            });
        }

        return { moved, mergedPositions };
    }

    moveDown() {
        let moved = false;
        let mergedPositions = [];

        for (let col = 0; col < this.size; col++) {
            const column = this.grid.map(row => row[col]).reverse();
            const result = this.slideAndMerge(column);
            if (result.moved) moved = true;
            const reversedLine = result.line.reverse();
            for (let row = 0; row < this.size; row++) {
                this.grid[row][col] = reversedLine[row];
            }
            result.mergedIndices.forEach(idx => {
                mergedPositions.push({ row: this.size - 1 - idx, col });
            });
        }

        return { moved, mergedPositions };
    }

    slideAndMerge(line) {
        const original = [...line];
        let mergedIndices = [];

        // Remove zeros
        let filtered = line.filter(val => val !== 0);

        // Merge adjacent equal values
        for (let i = 0; i < filtered.length - 1; i++) {
            if (filtered[i] === filtered[i + 1]) {
                filtered[i] *= 2;
                this.score += filtered[i];
                filtered[i + 1] = 0;
                mergedIndices.push(i);
            }
        }

        // Remove zeros again after merging
        filtered = filtered.filter(val => val !== 0);

        // Pad with zeros
        while (filtered.length < this.size) {
            filtered.push(0);
        }

        // Check if moved
        const moved = !original.every((val, idx) => val === filtered[idx]);

        return { line: filtered, moved, mergedIndices };
    }

    checkWin() {
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (this.grid[row][col] === 2048) {
                    return true;
                }
            }
        }
        return false;
    }

    checkGameOver() {
        // Check for empty cells
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (this.grid[row][col] === 0) {
                    return false;
                }
            }
        }

        // Check for possible merges
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                const current = this.grid[row][col];
                // Check right
                if (col < this.size - 1 && this.grid[row][col + 1] === current) {
                    return false;
                }
                // Check down
                if (row < this.size - 1 && this.grid[row + 1][col] === current) {
                    return false;
                }
            }
        }

        return true;
    }

    clearTiles() {
        this.tileContainer.innerHTML = '';
    }

    renderGrid(newTile = null, mergedPositions = []) {
        this.clearTiles();

        const cellSize = this.getCellSize();
        const gap = this.getGap();

        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                const value = this.grid[row][col];
                if (value !== 0) {
                    const tile = document.createElement('div');
                    tile.className = `tile tile-${value > 2048 ? 'super' : value}`;

                    // Check if this is a new tile
                    if (newTile && newTile.row === row && newTile.col === col) {
                        tile.classList.add('tile-new');
                    }

                    // Check if this tile was merged
                    if (mergedPositions.some(pos => pos.row === row && pos.col === col)) {
                        tile.classList.add('tile-merged');
                    }

                    tile.style.left = `${col * (cellSize + gap)}px`;
                    tile.style.top = `${row * (cellSize + gap)}px`;
                    tile.style.width = `${cellSize}px`;
                    tile.style.height = `${cellSize}px`;
                    tile.textContent = value;

                    this.tileContainer.appendChild(tile);
                }
            }
        }
    }

    getCellSize() {
        const style = getComputedStyle(document.documentElement);
        const cellSizeStr = style.getPropertyValue('--cell-size').trim();
        
        // If it's a calc expression, compute it
        if (cellSizeStr.includes('calc')) {
            const gridBg = document.querySelector('.grid-cell');
            if (gridBg) {
                return gridBg.offsetWidth;
            }
        }
        
        return parseFloat(cellSizeStr) || 100;
    }

    getGap() {
        const style = getComputedStyle(document.documentElement);
        return parseFloat(style.getPropertyValue('--cell-gap')) || 12;
    }

    updateScore() {
        const previousScore = parseInt(this.scoreElement.textContent);
        const scoreDiff = this.score - previousScore;

        this.scoreElement.textContent = this.score;

        if (scoreDiff > 0) {
            this.showScoreAddition(scoreDiff);
        }

        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('bestScore', this.bestScore);
            this.updateBestScore();
        }
    }

    showScoreAddition(value) {
        const scoreBox = this.scoreElement.parentElement;
        const addition = document.createElement('div');
        addition.className = 'score-addition';
        addition.textContent = `+${value}`;
        
        const rect = scoreBox.getBoundingClientRect();
        addition.style.left = `${rect.left + rect.width / 2}px`;
        addition.style.top = `${rect.top}px`;
        
        document.body.appendChild(addition);
        
        setTimeout(() => {
            addition.remove();
        }, 800);
    }

    updateBestScore() {
        this.bestScoreElement.textContent = this.bestScore;
    }

    showMessage(text, isWin) {
        this.messageText.textContent = text;
        this.gameMessage.classList.add('active');
        
        if (isWin) {
            this.gameMessage.classList.add('game-won');
            this.keepPlayingButton.style.display = 'block';
        } else {
            this.gameMessage.classList.remove('game-won');
            this.keepPlayingButton.style.display = 'none';
        }
    }

    hideMessage() {
        this.gameMessage.classList.remove('active', 'game-won');
    }

    continueGame() {
        this.keepPlaying = true;
        this.hideMessage();
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new Game2048();
});
