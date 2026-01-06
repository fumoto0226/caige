import React, { useState, useEffect } from 'react';
import SetupScreen from './components/SetupScreen';
import LocalGameScreen from './components/LocalGameScreen';
import OnlineGameScreen from './components/OnlineGameScreen';
import ResultsScreen from './components/ResultsScreen';
import UsernameModal from './components/UsernameModal';
import { getAllSongs } from './data/songs';
import { createRoom, joinRoom, leaveRoom, subscribeToRoom } from './utils/roomManager';

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
  
  // 线上游戏相关状态
  const [currentRoomId, setCurrentRoomId] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [roomUnsubscribe, setRoomUnsubscribe] = useState(null);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [pendingRoomAction, setPendingRoomAction] = useState(null); // { type: 'create' | 'join', roomId?: string }

  // 检查 URL 参数中是否有房间号
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomIdFromUrl = urlParams.get('room');
    if (roomIdFromUrl) {
      // 显示用户名输入弹窗
      setPendingRoomAction({ type: 'join', roomId: roomIdFromUrl });
      setShowUsernameModal(true);
    }
  }, []);

  // 清理房间订阅
  useEffect(() => {
    return () => {
      if (roomUnsubscribe) {
        roomUnsubscribe();
      }
    };
  }, [roomUnsubscribe]);

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

  const handleStartGame = async () => {
    const shuffled = prepareSongs();
    if (!shuffled) return;

    setGameSongs(shuffled);
    setCurrentSongIndex(0);

    if (settings.mode === GameMode.LOCAL) {
      // 本地游戏
      setPlayers([{
        id: 'p1',
        name: '玩家 1',
        avatar: getRandomEmoji(),
        score: 0,
        isCurrentUser: true
      }]);
      setScreen('game');
    } else {
      // 线上游戏 - 显示用户名输入弹窗
      setPendingRoomAction({ type: 'create' });
      setShowUsernameModal(true);
    }
  };

  const handleUsernameSubmit = async (username) => {
    setShowUsernameModal(false);
    
    const userId = `user-${Date.now()}`;
    setCurrentUserId(userId);
    
    const player = {
      id: userId,
      name: username,
      avatar: getRandomEmoji(),
      score: 0,
      isCurrentUser: true
    };

    try {
      if (pendingRoomAction.type === 'create') {
        // 创建房间 - 房主准备歌曲
        const shuffled = prepareSongs();
        if (!shuffled) return;
        
        const roomId = await createRoom(settings, player, shuffled);
        setCurrentRoomId(roomId);
        setGameSongs(shuffled);
        setCurrentSongIndex(0);
        
        // 订阅房间变化
        const unsubscribe = subscribeToRoom(roomId, (roomData) => {
          if (!roomData) {
            // 房间被删除
            alert('房间已关闭');
            handleHome();
            return;
          }
          
          setPlayers(roomData.players);
        });
        setRoomUnsubscribe(() => unsubscribe);
        
        setPlayers([player]);
        setScreen('game');
      } else if (pendingRoomAction.type === 'join') {
        // 加入房间 - 使用房间的歌曲列表
        const roomData = await joinRoom(pendingRoomAction.roomId, player);
        setCurrentRoomId(pendingRoomAction.roomId);
        
        // 使用房间的设置和歌曲
        setSettings(roomData.settings);
        setGameSongs(roomData.songList || []);
        setCurrentSongIndex(roomData.gameState?.currentIndex || 0);
        
        // 订阅房间变化
        const unsubscribe = subscribeToRoom(pendingRoomAction.roomId, (roomData) => {
          if (!roomData) {
            alert('房间已关闭');
            handleHome();
            return;
          }
          
          setPlayers(roomData.players);
          // 同步游戏状态
          if (roomData.gameState) {
            setCurrentSongIndex(roomData.gameState.currentIndex || 0);
          }
        });
        setRoomUnsubscribe(() => unsubscribe);
        
        setScreen('game');
      }
    } catch (error) {
      alert(error.message);
    }
    
    setPendingRoomAction(null);
  };

  const handleJoinGame = (roomId) => {
    // 显示用户名输入弹窗
    setPendingRoomAction({ type: 'join', roomId });
    setShowUsernameModal(true);
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
    if (settings.mode === GameMode.ONLINE && currentRoomId) {
      // 线上游戏重开 - 保持在同一个房间，重置分数
      setPlayers(prev => prev.map(p => ({ ...p, score: 0 })));
      const shuffled = prepareSongs();
      if (shuffled) {
        setGameSongs(shuffled);
        setCurrentSongIndex(0);
        setScreen('game');
      }
    } else {
      // 本地游戏重开
      setPlayers(prev => prev.map(p => ({ ...p, score: 0 })));
      const shuffled = prepareSongs();
      if (shuffled) {
        setGameSongs(shuffled);
        setCurrentSongIndex(0);
        setScreen('game');
      }
    }
  };

  const handleHome = async () => {
    // 如果在线上房间中，先离开房间
    if (currentRoomId && currentUserId) {
      try {
        await leaveRoom(currentRoomId, currentUserId);
      } catch (error) {
        console.error('离开房间失败:', error);
      }
      
      if (roomUnsubscribe) {
        roomUnsubscribe();
        setRoomUnsubscribe(null);
      }
      
      setCurrentRoomId(null);
      setCurrentUserId(null);
    }
    
    setScreen('setup');
    setPlayers([]);
    setGameSongs([]);
    setCurrentSongIndex(0);
    
    // 清理 URL 参数
    window.history.replaceState({}, document.title, window.location.pathname);
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
            roomId={currentRoomId}
            currentUserId={currentUserId}
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
      
      {/* 用户名输入弹窗 */}
      {showUsernameModal && (
        <UsernameModal
          onSubmit={handleUsernameSubmit}
          onCancel={() => {
            setShowUsernameModal(false);
            setPendingRoomAction(null);
          }}
        />
      )}
    </div>
  );
};

export default App;
