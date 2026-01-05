import React, { useState } from 'react';
import SetupScreen from './components/SetupScreen';
import LocalGameScreen from './components/LocalGameScreen';
import OnlineGameScreen from './components/OnlineGameScreen';
import ResultsScreen from './components/ResultsScreen';
import { getAllSongs } from './data/songs';

const GameMode = {
  LOCAL: 'LOCAL',
  ONLINE: 'ONLINE'
};

const PlaybackPosition = {
  RANDOM: 'RANDOM',
  START: 'START'
};

// 随机emoji列表
const EMOJI_LIST = ['😀', '😎', '🤠', '🥳', '🤓', '😺', '🐶', '🐼', '🦁', '🐯', '🦊', '🐻', '🐨', '🐮', '🐷', '🐸', '🐵', '🦄', '🐲', '🦖'];

// 获取随机emoji
const getRandomEmoji = () => {
  return EMOJI_LIST[Math.floor(Math.random() * EMOJI_LIST.length)];
};

const App = () => {
  const [screen, setScreen] = useState('setup');
  
  const [settings, setSettings] = useState({
    mode: GameMode.LOCAL,
    selectedArtistIds: ['1'],
    durationSeconds: 15,
    isFullSong: false,
    playbackPosition: PlaybackPosition.RANDOM,
    questionCount: 5,
    timeLimit: 30,
    playerCount: 1,
  });

  const [gameSongs, setGameSongs] = useState([]);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [players, setPlayers] = useState([]);

  const prepareSongs = () => {
    const allSongs = getAllSongs();
    const filteredSongs = allSongs.filter(s => settings.selectedArtistIds.includes(s.artistId));
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
        avatar: getRandomEmoji(),
        score: 0,
        isCurrentUser: true
      }]);
    } else {
      setPlayers([
        { id: 'me', name: '我 (房主)', avatar: getRandomEmoji(), score: 0, isCurrentUser: true }
      ]);
    }

    setScreen('game');
  };

  const handleJoinGame = (roomId) => {
    const shuffled = prepareSongs(); 
    if (!shuffled) return;

    setGameSongs(shuffled);
    setCurrentSongIndex(0);
    setSettings(prev => ({ ...prev, mode: GameMode.ONLINE }));

    setPlayers([
      { id: 'host', name: '房主', avatar: getRandomEmoji(), score: 0, isCurrentUser: false },
      { id: 'me', name: '我', avatar: getRandomEmoji(), score: 0, isCurrentUser: true }
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
      {/* Mobile Container Simulator */}
      <div className="w-full max-w-md h-full bg-white shadow-2xl overflow-hidden relative sm:rounded-[2.5rem] sm:h-[92vh] sm:border-8 sm:border-slate-100 ring-1 ring-slate-900/5">
        
        {screen === 'setup' && (
          <SetupScreen 
            settings={settings} 
            setSettings={setSettings} 
            onStart={handleStartGame}
            onJoin={handleJoinGame}
            GameMode={GameMode}
            PlaybackPosition={PlaybackPosition}
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
