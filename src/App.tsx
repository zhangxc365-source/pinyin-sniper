/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { Screen, GameSettings, GameMode, PlayerStats, Language, FeedbackData, ChallengeMode } from './types';
import StartScreen from './screens/StartScreen';
import LevelSelectScreen from './screens/LevelSelectScreen';
import PrepScreen from './screens/PrepScreen';
import InstructionScreen from './screens/InstructionScreen';
import GameScreen from './screens/GameScreen';
import PKGameScreen from './screens/PKGameScreen';
import ResultScreen from './screens/ResultScreen';
import { motion, AnimatePresence } from 'motion/react';

const initialStats = (): PlayerStats => ({
  score: 0,
  health: 3,
  correctAnswers: 0,
  wrongAnswers: 0,
  missedAnswers: 0,
  accuracy: 0,
  inventory: { hints: 1, scopes: 0, iceGuns: 0 },
  consecutiveCorrect: 0
});

export default function App() {
  const [screen, setScreen] = useState<Screen>('START');
  const [settings, setSettings] = useState<GameSettings>({
    level: 1,
    lesson: 1,
    mode: 'SOLO',
    language: 'en',
    challengeMode: 'CHAR'
  });
  const [player1Stats, setPlayer1Stats] = useState<PlayerStats>(initialStats());
  const [player2Stats, setPlayer2Stats] = useState<PlayerStats>(initialStats());
  const [feedback, setFeedback] = useState<FeedbackData[]>([]);

  const handleStartGame = (mode: GameMode) => {
    setSettings(prev => ({ ...prev, mode }));
    setScreen('LEVEL_SELECT');
  };

  const handleSelectLevel = (level: number, lesson: number, challengeMode: ChallengeMode) => {
    setSettings(prev => ({ ...prev, level, lesson, challengeMode }));
    setScreen('PREP');
  };

  const handleLevelFinished = (stats1: PlayerStats, stats2?: PlayerStats, gameFeedback?: FeedbackData[]) => {
    setPlayer1Stats(stats1);
    if (stats2) setPlayer2Stats(stats2);
    if (gameFeedback) setFeedback(gameFeedback);
    setScreen('RESULT');
  };

  const resetGame = () => {
    setPlayer1Stats(initialStats());
    setPlayer2Stats(initialStats());
    setFeedback([]);
    setScreen('START');
  };

  const restartLevel = () => {
    setPlayer1Stats(initialStats());
    setPlayer2Stats(initialStats());
    setFeedback([]);
    setScreen('PREP');
  };

  return (
    <div className="min-h-screen bg-sky-100 font-sans overflow-hidden select-none">
      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="w-full h-full min-h-screen"
        >
          {screen === 'START' && (
            <StartScreen 
              onStart={handleStartGame} 
              onShowInst={() => setScreen('INSTRUCTION')} 
            />
          )}
          {screen === 'INSTRUCTION' && (
            <InstructionScreen onBack={() => setScreen('START')} />
          )}
          {screen === 'LEVEL_SELECT' && (
            <LevelSelectScreen 
              onSelect={handleSelectLevel} 
              onBack={() => setScreen('START')} 
            />
          )}
          {screen === 'PREP' && (
            <PrepScreen 
              settings={settings} 
              onStart={() => setScreen(settings.mode === 'SOLO' ? 'GAME' : 'PK')} 
              onBack={() => setScreen('LEVEL_SELECT')} 
            />
          )}
          {screen === 'GAME' && (
            <GameScreen 
              settings={settings} 
              onFinish={handleLevelFinished} 
              onPause={() => {}} // Handle internal pause
              onHome={resetGame}
            />
          )}
          {screen === 'PK' && (
            <PKGameScreen 
              settings={settings} 
              onFinish={handleLevelFinished}
              onHome={resetGame}
            />
          )}
          {screen === 'RESULT' && (
            <ResultScreen 
              settings={settings}
              stats1={player1Stats}
              stats2={settings.mode === 'PK' ? player2Stats : undefined}
              feedback={feedback}
              onHome={resetGame}
              onRestart={restartLevel}
              onNext={() => {
                const nextLesson = settings.lesson < 12 ? settings.lesson + 1 : 1;
                const nextLevel = settings.lesson === 12 ? (settings.level < 6 ? settings.level + 1 : 1) : settings.level;
                handleSelectLevel(nextLevel, nextLesson, settings.challengeMode);
              }}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

