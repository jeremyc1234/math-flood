"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from './components/ui/card';
import { Button } from './components/ui/button';
import { evaluate } from 'mathjs';

const BOARD_SIZE = 5;
const INITIAL_SPAWN_INTERVAL = 2000;
const SPEED_INCREASE_RATE = 0.98;
const MIN_SPAWN_INTERVAL = 500;

const NUMBERS = ['1','2','3','4','5','6','7','8','9'];
const OPERATORS = ['+', '-', '*', '/'];
const BIG_OPERATORS = ['+', '*']; // Bigger operations
const SMALL_OPERATORS = ['-', '/']; // Smaller operations

const GameOverModal = ({ score, onRestart }) => {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div className="bg-white p-6 rounded shadow-xl text-center">
          <h2 className="text-2xl font-bold mb-4">Game Over!</h2>
          <p className="text-lg mb-4">Your score is: {score}</p>
          <Button 
            onClick={onRestart}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2"
          >
            Play Again
          </Button>
        </div>
      </div>
    );
  };

const MathFloodGame = () => {
  const [board, setBoard] = useState(Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill('')));
  const [selectedCells, setSelectedCells] = useState([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [currentExpression, setCurrentExpression] = useState('');
  const [spawnInterval, setSpawnInterval] = useState(INITIAL_SPAWN_INTERVAL);
  const [emptyCells, setEmptyCells] = useState([]);
  const [targetNumber, setTargetNumber] = useState(null);
  const [shakingCells, setShakingCells] = useState([]);
  useEffect(() => {
    if (shakingCells.length > 0) {
      const timer = setTimeout(() => {
        setShakingCells([]);
      }, 500); // shake duration
      return () => clearTimeout(timer);
    }
  }, [shakingCells]);
  useEffect(() => {
    const cells = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        cells.push({ row, col });
      }
    }
    setEmptyCells(cells);
    generateNewTarget();
  }, []);
  const getProximityColor = (result) => {
    if (result === null || targetNumber === null) return 'text-gray-500'; // Neutral color if result is invalid or target is missing
    const difference = Math.abs(result - targetNumber);
  
    if (difference <= 2) return 'text-green-500'; // Very close
    if (difference <= 10) return 'text-yellow-500'; // Close
    return 'text-red-500'; // Far
  };

  const generateNewTarget = () => {
    // Generate a number between 10 and 99 (two digits)
    const newTarget = Math.floor(Math.random() * 41) + 10;
    setTargetNumber(newTarget);
  };

  const clearExpression = () => {
    setSelectedCells([]);
    setCurrentExpression('');
  };

  const getRandomElement = () => {
    
    const roll = Math.random();
    // 2/3 probability for numbers, 1/3 for operators
    if (roll < 0.6667) {
        return NUMBERS[Math.floor(Math.random() * NUMBERS.length)];
      } else if (roll < 0.8333) {
        return BIG_OPERATORS[Math.floor(Math.random() * BIG_OPERATORS.length)];
      } else {
        return SMALL_OPERATORS[Math.floor(Math.random() * SMALL_OPERATORS.length)];
      }
  };

  const addNewElement = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * emptyCells.length);
  const { row, col } = emptyCells[randomIndex];

  setBoard(prev => {
    const newBoard = prev.map(row => [...row]);
    newBoard[row][col] = getRandomElement();
    return newBoard;
  });

  setEmptyCells(prev => prev.filter((_, index) => index !== randomIndex));
  setSpawnInterval(prev => Math.max(prev * SPEED_INCREASE_RATE, MIN_SPAWN_INTERVAL));
}, [emptyCells]);

useEffect(() => {
    // If no empty cells, the board is completely full → game over
    if (emptyCells.length === 0) {
      setGameOver(true);
    }
  }, [emptyCells]);

  useEffect(() => {
    if (!gameOver && emptyCells.length > 0) {
      const timer = setInterval(addNewElement, spawnInterval);
      return () => clearInterval(timer);
    }
  }, [addNewElement, gameOver, spawnInterval, emptyCells.length]);

  const handleCellClick = (row, col) => {
    if (gameOver || board[row][col] === '') return;
  
    const isAlreadySelected = selectedCells.some(cell =>
      cell.row === row && cell.col === col
    );
  
    if (isAlreadySelected) {
      const cellIndex = selectedCells.findIndex(cell =>
        cell.row === row && cell.col === col
      );
      setSelectedCells(prev => prev.slice(0, cellIndex));
      setCurrentExpression(prev => {
        const charIndex = selectedCells.findIndex(cell =>
          cell.row === row && cell.col === col
        );
        return prev.slice(0, charIndex);
      });
      return;
    }
  
    const currentValue = board[row][col];
    const isCurrentOperator = OPERATORS.includes(currentValue);
  
    // 1) If this is the FIRST selection and it's an operator → shake instead of message
    if (selectedCells.length === 0 && isCurrentOperator) {
      setShakingCells([{ row, col }]);
      return;
    }
  
    // 2) If last selected is also an operator (or last was a number and this is a number)
    if (selectedCells.length > 0) {
      const lastCell = selectedCells[selectedCells.length - 1];
      const lastValue = board[lastCell.row][lastCell.col];
      const isLastOperator = OPERATORS.includes(lastValue);
  
      // Both operators OR both numbers → shake instead of message
      if ((isCurrentOperator && isLastOperator) ||
          (!isCurrentOperator && !isLastOperator)) {
        setShakingCells([{ row, col }]);
        return;
      }
    }
  
    // Append currentValue to expression
    const newExpression = currentExpression + board[row][col];
    setSelectedCells(prev => [...prev, { row, col }]);
    setCurrentExpression(newExpression);
  
    // Evaluate after adding the new character
    const result = validateAndEvaluateExpression(newExpression);
    if (result === targetNumber) {
      const points = selectedCells.length * 10 + 10; // +10 for this new cell
      setScore(score + points);
  
      // Clear those cells from the board
      const newBoard = board.map(row => [...row]);
      [...selectedCells, { row, col }].forEach(({ row, col }) => {
        newBoard[row][col] = '';
      });
      setBoard(newBoard);
  
      // Mark them as empty cells
      const newEmptyCells = [...emptyCells];
      [...selectedCells, { row, col }].forEach(({ row, col }) => {
        newEmptyCells.push({ row, col });
      });
      setEmptyCells(newEmptyCells);
  
      setSelectedCells([]);
      setCurrentExpression('');
      generateNewTarget();
    } 
  };

  const validateAndEvaluateExpression = (expr) => {
    try {
      const cleanExpr = expr.replace(/[+\-*/]$/, '');

      if (!/\d+[+\-*/]\d+/.test(cleanExpr)) {
        return null;
      }

      const result = evaluate(cleanExpr);

      if (!Number.isInteger(result)) {
        return null;
      }

      return result;
    } catch (error) {
      return null;
    }
  };

  const resetGame = () => {
    setBoard(Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill('')));
    setScore(0);
    setGameOver(false);
    setSelectedCells([]);
    setCurrentExpression('');
    setSpawnInterval(INITIAL_SPAWN_INTERVAL);
    generateNewTarget();

    const cells = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        cells.push({ row, col });
      }
    }
    setEmptyCells(cells);
  };

  return (
        <>
    {gameOver && (
      <GameOverModal
        score={score}
        onRestart={resetGame}
      />
    )}
    <Card className="p-6 max-w-2xl mx-auto">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold mb-2">Math Flood</h2>
        <div className="text-lg font-bold text-blue-600 mb-4">Target: {targetNumber}</div>
        <div className="flex justify-between items-center mb-4">
          <div className="text-lg">Score: {score}</div>
          <div className="flex items-center gap-2 text-lg">
  <span>Expression: {currentExpression}</span>
  {currentExpression && (
    <span className="flex items-center gap-1">
      <span>=</span>
      <span
        className={`${getProximityColor(validateAndEvaluateExpression(currentExpression))} font-bold`}
      >
        {validateAndEvaluateExpression(currentExpression)}
      </span>
    </span>
  )}
</div>
        </div>
      </div>

      <div className="bg-gray-100 rounded-xl p-6 mb-4">
        <div className="grid gap-2">
          {board.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-2 justify-center">
              {row.map((element, colIndex) => {
                const isSelected = selectedCells.some(
                  cell => cell.row === rowIndex && cell.col === colIndex
                );
                const isOperator = [...BIG_OPERATORS, ...SMALL_OPERATORS].includes(element);
                const isShaking = shakingCells.some(
                    cell => cell.row === rowIndex && cell.col === colIndex
                  );
                return (
                    <Button
                    key={`${rowIndex}-${colIndex}`}
                    className={`
                      w-12 h-12 text-lg font-bold transition-colors duration-200
                      ${isSelected
                        ? 'bg-blue-500 hover:bg-blue-600 text-white transform scale-105'
                        : element
                          ? (isOperator
                              ? 'bg-orange-500 text-white hover:bg-orange-600'
                              : 'bg-gray-200 text-black hover:bg-gray-300'
                            )
                          : 'bg-gray-200'
                      }
                      ${isShaking ? 'animate-shake' : ''}
                    `}
                    onClick={() => handleCellClick(rowIndex, colIndex)}
                    disabled={!element}
                  >
                    {element}
                  </Button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-4 justify-center">
        <Button 
          onClick={clearExpression}
          className="bg-gray-500 hover:bg-gray-600 text-white"
        >
          Clear Expression
        </Button>
        <Button 
          onClick={resetGame}
          className="bg-red-500 hover:bg-red-600 text-white"
        >
          {gameOver ? 'Play Again' : 'Reset Game'}
        </Button>
      </div>

      {gameOver && (
        <div className="text-center mt-4 text-xl font-bold">
          Game Over! Final Score: {score}
        </div>
      )}
    </Card>
  </>
  );
};

export default MathFloodGame;