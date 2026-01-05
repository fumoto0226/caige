import React, { useState, useEffect, useRef } from 'react';
import { ARTISTS } from '../data/songs';
import { Play, Pause, RotateCcw, Check, X, Eye, ArrowRight, Lock } from 'lucide-react';

// 随机emoji列表
const EMOJI_LIST = ['😀', '😎', '🤠', '🥳', '🤓', '😺', '🐶', '🐼', '🦁', '🐯', '🦊', '🐻', '🐨', '🐮', '🐷', '🐸', '🐵', '🦄', '🐲', '🦖'];

// 获取随机emoji
const getRandomEmoji = () => {
  return EMOJI_LIST[Math.floor(Math.random() * EMOJI_LIST.length)];
};

const LocalGameScreen = ({
  settings,
  players,
  setPlayers,
  currentSong,
  songIndex,
  totalSongs,
  onNextSong,
  onEndGame
}) => {
  const [gameState, setGameState] = useState('standby');
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [roundScoresRecorded, setRoundScoresRecorded] = useState({});
  
  const [hasFinishedFirstPlay, setHasFinishedFirstPlay] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isCountingDown, setIsCountingDown] = useState(false);

  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const countdownRef = useRef(null);
  const maxDuration = settings.isFullSong ? 180 : settings.durationSeconds; 

  // Setup audio element
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

  // Initial Game Setup
  useEffect(() => {
    if (!currentSong) return;
    
    if (songIndex === 0 && gameState === 'standby') {
      // Stay in standby
    } else {
      setGameState('playing');
    }
    
    setIsPlaying(false);
    setProgress(0);
    setIsRevealed(false);
    setRoundScoresRecorded({});
    setHasFinishedFirstPlay(false);
    setIsCountingDown(false);
    setCountdown(settings.timeLimit > 0 ? settings.timeLimit : 0);
    
    stopTimer();
    stopCountdown();
    
    if (audioRef.current && currentSong.path) {
      audioRef.current.src = currentSong.path;
      audioRef.current.load();
      // 不自动播放，等待用户点击播放按钮
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
            setIsRevealed(true);
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

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReplay = () => {
    if (!hasFinishedFirstPlay) return;
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
    setProgress(0);
    setIsPlaying(true);
  };

  const handleSliderChange = (e) => {
    if (!hasFinishedFirstPlay) return;
    const newTime = parseFloat(e.target.value);
    setProgress(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleScore = (playerId, correct) => {
    setPlayers(prev => prev.map(p => {
      if (p.id === playerId) {
        return { ...p, score: correct ? p.score + 10 : p.score };
      }
      return p;
    }));
    // 记录答对或答错的状态
    setRoundScoresRecorded(prev => ({...prev, [playerId]: correct}));
  };

  const addPlayer = () => {
    setPlayers(prev => [
      ...prev,
      {
        id: `p${Date.now()}`,
        name: `玩家 ${prev.length + 1}`,
        avatar: getRandomEmoji(),
        score: 0,
        isCurrentUser: true
      }
    ]);
  };

  const removePlayer = (id) => {
    if (players.length > 1) {
      setPlayers(prev => prev.filter(p => p.id !== id));
    }
  };

  const updatePlayerName = (id, name) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, name } : p));
  };

  const allPlayersScored = players.every(p => roundScoresRecorded[p.id] !== undefined);

  if (gameState === 'standby') {
    return (
      <div className="flex flex-col h-full bg-white font-sans overflow-hidden">
        <div className="text-center pt-10 pb-4">
          <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-2 animate-bounce">
            <Play size={32} fill="currentColor" />
          </div>
          <h1 className="text-2xl font-black text-slate-800">准备开始</h1>
        </div>

        <div className="flex-1 overflow-y-auto pb-24 space-y-3 px-6 no-scrollbar">
           {players.map((p, index) => (
             <div key={p.id} className="flex items-center gap-2 bg-slate-50 p-3 rounded-2xl border-2 border-slate-100 shadow-sm">
               <div className="w-6 h-6 flex items-center justify-center bg-slate-200 text-slate-500 rounded-full font-bold text-xs">
                 {index + 1}
               </div>
               <input 
                  type="text" 
                  value={p.name}
                  onChange={(e) => updatePlayerName(p.id, e.target.value)}
                  className="flex-1 bg-white border-2 border-slate-200 focus:border-green-400 outline-none text-slate-800 px-3 py-1.5 rounded-xl font-bold text-sm"
                  placeholder="输入名字"
               />
               {players.length > 1 && (
                 <button onClick={() => removePlayer(p.id)} className="p-2 text-red-400 hover:text-red-500 bg-red-50 rounded-xl">
                   <X size={16} />
                 </button>
               )}
             </div>
           ))}
           
           <button 
             onClick={addPlayer} 
             className="w-full mt-2 py-3 border-2 border-dashed border-slate-300 text-slate-400 rounded-2xl hover:border-green-400 hover:text-green-500 hover:bg-green-50 font-bold flex justify-center items-center gap-2 transition text-sm"
           >
             + 添加玩家
           </button>
        </div>

        <div className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-white via-white to-transparent z-10 max-w-md mx-auto right-0">
          <button 
            onClick={() => setGameState('playing')}
            className="w-full py-4 bg-green-500 text-white text-lg font-black rounded-3xl shadow-xl shadow-green-200 hover:bg-green-600 active:scale-95 transition-transform"
          >
            🚀 开始游戏
          </button>
        </div>
      </div>
    );
  }

  if (!currentSong) return null;

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans overflow-hidden">
      <div className="flex justify-between items-center p-4 bg-white shadow-sm rounded-b-3xl z-10 shrink-0">
        <div className="flex items-center gap-2">
           <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold border border-slate-200">
             第 {songIndex + 1} / {totalSongs} 题
           </span>
        </div>
        <button onClick={onEndGame} className="text-xs font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-full border border-red-100">
          结束游戏
        </button>
      </div>

      {/* Players Chips - 支持左右滚动 */}
      <div className="py-2 shrink-0 z-10">
        <div className="overflow-x-auto px-4" style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
          <div className="flex items-center gap-2 min-w-max">
            {players.map((p) => (
               <div key={p.id} className="flex flex-col items-center min-w-[50px] bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100">
                  <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-lg mb-1">
                     {p.avatar || '👤'}
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 truncate w-full text-center">{p.name}</span>
                  <span className="text-[10px] font-black text-green-500">{p.score}</span>
               </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 w-full gap-3">
        <div className={`relative w-52 h-52 sm:w-64 sm:h-64 rounded-full border-4 border-white shadow-2xl flex items-center justify-center overflow-hidden transition-all duration-700 shrink-0 ${isPlaying ? 'animate-spin-slow' : ''}`}>
           <div className="absolute inset-0 bg-slate-800"></div>
           <div className="absolute inset-2 border border-slate-700 rounded-full opacity-30"></div>
           <div className="absolute inset-6 border border-slate-700 rounded-full opacity-30"></div>
           <div className="absolute inset-10 border border-slate-700 rounded-full opacity-30"></div>
           
           <div className={`absolute w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center z-20 shadow-inner transition-colors duration-300 ${isCountingDown && !isRevealed ? 'bg-orange-500' : 'bg-green-400'}`}>
              {isRevealed ? (
                 <img src={currentSong.cover} alt="Cover" className="w-full h-full rounded-full object-cover" />
              ) : (
                <>
                   {isCountingDown ? (
                     <div className="flex flex-col items-center justify-center">
                        <span className="text-white font-black text-xl sm:text-2xl animate-pulse">{countdown}</span>
                     </div>
                   ) : (
                     <span className="text-2xl font-black text-white">?</span>
                   )}
                </>
              )}
           </div>
        </div>


        <div className="w-full max-w-xs bg-white p-3 rounded-[1.5rem] shadow-xl shadow-slate-200/50 shrink-0 relative">
          <div className="relative pt-1">
            <input
              type="range"
              min="0"
              max={maxDuration}
              step="0.1"
              value={progress}
              onChange={handleSliderChange}
              disabled={!hasFinishedFirstPlay} 
              className={`w-full h-2 rounded-full appearance-none ${!hasFinishedFirstPlay ? 'bg-slate-200 cursor-not-allowed' : 'bg-slate-100 cursor-pointer accent-green-500'}`}
            />
            {!hasFinishedFirstPlay && (
              <div className="absolute inset-0 -top-2 flex items-center justify-center pointer-events-none">
                 <span className="text-[9px] font-bold text-slate-400 bg-white/90 px-2 py-0.5 rounded-full backdrop-blur-sm shadow-sm flex items-center gap-1 border border-slate-100">
                   <Lock size={8} /> 播放完解锁
                 </span>
              </div>
            )}
          </div>
          
          <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
            <span>{Math.floor(progress)}s</span>
            <span>{maxDuration}s</span>
          </div>

          <div className="flex justify-center gap-6 items-center">
            <button 
              onClick={handleReplay} 
              disabled={!hasFinishedFirstPlay}
              className={`p-2.5 rounded-full transition ${!hasFinishedFirstPlay ? 'bg-slate-50 text-slate-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-95'}`}
            >
              <RotateCcw size={18} />
            </button>
            
            <button 
              onClick={togglePlay} 
              className="p-3.5 bg-green-500 rounded-full text-white shadow-lg shadow-green-200 hover:bg-green-600 active:scale-95 transition transform"
            >
              {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
            </button>
          </div>
        </div>
      </div>

      {!isRevealed && (
        <div className="fixed bottom-0 left-0 w-full p-4 bg-gradient-to-t from-white via-white to-transparent z-10 max-w-md mx-auto right-0 flex justify-center">
          <button 
            onClick={() => setIsRevealed(true)}
            className="px-6 py-3 bg-yellow-400 text-yellow-900 font-bold rounded-full shadow-lg hover:bg-yellow-500 flex items-center gap-2 text-sm active:scale-95 transition-transform"
          >
            <Eye size={18} /> {isCountingDown ? '提前查看' : '查看答案'}
          </button>
        </div>
      )}

      {isRevealed && (
          <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/20 backdrop-blur-[1px]">
            <div className="bg-white rounded-t-[2rem] shadow-2xl h-[70vh] flex flex-col animate-fadeIn">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-[2rem]">
                    <div className="flex-1">
                        <h3 className="text-lg font-black text-slate-800">《{currentSong.title}》</h3>
                        <p className="text-xs font-bold text-slate-400">{ARTISTS.find(a => a.id === currentSong.artistId)?.name}</p>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                    {players.map(p => (
                        <div key={p.id} className="flex items-center justify-between bg-white p-2.5 pr-2 rounded-xl border border-slate-100 shadow-sm">
                            <span className="font-bold text-slate-700 text-sm pl-2">{p.name}</span>
                            
                            {roundScoresRecorded[p.id] !== undefined ? (
                                <span className={`text-[10px] px-2 py-1 rounded-full font-bold flex items-center gap-1 ${roundScoresRecorded[p.id] ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                                    {roundScoresRecorded[p.id] ? '正确' : '错误'}
                                </span>
                            ) : (
                                <div className="flex gap-2">
                                    <button onClick={() => handleScore(p.id, true)} className="w-8 h-8 flex items-center justify-center bg-green-100 text-green-600 rounded-lg active:scale-95"><Check size={16} /></button>
                                    <button onClick={() => handleScore(p.id, false)} className="w-8 h-8 flex items-center justify-center bg-red-100 text-red-500 rounded-lg active:scale-95"><X size={16} /></button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="p-4 border-t border-slate-100 pb-safe">
                    {allPlayersScored ? (
                        <button 
                            onClick={songIndex + 1 >= totalSongs ? onEndGame : onNextSong}
                            className="w-full py-3 bg-blue-500 text-white text-base font-bold rounded-2xl shadow-lg shadow-blue-200 flex items-center justify-center gap-2 active:scale-95 transition-transform"
                        >
                            {songIndex + 1 >= totalSongs ? '查看结果' : '下一题'} <ArrowRight size={18}/>
                        </button>
                    ) : (
                         <div className="text-center py-3 bg-slate-100 rounded-2xl text-slate-400 font-bold text-xs">
                            请记录所有玩家得分
                        </div>
                    )}
                </div>
            </div>
          </div>
      )}
    </div>
  );
};

export default LocalGameScreen;

