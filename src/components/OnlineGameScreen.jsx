import React, { useState, useEffect, useRef } from 'react';
import { ARTISTS } from '../data/songs';
import { Play, Pause, Send, Share2, PlayCircle, Crown, LogOut, Clock, Lock, Eye, X, Check } from 'lucide-react';

const OnlineGameScreen = ({
  settings,
  players,
  setPlayers,
  currentSong,
  songIndex,
  totalSongs,
  onNextSong,
  onEndGame
}) => {
  const [hasGameStarted, setHasGameStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [progress, setProgress] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  
  const [hasFinishedFirstPlay, setHasFinishedFirstPlay] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isCountingDown, setIsCountingDown] = useState(false);

  const messagesEndRef = useRef(null);
  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const countdownRef = useRef(null);

  const maxDuration = settings.isFullSong ? 180 : settings.durationSeconds;
  const isHost = players.find(p => p.isCurrentUser)?.id === players[0]?.id;

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

  // Initialize messages
  useEffect(() => {
    if (songIndex === 0) {
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
    setIsRevealed(false);
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
            setMessages(m => [...m, {
                id: `timeup-${Date.now()}`,
                playerId: 'system',
                playerName: 'System',
                text: '⏰ 时间到！',
                type: 'system'
            }]);
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

  const handlePlaybackFinish = () => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (!hasFinishedFirstPlay) {
        setHasFinishedFirstPlay(true);
        if (settings.timeLimit > 0) {
            setIsCountingDown(true);
        }
    }
  };

  const handleHostStart = () => {
    setHasGameStarted(true);
    setIsPlaying(true);
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      playerId: 'system',
      playerName: 'System',
      text: '🎮 游戏开始！请听歌猜名！',
      type: 'system'
    }]);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const isCorrect = inputVal.toLowerCase().includes(currentSong.title.toLowerCase());
    const currentUser = players.find(p => p.isCurrentUser);

    const newMessage = {
      id: Date.now().toString(),
      playerId: currentUser?.id || 'unknown',
      playerName: currentUser?.name || '我',
      text: inputVal,
      type: 'user'
    };

    setMessages(prev => [...prev, newMessage]);
    setInputVal('');

    if (isCorrect && hasGameStarted) {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          playerId: 'system',
          playerName: 'System',
          text: `🎉 ${currentUser?.name} 猜对了！歌名是《${currentSong.title}》`,
          type: 'correct'
        }]);
        
        setPlayers(prev => prev.map(p => p.isCurrentUser ? { ...p, score: p.score + 20 } : p));
      }, 500);
    }
  };

  const handleSliderChange = (e) => {
    if (!hasGameStarted || !hasFinishedFirstPlay) return;
    const newTime = parseFloat(e.target.value);
    setProgress(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleExitRoom = () => {
    if (window.confirm("确定要退出房间吗？")) {
      onEndGame();
    }
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
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Room #8821</span>
                <span className="font-black text-slate-800 text-sm">第 {songIndex + 1}/{totalSongs} 首</span>
            </div>
        </div>
        <button className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 transition-colors">
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
             onClick={() => hasGameStarted && setIsPlaying(!isPlaying)} 
             disabled={!hasGameStarted}
             className={`p-2.5 rounded-full shadow-md active:scale-95 transition flex-shrink-0 ${hasGameStarted ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white' : 'bg-slate-100 text-slate-300'}`}
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

        {isHost && !hasGameStarted && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-2xl flex items-center justify-center z-20">
             <button 
              onClick={handleHostStart}
              className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-5 py-2 rounded-full text-xs font-black shadow-lg shadow-yellow-200 animate-pulse flex items-center gap-2 transform transition hover:scale-105"
            >
              <PlayCircle size={16} /> 房主开始游戏
            </button>
          </div>
        )}
      </div>
      
      {/* Skip/Reveal Buttons */}
      {hasGameStarted && (
         <div className="flex justify-center mt-2 gap-2 shrink-0 px-4">
             {!isRevealed && (
               <button 
                 onClick={() => setIsRevealed(true)}
                 className="text-[10px] bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-3 py-1.5 rounded-full font-bold transition-colors flex items-center gap-1"
               >
                 <Eye size={12} /> 查看答案
               </button>
             )}
             {isHost && (
               <button 
                 onClick={songIndex + 1 >= totalSongs ? onEndGame : onNextSong}
                 className="text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-600 px-3 py-1 rounded-full font-bold transition-colors"
               >
                 {songIndex + 1 >= totalSongs ? '结束游戏' : '⏭ 跳过'}
               </button>
             )}
         </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 no-scrollbar">
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
          const isMe = msg.playerId === players.find(p => p.isCurrentUser)?.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-popIn`}>
              <div className={`max-w-[85%] px-3 py-2 text-sm font-medium shadow-sm break-words relative ${
                isMe 
                ? 'bg-green-500 text-white rounded-2xl rounded-tr-sm' 
                : 'bg-white text-slate-800 rounded-2xl rounded-tl-sm border border-slate-100'
              }`}>
                {!isMe && <p className="text-[9px] font-bold text-slate-400 mb-0.5">{msg.playerName}</p>}
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="bg-white p-2 shadow-up border-t border-slate-50 flex gap-2 shrink-0 pb-safe z-20">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder={hasGameStarted ? "猜猜是哪首歌..." : "等待中..."}
          className="flex-1 bg-slate-100 text-slate-800 rounded-full pl-4 pr-4 py-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white transition-all placeholder-slate-400 text-sm"
          disabled={!hasGameStarted}
        />
        <button 
          type="submit" 
          className="bg-green-500 text-white w-10 h-10 rounded-full shadow-lg shadow-green-200 hover:bg-green-600 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center active:scale-95" 
          disabled={!inputVal.trim() || !hasGameStarted}
        >
          <Send size={18} className="ml-0.5" />
        </button>
      </form>

      {/* Reveal Modal */}
      {isRevealed && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full animate-popIn">
            <div className="text-center mb-4">
              <img src={currentSong.cover} alt="Cover" className="w-24 h-24 rounded-full mx-auto mb-3 shadow-lg" />
              <h3 className="text-xl font-black text-slate-800">《{currentSong.title}》</h3>
              <p className="text-sm font-semibold text-slate-500">{ARTISTS.find(a => a.id === currentSong.artistId)?.name}</p>
            </div>
            <button 
              onClick={() => setIsRevealed(false)}
              className="w-full py-3 bg-blue-500 text-white font-bold rounded-2xl active:scale-95 transition"
            >
              继续游戏
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnlineGameScreen;
