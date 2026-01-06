import React, { useState, useEffect, useRef } from 'react';
import { ARTISTS } from '../data/songs';
import { Play, Pause, Send, Share2, PlayCircle, Crown, LogOut, Clock, Lock, Eye, X, Check } from 'lucide-react';
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
  const [hasGameStarted, setHasGameStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [progress, setProgress] = useState(0);
  
  const [hasFinishedFirstPlay, setHasFinishedFirstPlay] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isCountingDown, setIsCountingDown] = useState(false);
  
  const [showInviteModal, setShowInviteModal] = useState(false);

  const messagesEndRef = useRef(null);
  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const countdownRef = useRef(null);

  const maxDuration = settings.isFullSong ? 180 : settings.durationSeconds;
  // 使用 currentUserId 来判断是否是房主
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

  // 订阅房间变化 - 同步游戏状态和消息
  useEffect(() => {
    if (!roomId) return;
    
    const unsubscribe = subscribeToRoom(roomId, (roomData) => {
      if (!roomData) return;
      
      // 同步消息
      if (roomData.messages && roomData.messages.length > 0) {
        setMessages(roomData.messages);
      }
      
      // 非房主同步游戏状态
      if (!isHost && roomData.gameState) {
        const state = roomData.gameState;
        
        // 同步播放状态
        if (state.isPlaying !== isPlaying) {
          setIsPlaying(state.isPlaying);
        }
        
        // 同步进度
        if (Math.abs(state.progress - progress) > 0.5 && audioRef.current) {
          setProgress(state.progress);
          audioRef.current.currentTime = state.progress;
        }
        
        // 同步是否开始
        if (state.active !== hasGameStarted) {
          setHasGameStarted(state.active);
        }
        
        // 同步其他状态
        setHasFinishedFirstPlay(state.hasFinishedFirstPlay || false);
        setIsCountingDown(state.isCountingDown || false);
        setCountdown(state.countdown || 0);
      }
    });
    
    return () => unsubscribe();
  }, [roomId, isHost]);

  // Initialize messages
  useEffect(() => {
    if (songIndex === 0 && messages.length === 0) {
      setMessages([{
        id: 'sys-start',
        playerId: 'system',
        playerName: 'System',
        text: '等待房主开始游戏...',
        type: 'system'
      }]);
    }
  }, [songIndex]);

  // Auto scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Song change handler
  useEffect(() => {
    if (!currentSong) return;

    setHasGameStarted(false);
    setIsPlaying(false);
    setProgress(0);
    setHasFinishedFirstPlay(false);
    setIsCountingDown(false);
    setCountdown(settings.timeLimit > 0 ? settings.timeLimit : 0);
    
    setPlayers(prev => prev.map(p => ({ ...p, status: 'answering' })));
    
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      playerId: 'system',
      playerName: 'System',
      text: `🎵 准备播放第 ${songIndex + 1} 首`,
      type: 'system'
    }]);

    stopTimer();
    stopCountdown();

    if (audioRef.current && currentSong.path) {
      audioRef.current.src = currentSong.path;
      audioRef.current.load();
    }
  }, [currentSong]);

  // Playback Timer
  useEffect(() => {
    if (isPlaying && audioRef.current) {
      audioRef.current.play().catch(err => console.error('播放失败:', err));
      
      timerRef.current = window.setInterval(() => {
        if (audioRef.current) {
          const currentTime = audioRef.current.currentTime;
          setProgress(currentTime);
          
          if (currentTime >= maxDuration || audioRef.current.ended) {
            handlePlaybackFinish();
          }
        }
      }, 100);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      stopTimer();
    }
    return () => stopTimer();
  }, [isPlaying, maxDuration]);

  // Countdown Timer
  useEffect(() => {
    if (isCountingDown && countdown > 0) {
      countdownRef.current = window.setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            stopCountdown();
            setIsCountingDown(false);
            // 时间到自动公布答案
            handleRevealAnswer();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      stopCountdown();
    }
    return () => stopCountdown();
  }, [isCountingDown, countdown]);

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const stopCountdown = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  const handlePlaybackFinish = async () => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (!hasFinishedFirstPlay) {
        setHasFinishedFirstPlay(true);
        if (settings.timeLimit > 0) {
            setIsCountingDown(true);
        }
        
        // 房主更新第一遍播放完成状态到 Firebase
        if (roomId && isHost) {
          await updateGameState(roomId, {
            active: hasGameStarted,
            currentIndex: songIndex,
            isPlaying: false,
            progress: progress,
            segmentStart: 0,
            hasFinishedFirstPlay: true,
            isCountingDown: settings.timeLimit > 0,
            countdown: settings.timeLimit || 0,
          });
        }
    }
  };

  const handleHostStart = async () => {
    setHasGameStarted(true);
    setIsPlaying(true);
    
    // 房主更新游戏状态到 Firebase
    if (roomId && isHost) {
      await updateGameState(roomId, {
        active: true,
        currentIndex: songIndex,
        isPlaying: true,
        progress: 0,
        segmentStart: 0,
        hasFinishedFirstPlay: false,
        isCountingDown: false,
        countdown: 0,
      });
      
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

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const isCorrect = inputVal.toLowerCase().includes(currentSong.title.toLowerCase());
    const currentUser = players.find(p => p.id === currentUserId);

    const newMessage = {
      id: Date.now().toString(),
      playerId: currentUserId || 'unknown',
      playerName: currentUser?.name || '我',
      text: inputVal,
      type: 'user',
      timestamp: Date.now()
    };

    // 发送消息到 Firebase
    if (roomId) {
      await sendMessage(roomId, newMessage);
    }
    
    setInputVal('');

    if (isCorrect && hasGameStarted) {
      setTimeout(async () => {
        const correctMessage = {
          id: Date.now().toString(),
          playerId: 'system',
          playerName: 'System',
          text: `🎉 ${currentUser?.name} 猜对了！歌名是《${currentSong.title}》`,
          type: 'correct',
          timestamp: Date.now()
        };
        
        if (roomId) {
          await sendMessage(roomId, correctMessage);
        }
        
        // 更新分数（这里应该也同步到 Firebase）
        setPlayers(prev => prev.map(p => p.id === currentUserId ? { ...p, score: p.score + 20 } : p));
      }, 500);
    }
  };

  const handleSliderChange = async (e) => {
    // 只有房主可以拖动进度条，且必须播放完第一遍
    if (!isHost || !hasGameStarted || !hasFinishedFirstPlay) return;
    
    const newTime = parseFloat(e.target.value);
    setProgress(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    
    // 更新到 Firebase
    if (roomId) {
      await updateGameState(roomId, {
        active: hasGameStarted,
        currentIndex: songIndex,
        isPlaying: isPlaying,
        progress: newTime,
        segmentStart: 0,
        hasFinishedFirstPlay: hasFinishedFirstPlay,
        isCountingDown: isCountingDown,
        countdown: countdown,
      });
    }
  };

  const handleExitRoom = () => {
    if (window.confirm("确定要退出房间吗？")) {
      onEndGame();
    }
  };

  const handleRevealAnswer = () => {
    const artist = ARTISTS.find(a => a.id === currentSong.artistId);
    // 发送绿色醒目的答案公布消息
    setMessages(m => [...m, {
      id: `reveal-${Date.now()}`,
      playerId: 'system',
      playerName: 'System',
      text: `🎵 答案揭晓：《${currentSong.title}》 - ${artist?.name}`,
      type: 'reveal'
    }]);
    // 等待一下再发送等待提示
    setTimeout(() => {
      setMessages(m => [...m, {
        id: `wait-next-${Date.now()}`,
        playerId: 'system',
        playerName: 'System',
        text: '⏸ 等待房主播放下一题...',
        type: 'system'
      }]);
    }, 500);
    setHasGameStarted(false);
  };

  if (!currentSong) return null;

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans overflow-hidden">
      
      {/* Header */}
      <div className="bg-white p-3 shadow-sm flex justify-between items-center rounded-b-3xl z-20 shrink-0">
        <div className="flex items-center gap-2">
            <button 
                onClick={handleExitRoom}
                className="bg-red-50 text-red-500 p-2 rounded-full active:scale-95 hover:bg-red-100"
            >
                <LogOut size={16} />
            </button>
            <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Room #{roomId || '----'}</span>
                <span className="font-black text-slate-800 text-sm">第 {songIndex + 1}/{totalSongs} 首</span>
            </div>
        </div>
        <button 
          onClick={() => setShowInviteModal(true)}
          className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 transition-colors active:scale-95"
        >
          <Share2 size={14} /> 邀请
        </button>
      </div>

      {/* Players Strip */}
      <div className="bg-slate-50 border-b border-slate-100 overflow-x-auto p-2 flex gap-2 shrink-0 min-h-[80px] items-center no-scrollbar">
        {players.map((p, index) => (
          <div key={p.id} className="flex flex-col items-center min-w-[56px] relative group">
            <div className="relative transform transition-transform group-hover:scale-110">
              <div className="w-10 h-10 flex items-center justify-center text-2xl">
                {p.avatar || '👤'}
              </div>
              {index === 0 && (
                <div className="absolute -top-1 -right-1 bg-yellow-400 text-white p-0.5 rounded-full shadow-sm border border-white">
                  <Crown size={8} />
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-[9px] font-bold px-1.5 rounded-full border border-white shadow-sm">
                {p.score}
              </div>
            </div>
            <span className="text-[9px] font-bold text-slate-500 mt-1 truncate max-w-[60px]">{p.name}</span>
          </div>
        ))}
      </div>

      {/* Music Control Bar */}
      <div className="mx-4 mt-2 bg-white rounded-2xl p-3 shadow-lg shadow-slate-200/50 z-10 shrink-0 border border-slate-100 relative">
        <div className="flex items-center gap-3">
          <button 
             onClick={async () => {
               // 只有房主可以控制，且第一遍播放完才能暂停
               if (!hasGameStarted || !isHost || !hasFinishedFirstPlay) return;
               const newPlayingState = !isPlaying;
               setIsPlaying(newPlayingState);
               
               // 更新到 Firebase
               if (roomId) {
                 await updateGameState(roomId, {
                   active: hasGameStarted,
                   currentIndex: songIndex,
                   isPlaying: newPlayingState,
                   progress: progress,
                   segmentStart: 0,
                   hasFinishedFirstPlay: hasFinishedFirstPlay,
                   isCountingDown: isCountingDown,
                   countdown: countdown,
                 });
               }
             }} 
             disabled={!hasGameStarted || !isHost || !hasFinishedFirstPlay}
             className={`p-2.5 rounded-full shadow-md active:scale-95 transition flex-shrink-0 ${hasGameStarted && isHost && hasFinishedFirstPlay ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white' : 'bg-slate-100 text-slate-300'}`}
          >
            {isPlaying ? <Pause size={18} fill="currentColor"/> : <Play size={18} fill="currentColor"/>}
          </button>
          
          <div className="flex-1 overflow-hidden relative h-8 flex items-center justify-center">
             {isCountingDown ? (
                 <div className="flex items-center gap-2 text-orange-500 font-black animate-pulse text-sm">
                    <Clock size={16} /> {countdown}s
                 </div>
             ) : (
                <span className="text-xs text-slate-400 font-semibold">
                  {hasGameStarted ? '正在播放...' : '等待开始'}
                </span>
             )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 pt-2 relative">
           <span className="text-[9px] font-bold text-slate-400 w-6 text-right">{Math.floor(progress)}s</span>
           <div className="flex-1 relative">
                <input
                    type="range"
                    min="0"
                    max={maxDuration}
                    step="0.1"
                    value={progress}
                    onChange={handleSliderChange}
                    disabled={!hasGameStarted || !hasFinishedFirstPlay}
                    className={`w-full h-1.5 rounded-lg appearance-none ${(!hasGameStarted || !hasFinishedFirstPlay) ? 'bg-slate-200 cursor-not-allowed' : 'bg-slate-100 accent-purple-500 cursor-pointer'}`}
                />
                {!hasFinishedFirstPlay && hasGameStarted && (
                     <div className="absolute top-[-15px] left-1/2 -translate-x-1/2">
                        <span className="text-[8px] flex items-center gap-1 text-slate-400 bg-white/80 px-1.5 rounded-full border border-slate-100"><Lock size={6}/> 播放完解锁</span>
                     </div>
                )}
           </div>
           <span className="text-[9px] font-bold text-slate-400 w-6">{maxDuration}s</span>
        </div>

        {!hasGameStarted && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-2xl flex items-center justify-center z-20">
             {isHost ? (
               <button 
                 onClick={handleHostStart}
                 className={`px-5 py-2 rounded-full text-xs font-black shadow-lg animate-pulse flex items-center gap-2 transform transition hover:scale-105 ${
                   songIndex === 0 
                   ? 'bg-yellow-400 hover:bg-yellow-500 text-yellow-900 shadow-yellow-200' 
                   : 'bg-green-500 hover:bg-green-600 text-white shadow-green-200'
                 }`}
               >
                 <PlayCircle size={16} /> {songIndex === 0 ? '房主开始游戏' : '播放下一题'}
               </button>
             ) : (
               <div className="px-5 py-2 rounded-full text-xs font-black flex items-center gap-2 bg-slate-200 text-slate-400">
                 <Clock size={16} /> 等待房主开始游戏...
               </div>
             )}
          </div>
        )}
      </div>
      
      {/* Reveal Button - 只有房主在倒计时时可见 */}
      {hasGameStarted && isHost && (
         <div className="flex justify-center mt-2 gap-2 shrink-0 px-4">
             <button 
               onClick={handleRevealAnswer}
               disabled={!isCountingDown}
               className={`text-[10px] px-4 py-1.5 rounded-full font-bold transition-colors flex items-center gap-1 ${
                 isCountingDown
                 ? 'bg-yellow-400 hover:bg-yellow-500 text-yellow-900 active:scale-95'
                 : 'bg-slate-200 text-slate-400 cursor-not-allowed'
               }`}
             >
               <Eye size={12} /> 提前公布答案
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
                <div className="bg-gradient-to-r from-green-400 to-emerald-500 text-white font-black text-base px-6 py-3 rounded-2xl shadow-lg animate-popIn text-center">
                  {msg.text}
                </div>
              </div>
            );
          }
          const isMe = msg.playerId === currentUserId;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-popIn`}>
              <div className={`max-w-[85%] px-3 py-2 text-sm font-medium shadow-sm break-words relative ${
                isMe 
                ? 'bg-green-500 text-white rounded-2xl rounded-tr-sm' 
                : 'bg-blue-500 text-white rounded-2xl rounded-tl-sm'
              }`}>
                {!isMe && <p className="text-[9px] font-bold text-white/70 mb-0.5">{msg.playerName}</p>}
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Fixed 浮动布局 */}
      <div className="fixed bottom-0 left-0 w-full bg-gradient-to-t from-white via-white to-transparent z-30 max-w-md mx-auto right-0">
        <form onSubmit={handleSendMessage} className="bg-white p-3 flex gap-2">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="猜猜是哪首歌..."
            className="flex-1 bg-slate-100 text-slate-800 rounded-full pl-4 pr-4 py-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white transition-all placeholder-slate-400 text-sm"
          />
          <button 
            type="submit" 
            className="bg-green-500 text-white w-10 h-10 rounded-full shadow-lg shadow-green-200 hover:bg-green-600 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center active:scale-95" 
            disabled={!inputVal.trim()}
          >
            <Send size={18} className="ml-0.5" />
          </button>
        </form>
      </div>

      {/* 邀请弹窗 */}
      {showInviteModal && roomId && (
        <InviteModal
          roomId={roomId}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  );
};

export default OnlineGameScreen;
