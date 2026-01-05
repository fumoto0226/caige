import React, { useState, useEffect, useRef } from 'react';
import { GameSettings, Player, Song, ChatMessage } from '../types';
import Visualizer from './Visualizer';
import { Play, Pause, Send, Share2, PlayCircle, Mic, Crown, LogOut, Clock, Lock } from 'lucide-react';

interface OnlineGameScreenProps {
  settings: GameSettings;
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  currentSong: Song;
  songIndex: number;
  totalSongs: number;
  onNextSong: () => void;
  onEndGame: () => void;
}

const OnlineGameScreen: React.FC<OnlineGameScreenProps> = ({
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [progress, setProgress] = useState(0);
  
  // Logic States
  const [hasFinishedFirstPlay, setHasFinishedFirstPlay] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isCountingDown, setIsCountingDown] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);

  const maxDuration = settings.isFullSong ? 180 : settings.durationSeconds;
  const isHost = players.find(p => p.isCurrentUser)?.id === players[0]?.id; // Simple host check (first player is host)

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSong]);

  // Playback Timer
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = window.setInterval(() => {
        setProgress((prev) => {
          if (prev >= maxDuration) {
            handlePlaybackFinish();
            return maxDuration;
          }
          return prev + 0.1;
        });
      }, 100);
    } else {
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
            // Time up logic could go here (e.g., reveal answer or show system message)
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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const isCorrect = inputVal.toLowerCase().includes(currentSong.title.toLowerCase());
    const currentUser = players.find(p => p.isCurrentUser);

    const newMessage: ChatMessage = {
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

  const handleInvite = () => {
    alert("邀请链接已复制到剪贴板！(模拟分享)");
    setTimeout(() => {
      const newId = `p${Date.now()}`;
      setPlayers(prev => {
        if (prev.length >= 4) return prev;
        const newPlayer: Player = {
          id: newId,
          name: `路人 ${prev.length}`,
          avatar: `https://picsum.photos/seed/${newId}/100/100`,
          score: 0,
          isCurrentUser: false
        };
        setMessages(curr => [...curr, {
          id: `join-${newId}`,
          playerId: 'system',
          playerName: 'System',
          text: `👋 ${newPlayer.name} 加入了房间`,
          type: 'system'
        }]);
        return [...prev, newPlayer];
      });
    }, 2000);
  };

  const handleExitRoom = () => {
    if (window.confirm("确定要退出房间吗？")) {
        const remainingPlayers = players.filter(p => !p.isCurrentUser);
        
        if (remainingPlayers.length === 0) {
            onEndGame(); // Or go back to Home
        } else {
            // Assign new host logic implicitly by order
            // In a real app, this would involve backend logic.
            // Here we just update local state to simulate 'Me' leaving -> Game Over for 'Me'
            onEndGame();
        }
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!hasGameStarted || !hasFinishedFirstPlay) return;
    setProgress(parseFloat(e.target.value));
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans">
      
      {/* Header with Exit Button */}
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
        <button onClick={handleInvite} className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 transition-colors">
          <Share2 size={14} /> 邀请
        </button>
      </div>

      {/* Players Strip */}
      <div className="bg-slate-50 border-b border-slate-100 overflow-x-auto p-3 flex gap-3 shrink-0 min-h-[90px] items-center">
        {players.map(p => (
          <div key={p.id} className="flex flex-col items-center min-w-[56px] relative group">
            <div className="relative transform transition-transform group-hover:scale-110">
              <img src={p.avatar} alt={p.name} className="w-10 h-10 rounded-full border-2 border-white shadow-md object-cover" />
              {/* Host indicator */}
              <div className="absolute -top-2 -right-1 bg-yellow-400 text-white p-0.5 rounded-full shadow-sm border border-white">
                {players.indexOf(p) === 0 ? <Crown size={8} /> : null}
              </div>
              <div className="absolute -bottom-2 -right-1 bg-green-500 text-white text-[9px] font-bold px-1.5 rounded-full border border-white shadow-sm">
                {p.score}
              </div>
            </div>
            <span className="text-[9px] font-bold text-slate-500 mt-1 truncate max-w-[60px]">{p.name}</span>
          </div>
        ))}
      </div>

      {/* Music Control Bar - Floating Card Style */}
      <div className="mx-4 mt-2 bg-white rounded-2xl p-3 shadow-lg shadow-slate-200/50 z-10 shrink-0 border border-slate-100 relative">
        <div className="flex items-center gap-3">
          <button 
             onClick={() => hasGameStarted && setIsPlaying(!isPlaying)} 
             disabled={!hasGameStarted}
             className={`p-2.5 rounded-full shadow-md active:scale-95 transition flex-shrink-0 ${hasGameStarted ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white' : 'bg-slate-100 text-slate-300'}`}
          >
            {isPlaying ? <Pause size={18} fill="currentColor"/> : <Play size={18} fill="currentColor"/>}
          </button>
          
          <div className="flex-1 overflow-hidden relative h-8 flex items-end opacity-50 justify-center">
             {isCountingDown ? (
                 <div className="flex items-center gap-2 text-orange-500 font-black animate-pulse">
                    <Clock size={16} /> 倒计时: {countdown}s
                 </div>
             ) : (
                <Visualizer isPlaying={isPlaying} />
             )}
          </div>
        </div>
        
        {/* Progress */}
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

        {/* Start Game Overlay for Host */}
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
      
      {/* Skip Button (Host) */}
      {isHost && hasGameStarted && (
         <div className="flex justify-center mt-2 shrink-0">
             <button 
               onClick={songIndex + 1 >= totalSongs ? onEndGame : onNextSong}
               className="text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-600 px-3 py-1 rounded-full font-bold transition-colors"
             >
               {songIndex + 1 >= totalSongs ? '结束游戏' : '⏭ 跳过本题'}
             </button>
         </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
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
        <div className="flex-1 relative">
           <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder={hasGameStarted ? "猜猜是哪首歌..." : "等待中..."}
            className="w-full bg-slate-100 text-slate-800 rounded-full pl-4 pr-9 py-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white transition-all placeholder-slate-400 text-sm"
            disabled={!hasGameStarted}
          />
          <Mic className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
        </div>
        <button 
          type="submit" 
          className="bg-green-500 text-white w-10 h-10 rounded-full shadow-lg shadow-green-200 hover:bg-green-600 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center active:scale-95" 
          disabled={!inputVal.trim() || !hasGameStarted}
        >
          <Send size={18} className="ml-0.5" />
        </button>
      </form>
    </div>
  );
};

export default OnlineGameScreen;