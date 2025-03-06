// Variables globales
let currentDifficulty = 'easy';
let currentSudokuIndex = 0;
let dailySudokus = [];
let timer;
let seconds = 0;
let selectedCell = null;
let dailySeed = '';

// Constantes
const DIFFICULTY_LEVELS = {
    easy: { clues: 35, name: 'Fácil' },
    medium: { clues: 30, name: 'Medio' },
    hard: { clues: 25, name: 'Difícil' }
};

// Inicialización cuando el DOM está listo
document.addEventListener('DOMContentLoaded', () => {
    initializeGame();
    setupEventListeners();
});

// Inicializar el juego
function initializeGame() {
    generateDailySeed();
    generateDailySudokus();
    loadSavedGame();
    displayCurrentSudoku();
    startTimer();
}

// Generar una semilla diaria basada en la fecha
function generateDailySeed() {
    const today = new Date();
    dailySeed = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
}

// Generar 5 sudokus diarios basados en la semilla
function generateDailySudokus() {
    // Usamos la semilla diaria para generar siempre los mismos sudokus en un día específico
    const seededRandom = new Math.seedrandom(dailySeed);
    
    dailySudokus = [];
    for (let i = 0; i < 5; i++) {
        // Generamos un sudoku completo
        const completeSudoku = generateSudoku(seededRandom);
        
        // Creamos versiones con diferentes dificultades
        const sudokuVariants = {};
        for (const difficulty in DIFFICULTY_LEVELS) {
            sudokuVariants[difficulty] = createPuzzleFromSolution(
                completeSudoku, 
                DIFFICULTY_LEVELS[difficulty].clues,
                seededRandom
            );
        }
        
        dailySudokus.push({
            solution: completeSudoku,
            puzzles: sudokuVariants,
            userProgress: {}
        });
    }
}

// Configurar los event listeners
function setupEventListeners() {
    // Event listeners para los botones de dificultad
    document.querySelectorAll('.difficulty-btn').forEach(button => {
        button.addEventListener('click', () => {
            const difficulty = button.getAttribute('data-difficulty');
            changeDifficulty(difficulty);
            
            // Actualizar botones activos
            document.querySelectorAll('.difficulty-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            button.classList.add('active');
        });
    });
    
    // Event listeners para los botones de navegación
    document.getElementById('prev-sudoku').addEventListener('click', () => {
        navigateSudoku(-1);
    });
    
    document.getElementById('next-sudoku').addEventListener('click', () => {
        navigateSudoku(1);
    });
    
    // Event listeners para los botones de control
    document.getElementById('new-game').addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres comenzar un nuevo juego? Se perderá tu progreso actual.')) {
            resetCurrentSudoku();
        }
    });
    
    document.getElementById('check-game').addEventListener('click', () => {
        checkSudoku();
    });
    
    document.getElementById('solve-game').addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres ver la solución? Esto contará como una derrota.')) {
            solveSudoku();
        }
    });
    
    // Event listeners para el teclado numérico
    document.querySelectorAll('.num-btn').forEach(button => {
        button.addEventListener('click', () => {
            if (selectedCell) {
                const num = button.getAttribute('data-num');
                enterNumber(num);
            }
        });
    });
    
    // Event listener para teclas del teclado físico
    document.addEventListener('keydown', (e) => {
        if (selectedCell) {
            if (e.key >= '1' && e.key <= '9') {
                enterNumber(e.key);
            } else if (e.key === '0' || e.key === 'Backspace' || e.key === 'Delete') {
                enterNumber('0');
            }
        }
    });
}

// Cambiar la dificultad actual
function changeDifficulty(difficulty) {
    if (currentDifficulty !== difficulty) {
        currentDifficulty = difficulty;
        saveGameState();
        displayCurrentSudoku();
    }
}

// Navegar entre los sudokus
function navigateSudoku(direction) {
    const newIndex = currentSudokuIndex + direction;
    if (newIndex >= 0 && newIndex < dailySudokus.length) {
        currentSudokuIndex = newIndex;
        saveGameState();
        displayCurrentSudoku();
        updateSudokuCounter();
    }
}

// Actualizar el contador de sudoku
function updateSudokuCounter() {
    document.getElementById('sudoku-counter').textContent = `Sudoku ${currentSudokuIndex + 1} de ${dailySudokus.length}`;
}

// Mostrar el sudoku actual
function displayCurrentSudoku() {
    const board = document.getElementById('sudoku-board');
    board.innerHTML = '';
    
    const currentSudoku = dailySudokus[currentSudokuIndex];
    const puzzle = currentSudoku.puzzles[currentDifficulty];
    const userProgress = currentSudoku.userProgress[currentDifficulty] || Array(9).fill().map(() => Array(9).fill(0));
    
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            const value = puzzle[row][col];
            if (value !== 0) {
                cell.textContent = value;
                cell.classList.add('fixed');
            } else {
                const userValue = userProgress[row][col];
                if (userValue !== 0) {
                    cell.textContent = userValue;
                    cell.classList.add('user-input');
                }
                
                // Añadir event listener para seleccionar la celda
                cell.addEventListener('click', () => {
                    selectCell(cell);
                });
            }
            
            board.appendChild(cell);
        }
    }
    
    updateSudokuCounter();
    clearStatusMessage();
}

// Seleccionar una celda
function selectCell(cell) {
    // Deseleccionar la celda anterior
    if (selectedCell) {
        selectedCell.classList.remove('selected');
    }
    
    // Seleccionar la nueva celda
    selectedCell = cell;
    cell.classList.add('selected');
}

// Introducir un número en la celda seleccionada
function enterNumber(num) {
    if (!selectedCell || selectedCell.classList.contains('fixed')) return;
    
    const row = parseInt(selectedCell.dataset.row);
    const col = parseInt(selectedCell.dataset.col);
    const numValue = parseInt(num);
    
    // Actualizar la celda visualmente
    if (numValue === 0) {
        selectedCell.textContent = '';
        selectedCell.classList.remove('error');
    } else {
        selectedCell.textContent = numValue;
        selectedCell.classList.remove('error'); // Removemos cualquier error previo
    }
    
    // Actualizar el progreso del usuario
    if (!dailySudokus[currentSudokuIndex].userProgress[currentDifficulty]) {
        dailySudokus[currentSudokuIndex].userProgress[currentDifficulty] = Array(9).fill().map(() => Array(9).fill(0));
    }
    dailySudokus[currentSudokuIndex].userProgress[currentDifficulty][row][col] = numValue;
    
    // Guardar el estado del juego
    saveGameState();
    
    // Comprobar si el sudoku está completo
    if (isSudokuComplete()) {
        stopTimer();
        showStatusMessage('¡Felicidades! Has completado el sudoku correctamente.', 'success');
    }
}

// Comprobar si un movimiento es válido según la solución
function isValidMove(solution, row, col, num) {
    return solution[row][col] === num;
}

// Comprobar si el sudoku está completo y correcto
function isSudokuComplete() {
    const currentSudoku = dailySudokus[currentSudokuIndex];
    const userProgress = currentSudoku.userProgress[currentDifficulty];
    
    if (!userProgress) return false;
    
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const puzzle = currentSudoku.puzzles[currentDifficulty][row][col];
            if (puzzle === 0) {
                const userValue = userProgress[row][col];
                if (userValue === 0 || userValue !== currentSudoku.solution[row][col]) {
                    return false;
                }
            }
        }
    }
    
    return true;
}

// Verificar el sudoku actual
function checkSudoku() {
    const currentSudoku = dailySudokus[currentSudokuIndex];
    const userProgress = currentSudoku.userProgress[currentDifficulty];
    
    if (!userProgress) {
        showStatusMessage('No has realizado ningún movimiento aún.', 'error');
        return;
    }
    
    let errors = 0;
    const cells = document.querySelectorAll('.cell');
    
    cells.forEach(cell => {
        if (!cell.classList.contains('fixed') && cell.textContent) {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            const value = parseInt(cell.textContent);
            
            if (value !== currentSudoku.solution[row][col]) {
                cell.classList.add('error');
                errors++;
            } else {
                cell.classList.remove('error');
            }
        }
    });
    
    if (errors === 0) {
        if (isSudokuComplete()) {
            showStatusMessage('¡Felicidades! Has completado el sudoku correctamente.', 'success');
            stopTimer();
        } else {
            showStatusMessage('¡Vas bien! Todos los números introducidos son correctos.', 'success');
        }
    } else {
        showStatusMessage(`Hay ${errors} errores en tu sudoku.`, 'error');
    }
}

// Resolver el sudoku actual
function solveSudoku() {
    const currentSudoku = dailySudokus[currentSudokuIndex];
    const solution = currentSudoku.solution;
    const puzzle = currentSudoku.puzzles[currentDifficulty];
    
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        
        if (puzzle[row][col] === 0) {
            cell.textContent = solution[row][col];
            cell.classList.add('user-input');
            cell.classList.remove('error');
        }
    });
    
    // Actualizar el progreso del usuario con la solución
    if (!currentSudoku.userProgress[currentDifficulty]) {
        currentSudoku.userProgress[currentDifficulty] = Array(9).fill().map(() => Array(9).fill(0));
    }
    
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (puzzle[row][col] === 0) {
                currentSudoku.userProgress[currentDifficulty][row][col] = solution[row][col];
            }
        }
    }
    
    saveGameState();
    showStatusMessage('Sudoku resuelto.', 'success');
    stopTimer();
}

// Reiniciar el sudoku actual
function resetCurrentSudoku() {
    const currentSudoku = dailySudokus[currentSudokuIndex];
    currentSudoku.userProgress[currentDifficulty] = Array(9).fill().map(() => Array(9).fill(0));
    
    saveGameState();
    displayCurrentSudoku();
    resetTimer();
    clearStatusMessage();
}

// Iniciar el temporizador
function startTimer() {
    if (timer) clearInterval(timer);
    
    timer = setInterval(() => {
        seconds++;
        updateTimerDisplay();
    }, 1000);
}

// Detener el temporizador
function stopTimer() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
}

// Reiniciar el temporizador
function resetTimer() {
    stopTimer();
    seconds = 0;
    updateTimerDisplay();
    startTimer();
}

// Actualizar la visualización del temporizador
function updateTimerDisplay() {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    const formattedTime = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    document.getElementById('timer').textContent = formattedTime;
}

function showStatusMessage(message, type) {
    const statusElement = document.getElementById('status-message');
    statusElement.textContent = message;
    statusElement.className = 'status-message ' + type;
}

function clearStatusMessage() {
    const statusElement = document.getElementById('status-message');
    statusElement.textContent = '';
    statusElement.className = 'status-message';
}

function saveGameState() {
    const gameState = {
        currentDifficulty,
        currentSudokuIndex,
        dailySudokus,
        seconds
    };
    localStorage.setItem('sudokuGameState', JSON.stringify(gameState));
}

function loadSavedGame() {
    const savedState = localStorage.getItem('sudokuGameState');
    if (savedState) {
        const gameState = JSON.parse(savedState);
        currentDifficulty = gameState.currentDifficulty;
        currentSudokuIndex = gameState.currentSudokuIndex;
        dailySudokus = gameState.dailySudokus;
        seconds = gameState.seconds;
        updateTimerDisplay();
    }
}

// Generar un sudoku completo y válido
function generateSudoku(seededRandom) {
    const grid = Array(9).fill().map(() => Array(9).fill(0));
    fillSudoku(grid, 0, 0, seededRandom);
    return grid;
}

// Función recursiva para llenar el sudoku
function fillSudoku(grid, row, col, seededRandom) {
    if (col === 9) {
        row++;
        col = 0;
    }
    if (row === 9) return true;

    if (grid[row][col] !== 0) {
        return fillSudoku(grid, row, col + 1, seededRandom);
    }

    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    shuffleArray(numbers, seededRandom);

    for (const num of numbers) {
        if (isNumberValid(grid, row, col, num)) {
            grid[row][col] = num;
            if (fillSudoku(grid, row, col + 1, seededRandom)) {
                return true;
            }
            grid[row][col] = 0;
        }
    }
    return false;
}

// Verificar si un número es válido en una posición
function isNumberValid(grid, row, col, num) {
    // Verificar fila
    for (let x = 0; x < 9; x++) {
        if (grid[row][x] === num) return false;
    }

    // Verificar columna
    for (let y = 0; y < 9; y++) {
        if (grid[y][col] === num) return false;
    }

    // Verificar cuadrante 3x3
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (grid[startRow + i][startCol + j] === num) return false;
        }
    }

    return true;
}

// Crear un puzzle a partir de una solución completa
function createPuzzleFromSolution(solution, numClues, seededRandom) {
    const puzzle = solution.map(row => [...row]);
    const positions = [];
    
    // Crear lista de todas las posiciones
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            positions.push([i, j]);
        }
    }
    
    // Mezclar las posiciones
    shuffleArray(positions, seededRandom);
    
    // Eliminar números hasta dejar solo las pistas necesarias
    const cellsToRemove = 81 - numClues;
    for (let i = 0; i < cellsToRemove; i++) {
        const [row, col] = positions[i];
        puzzle[row][col] = 0;
    }
    
    return puzzle;
}

// Función auxiliar para mezclar un array
function shuffleArray(array, seededRandom) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(seededRandom() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}