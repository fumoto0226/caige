import React, { useState, useEffect, useRef } from 'react';
import { ARTISTS } from '../data/songs';
import { Send, Share2, PlayCircle, Crown, LogOut, Clock, Eye } from 'lucide-react';
import InviteModal from './InviteModal';
import { updateGameState, sendMessage, subscribeToRoom } from '../utils/roomManager';

const OnlineGameScreen = ({
  settings,
  players,
  setPlayers,
  currentSong,
  songIndex,
  totalSongs,
  onNextSong,
  onEndGame,
  roomId,
  currentUserId
}) => {
  // 本地UI状态 - 仅用于输入和显示
  const [inputVal, setInputVal] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [animationKey, setAnimationKey] = useState(0); // 用于重置CSS动画
  
  // 游戏状态 - 完全从Firebase同步
  const [gameState, setGameState] = useState({
    active: false,
    currentIndex: 0,
    isPlaying: false,
    progress: 0,
    hasFinishedFirstPlay: false,
    isCountingDown: false,
    countdown: 0,
    correctPlayers: [], // 当前题目答对的玩家ID列表（按顺序）
  });
  
  const [messages, setMessages] = useState([]);

  const messagesEndRef = useRef(null);
  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const countdownRef = useRef(null);

  const maxDuration = settings.isFullSong ? 180 : settings.durationSeconds;
  const isHost = currentUserId && players.length > 0 && players[0]?.id === currentUserId;

  // Setup audio
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // 订阅房间变化 - 所有人都从Firebase同步状态
  useEffect(() => {
    if (!roomId) return;
    
    const unsubscribe = subscribeToRoom(roomId, (roomData) => {
      if (!roomData) return;
      
      // 同步消息（所有人）
      if (roomData.messages) {
        setMessages(roomData.messages);
      }
      
      // 同步游戏状态（所有人，包括房主）
      if (roomData.gameState) {
        setGameState(roomData.gameState);
      }
    });
    
    return () => unsubscribe();
  }, [roomId]);

  // 根据gameState控制音频播放
  useEffect(() => {
    if (!audioRef.current || !currentSong) return;
    
    if (gameState.isPlaying) {
      // 同步进度
      if (Math.abs(audioRef.current.currentTime - gameState.progress) > 0.5) {
        audioRef.current.currentTime = gameState.progress;
      }
      audioRef.current.play().catch(err => console.error('播放失败:', err));
    } else {
      audioRef.current.pause();
    }
  }, [gameState.isPlaying, gameState.progress, currentSong]);

  // 自动滚动消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 歌曲切换时重置音频和动画
  useEffect(() => {
    if (!currentSong || !audioRef.current) return;
    
    audioRef.current.src = currentSong.path;
    audioRef.current.load();
    audioRef.current.currentTime = 0;
    // 重置CSS动画
    setAnimationKey(prev => prev + 1);
  }, [currentSong]);

  // 房主专用：播放进度监控
  useEffect(() => {
    if (!isHost || !gameState.isPlaying || !audioRef.current) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    
    let syncCounter = 0;
    timerRef.current = setInterval(() => {
      if (!audioRef.current) return;
      
      const currentTime = audioRef.current.currentTime;
      
      // 每秒同步一次到Firebase
      syncCounter++;
      if (syncCounter >= 10) {
        syncCounter = 0;
        updateGameState(roomId, {
          ...gameState,
          progress: currentTime,
          isPlaying: true
        }).catch(err => console.error('同步进度失败:', err));
      }
      
      // 检查是否播放完毕
      if (currentTime >= maxDuration || audioRef.current.ended) {
        handlePlaybackFinish();
      }
    }, 100);
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isHost, gameState.isPlaying, roomId, maxDuration]);

  // 房主专用：倒计时监控
  useEffect(() => {
    if (!isHost || !gameState.isCountingDown || gameState.countdown <= 0) {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      return;
    }
    
    countdownRef.current = setInterval(async () => {
      const newCountdown = gameState.countdown - 1;
      
      if (newCountdown <= 0) {
        // 倒计时结束，公布答案
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }
        await handleRevealAnswer();
      } else {
        // 更新倒计时
        await updateGameState(roomId, {
          ...gameState,
          countdown: newCountdown
        });
      }
    }, 1000);
    
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [isHost, gameState.isCountingDown, gameState.countdown, roomId]);

  // 房主：播放完毕处理
  const handlePlaybackFinish = async () => {
    if (!isHost) return;
    
    const timeLimit = settings.timeLimit > 0 ? settings.timeLimit : 0;
    
    await updateGameState(roomId, {
      ...gameState,
      isPlaying: false,
      hasFinishedFirstPlay: true,
      isCountingDown: timeLimit > 0,
      countdown: timeLimit
    });
  };

  // 房主：开始游戏/播放下一题
  const handleHostStart = async () => {
    if (!isHost) return;
    
    // 判断是否是第一次开始游戏（从未播放过）
    const isFirstTime = songIndex === 0 && !gameState.hasFinishedFirstPlay;
    
    let newIndex;
    if (isFirstTime) {
      // 第一次：从第0首开始
      newIndex = 0;
    } else {
      // 播放下一题：当前索引+1
      newIndex = songIndex + 1;
      onNextSong(); // 切换本地歌曲
      // 等待状态更新
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    await updateGameState(roomId, {
      active: true,
      currentIndex: newIndex,
      isPlaying: true,
      progress: 0,
      hasFinishedFirstPlay: false,
      isCountingDown: false,
      countdown: 0,
      correctPlayers: [], // 重置答对列表
    });
    
    if (isFirstTime) {
      await sendMessage(roomId, {
        id: Date.now().toString(),
        playerId: 'system',
        playerName: 'System',
        text: '🎮 游戏开始！请听歌猜名！',
        type: 'system',
        timestamp: Date.now()
      });
    }
  };

  // 发送消息和判断答案
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputVal.trim() || !roomId) return;

    const inputText = inputVal.trim();
    const artist = ARTISTS.find(a => a.id === currentSong.artistId);
    const isCorrect = gameState.active && 
      (inputText.toLowerCase() === currentSong.title.toLowerCase() ||
       inputText === artist?.name);

    const newMessage = {
      id: Date.now().toString(),
      playerId: currentUserId || 'unknown',
      playerName: players.find(p => p.id === currentUserId)?.name || '我',
      text: inputText,
      type: 'user',
      timestamp: Date.now()
    };

    await sendMessage(roomId, newMessage);
    setInputVal('');

    if (isCorrect && gameState.active) {
      // 检查是否已经答对过
      const alreadyAnswered = gameState.correctPlayers?.includes(currentUserId);
      if (alreadyAnswered) return;
      
      setTimeout(async () => {
        const currentPlayer = players.find(p => p.id === currentUserId);
        const artist = ARTISTS.find(a => a.id === currentSong.artistId);
        
        // 更新答对列表到Firebase
        const newCorrectPlayers = [...(gameState.correctPlayers || []), currentUserId];
        await updateGameState(roomId, {
          ...gameState,
          correctPlayers: newCorrectPlayers
        });
        
        // 计算得分：第一个10分，第二个8分，第三个及以后6分
        const rank = newCorrectPlayers.length;
        let score = 6; // 默认6分
        if (rank === 1) score = 10;
        else if (rank === 2) score = 8;
        
        // 系统消息：XX答对了 <正确答案>（不显示具体内容）
        await sendMessage(roomId, {
          id: Date.now().toString(),
          playerId: 'system',
          playerName: 'System',
          text: `🎉 ${currentPlayer?.name} 答对了！<正确答案>（+${score}分）`,
          type: 'correct',
          timestamp: Date.now()
        });
        
        // 本地消息：给自己显示完整答案
        setMessages(prev => [...prev, {
          id: `local-${Date.now()}`,
          playerId: 'system',
          playerName: 'System',
          text: `🎉 ${currentPlayer?.name} 答对了！正确答案：《${currentSong.title}》 - ${artist?.name}（+${score}分）`,
          type: 'correct',
          timestamp: Date.now(),
          isLocal: true
        }]);
        
        // 更新分数
        setPlayers(prev => prev.map(p => 
          p.id === currentUserId ? { ...p, score: p.score + score } : p
        ));
      }, 500);
    }
  };

  // 房主：提前公布答案
  const handleRevealAnswer = async () => {
    if (!isHost) return;
    
    const artist = ARTISTS.find(a => a.id === currentSong.artistId);
    
    // 发送答案公布消息
    await sendMessage(roomId, {
      id: `reveal-${Date.now()}`,
      playerId: 'system',
      playerName: 'System',
      text: `🎵 答案揭晓：《${currentSong.title}》 - ${artist?.name}`,
      type: 'reveal',
      timestamp: Date.now()
    });
    
    // 等待一下再发送等待提示
    setTimeout(async () => {
      await sendMessage(roomId, {
        id: `wait-next-${Date.now()}`,
        playerId: 'system',
        playerName: 'System',
        text: '⏸ 等待房主播放下一题...',
        type: 'system',
        timestamp: Date.now()
      });
    }, 500);
    
    await updateGameState(roomId, {
      ...gameState,
      active: false,
      isCountingDown: false,
      countdown: 0
    });
  };

  if (!currentSong) return null;

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans overflow-hidden">
      
      {/* Header */}
      <div className="bg-white p-3 shadow-sm flex justify-between items-center rounded-b-3xl z-20 shrink-0">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => window.history.back()} 
            className="p-2 hover:bg-slate-100 rounded-full transition active:scale-95"
          >
            <LogOut size={18} className="text-red-400" />
          </button>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Room #{roomId || '----'}</span>
            <span className="font-black text-slate-800 text-sm">第 {songIndex + 1}/{totalSongs} 首</span>
          </div>
        </div>
        <button 
          onClick={() => setShowInviteModal(true)}
          className="px-3 py-1.5 bg-green-100 text-green-600 rounded-full text-xs font-black flex items-center gap-1 hover:bg-green-200 active:scale-95 transition shadow-sm"
        >
          <Share2 size={12} /> 邀请
        </button>
      </div>

      {/* Player Chips */}
      <div className="flex gap-2 px-4 py-2 overflow-x-auto no-scrollbar shrink-0">
        {players.map((p, idx) => {
          const isMe = p.id === currentUserId;
          return (
            <div key={p.id} className="flex flex-col items-center gap-0.5 shrink-0">
              <div className="relative">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-2xl ${
                  isMe 
                    ? 'ring-2 ring-green-400 shadow-lg shadow-green-200' 
                    : 'shadow-md'
                }`}>
                  {p.avatar}
                </div>
                {idx === 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center shadow-sm">
                    <Crown size={10} className="text-yellow-900" />
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center text-[9px] font-black shadow-sm border-2 border-white">
                  {p.score || 0}
                </div>
              </div>
              <span className="text-[9px] font-bold text-slate-500 mt-1 truncate max-w-[60px]">{p.name}</span>
            </div>
          );
        })}
      </div>

      {/* Music Control Bar */}
      <div className="mx-4 mt-2 bg-white rounded-2xl p-4 shadow-lg shadow-slate-200/50 z-10 shrink-0 border border-slate-100 relative">
        <div className="flex items-center justify-center gap-3">
          {gameState.isCountingDown ? (
            <div className="flex items-center gap-2 text-orange-500 font-black animate-pulse text-lg">
              <Clock size={20} /> {gameState.countdown}s
            </div>
          ) : (
            <span className="text-sm text-slate-400 font-semibold">
              {gameState.active ? '正在播放...' : '等待开始'}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2 pt-3 relative">
           <span className="text-[10px] font-bold text-slate-400 w-8 text-right">
             {gameState.isPlaying ? '播放中' : '暂停'}
           </span>
           <div className="flex-1 relative h-1.5 bg-slate-100 rounded-lg overflow-hidden">
                <div 
                  key={animationKey}
                  className={`h-full bg-gradient-to-r from-purple-500 to-purple-600 ${
                    gameState.isPlaying ? 'animate-progress' : ''
                  }`}
                  style={{ 
                    '--duration': `${maxDuration}s`,
                    animationPlayState: gameState.isPlaying ? 'running' : 'paused'
                  }}
                />
           </div>
           <span className="text-[10px] font-bold text-slate-400 w-8">{maxDuration}s</span>
        </div>

        {!gameState.active && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-2xl flex items-center justify-center z-20">
             {isHost ? (
               <button 
                 onClick={handleHostStart}
                 className={`px-5 py-2 rounded-full text-xs font-black shadow-lg animate-pulse flex items-center gap-2 transform transition hover:scale-105 ${
                   songIndex === 0 && !gameState.hasFinishedFirstPlay
                   ? 'bg-yellow-400 hover:bg-yellow-500 text-yellow-900 shadow-yellow-200' 
                   : 'bg-purple-500 hover:bg-purple-600 text-white shadow-purple-200'
                 }`}
               >
                 <PlayCircle size={16} /> {songIndex === 0 && !gameState.hasFinishedFirstPlay ? '房主开始游戏' : '播放下一题'}
               </button>
             ) : (
               <div className="px-5 py-2 rounded-full text-xs font-black flex items-center gap-2 bg-slate-200 text-slate-400">
                 <Clock size={16} /> 等待房主开始游戏...
               </div>
             )}
          </div>
        )}
      </div>
      
      {/* 房主专用：提前公布答案按钮 */}
      {isHost && gameState.active && gameState.isCountingDown && (
        <div className="mx-4 mt-2 shrink-0">
          <button
            onClick={handleRevealAnswer}
            className="w-full py-2 bg-orange-100 text-orange-600 rounded-2xl text-xs font-black flex items-center justify-center gap-2 hover:bg-orange-200 active:scale-95 transition shadow-sm border border-orange-200"
          >
            <Eye size={14} /> 提前公布答案
          </button>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 py-2 pb-20 space-y-2 no-scrollbar">
        {messages.map(msg => {
          if (msg.type === 'system') {
            return (
              <div key={msg.id} className="flex justify-center my-2">
                <span className="bg-slate-200 text-slate-500 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">{msg.text}</span>
              </div>
            );
          }
          if (msg.type === 'correct') {
            return (
              <div key={msg.id} className="flex justify-center my-2 w-full">
                <div className="bg-gradient-to-r from-yellow-100 to-orange-100 border border-yellow-200 text-yellow-800 font-bold text-xs px-4 py-2 rounded-xl shadow-sm animate-bounce text-center">
                  {msg.text}
                </div>
              </div>
            );
          }
          if (msg.type === 'reveal') {
            return (
              <div key={msg.id} className="flex justify-center my-2 w-full">
                <div className="bg-gradient-to-r from-green-500 to-green-600 text-white font-black text-sm px-6 py-3 rounded-2xl shadow-lg text-center">
                  {msg.text}
                </div>
              </div>
            );
          }
          
          const isMe = msg.playerId === currentUserId;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] ${isMe ? 'bg-green-500' : 'bg-blue-500'} text-white px-3 py-2 rounded-2xl shadow-sm`}>
                {!isMe && <div className="text-[9px] font-bold opacity-75 mb-0.5">{msg.playerName}</div>}
                <div className="text-xs font-semibold break-words">{msg.text}</div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 w-full bg-gradient-to-t from-white via-white to-transparent z-30 max-w-md mx-auto right-0">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2 p-4">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="猜猜是哪首歌..."
            className="flex-1 px-4 py-2.5 bg-white border-2 border-green-300 rounded-full text-sm font-bold focus:outline-none focus:border-green-500 placeholder-slate-400 text-slate-800 shadow-sm"
          />
          <button
            type="submit"
            disabled={!inputVal.trim()}
            className="p-2.5 bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition"
          >
            <Send size={18} />
          </button>
        </form>
      </div>

      {showInviteModal && (
        <InviteModal roomId={roomId} onClose={() => setShowInviteModal(false)} />
      )}

      <audio ref={audioRef} />
    </div>
  );
};

export default OnlineGameScreen;
