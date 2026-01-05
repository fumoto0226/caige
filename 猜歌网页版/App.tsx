import React, { useState, useEffect } from 'react';
import SetupScreen from './components/SetupScreen';
import LocalGameScreen from './components/LocalGameScreen';
import OnlineGameScreen from './components/OnlineGameScreen';
import ResultsScreen from './components/ResultsScreen';
import { GameMode, GameSettings, PlaybackPosition, Player, ScreenState, Song } from './types';
import { SONGS } from './constants';

const App: React.FC = () => {
  const [screen, setScreen] = useState<ScreenState>('setup');
  
  // Settings State
  const [settings, setSettings] = useState<GameSettings>({
    mode: GameMode.LOCAL,
    selectedArtistIds: ['1'],
    durationSeconds: 15,
    isFullSong: false,
    playbackPosition: PlaybackPosition.RANDOM,
    questionCount: 5,
    timeLimit: 30,
    playerCount: 1,
  });

  // Game Data State
  const [gameSongs, setGameSongs] = useState<Song[]>([]);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [players, setPlayers] = useState<Player[]>([]);

  const prepareSongs = () => {
    const filteredSongs = SONGS.filter(s => settings.selectedArtistIds.includes(s.artistId));
    const shuffled = [...filteredSongs].sort(() => 0.5 - Math.random()).slice(0, settings.questionCount);
    
    if (shuffled.length === 0) {
      alert("所选歌手没有找到歌曲！");
      return null;
    }
    return shuffled;
  };

  const handleStartGame = () => {
    const shuffled = prepareSongs();
    if (!shuffled) return;

    setGameSongs(shuffled);
    setCurrentSongIndex(0);

    if (settings.mode === GameMode.LOCAL) {
      setPlayers([{
        id: 'p1',
        name: '玩家 1',
        avatar: `https://picsum.photos/seed/p1/100/100`,
        score: 0,
        isCurrentUser: true
      }]);
    } else {
      setPlayers([
        { id: 'me', name: '我 (房主)', avatar: 'https://picsum.photos/seed/me/100/100', score: 0, isCurrentUser: true }
      ]);
    }

    setScreen('game');
  };

  const handleJoinGame = (roomId: string) => {
    const shuffled = prepareSongs(); 
    if (!shuffled) return;

    setGameSongs(shuffled);
    setCurrentSongIndex(0);
    setSettings(prev => ({ ...prev, mode: GameMode.ONLINE }));

    setPlayers([
      { id: 'host', name: '房主', avatar: 'https://picsum.photos/seed/host/100/100', score: 0, isCurrentUser: false },
      { id: 'me', name: '我', avatar: 'https://picsum.photos/seed/me_join/100/100', score: 0, isCurrentUser: true }
    ]);

    setScreen('game');
  };

  const handleNextSong = () => {
    if (currentSongIndex < gameSongs.length - 1) {
      setCurrentSongIndex(prev => prev + 1);
    } else {
      setScreen('results');
    }
  };

  const handleEndGame = () => {
    setScreen('results');
  };

  const handleRestart = () => {
    setPlayers(prev => prev.map(p => ({ ...p, score: 0 })));
    const shuffled = prepareSongs();
    if (shuffled) {
      setGameSongs(shuffled);
      setCurrentSongIndex(0);
      setScreen('game');
    }
  };

  const handleHome = () => {
    setScreen('setup');
  };

  return (
    <div className="w-full h-screen bg-slate-50 flex justify-center items-center font-sans">
      {/* Mobile Container Simulator - Updated styling for softer look */}
      <div className="w-full max-w-md h-full bg-white shadow-2xl overflow-hidden relative sm:rounded-[2.5rem] sm:h-[92vh] sm:border-8 sm:border-slate-100 ring-1 ring-slate-900/5">
        
        {screen === 'setup' && (
          <SetupScreen 
            settings={settings} 
            setSettings={setSettings} 
            onStart={handleStartGame}
            onJoin={handleJoinGame}
            maxSongs={SONGS.length}
          />
        )}

        {screen === 'game' && settings.mode === GameMode.LOCAL && (
          <LocalGameScreen
            settings={settings}
            players={players}
            setPlayers={setPlayers}
            currentSong={gameSongs[currentSongIndex]}
            songIndex={currentSongIndex}
            totalSongs={gameSongs.length}
            onNextSong={handleNextSong}
            onEndGame={handleEndGame}
          />
        )}

        {screen === 'game' && settings.mode === GameMode.ONLINE && (
          <OnlineGameScreen
            settings={settings}
            players={players}
            setPlayers={setPlayers}
            currentSong={gameSongs[currentSongIndex]}
            songIndex={currentSongIndex}
            totalSongs={gameSongs.length}
            onNextSong={handleNextSong}
            onEndGame={handleEndGame}
          />
        )}

        {screen === 'results' && (
          <ResultsScreen 
            players={players}
            onRestart={handleRestart}
            onHome={handleHome}
          />
        )}

      </div>
    </div>
  );
};

export default App;
