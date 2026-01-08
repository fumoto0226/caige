import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ARTISTS } from '../data/songs';
import { Send, Share2, PlayCircle, Crown, LogOut, Clock, Eye, X, RotateCcw } from 'lucide-react';
import InviteModal from './InviteModal';
import { updateGameState, sendMessage, subscribeToRoom, kickPlayer } from '../utils/roomManager';

const OnlineGameScreen = ({
  settings,
  players,
  setPlayers,
  currentSong,
  songIndex,
  totalSongs,
  gameSongs,
  onNextSong,
  onEndGame,
  onHome,
  onRestart,
  roomId,
  currentUserId
}) => {
  // 本地UI状态 - 仅用于输入和显示
  const [inputVal, setInputVal] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showKickButton, setShowKickButton] = useState(null); // 显示踢人按钮的玩家ID
  const [playersInResults, setPlayersInResults] = useState([]); // 正在查看结算的玩家ID列表
  const [localProgress, setLocalProgress] = useState(0); // 本地真实播放进度（秒）
  const [hasAnsweredCurrentQuestion, setHasAnsweredCurrentQuestion] = useState(false); // 本地标记：当前题目是否已答对
  
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

  // 调试：监控props变化
  useEffect(() => {
    console.log(`🎯 [Props变化] songIndex:${songIndex}, currentSong:${currentSong?.title || 'null'}, gameSongs长度:${gameSongs?.length || 0}, gameState.currentIndex:${gameState.currentIndex}`);
  }, [songIndex, currentSong, gameSongs, gameState.currentIndex]);
 
  // 踢出玩家
  const handleKick = async (playerId) => {
    if (!isHost || !roomId) return;
    
    const hostName = players.find(p => p.id === currentUserId)?.name || '房主';
    await kickPlayer(roomId, playerId, hostName);
  };

  // Setup audio
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop = false; // 确保不循环播放
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = ''; // 清空音频源
        audioRef.current = null;
      }
      // 清理计时器
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // 预加载所有歌曲
  useEffect(() => {
    // 在进入房间后开始预加载
    const preloadAudio = (url) => {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = url;
      // 不需要保存引用，浏览器会自动缓存
    };

    // 延迟预加载，避免影响首次播放
    const timer = setTimeout(() => {
      // 从当前歌曲的下一首开始预加载
      for (let i = songIndex + 1; i < totalSongs; i++) {
        const song = gameSongs[i];
        if (song && song.path) {
          preloadAudio(song.path);
        }
      }
      // 也预加载前面的歌曲（如果有重播需求）
      for (let i = 0; i < songIndex; i++) {
        const song = gameSongs[i];
        if (song && song.path) {
          preloadAudio(song.path);
        }
      }
    }, 2000); // 延迟2秒开始预加载

    return () => clearTimeout(timer);
  }, [songIndex, gameSongs, totalSongs]);

  // 订阅房间变化 - 所有人都从Firebase同步状态
  useEffect(() => {
    if (!roomId) return;
    
    // 添加连接超时检测
    let connectionTimeout = setTimeout(() => {
      console.error('⚠️  Firebase连接超时，可能被墙了');
      alert('网络连接失败，可能是网络问题。\n如果您在中国大陆，请尝试使用VPN或联系管理员。');
    }, 10000); // 10秒超时
    
    const unsubscribe = subscribeToRoom(roomId, (roomData) => {
      // 成功连接，清除超时
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        connectionTimeout = null;
      }
      
      if (!roomData) return;
      
      // 检查自己是否还在玩家列表中（是否被踢出）
      const stillInRoom = roomData.players?.some(p => p.id === currentUserId);
      if (!stillInRoom && currentUserId) {
        // 被踢出房间，跳转到首页
        console.log('你已被踢出房间');
        onHome();
        return;
      }
      
      // 同步消息（所有人）
      if (roomData.messages) {
        setMessages(roomData.messages);
      }
      
      // 同步游戏状态（所有人，包括房主）
      if (roomData.gameState) {
        console.log(`🔄 [同步状态] currentIndex:${roomData.gameState.currentIndex}, isPlaying:${roomData.gameState.isPlaying}`);
        setGameState(roomData.gameState);
        // 同步正在查看结算的玩家列表
        if (roomData.gameState.playersInResults) {
          setPlayersInResults(roomData.gameState.playersInResults);
        }
      }
    });
    
    return () => {
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }
      unsubscribe();
    };
  }, [roomId]);

  // 监听浏览器关闭/刷新事件，自动退出房间
  useEffect(() => {
    if (!roomId || !currentUserId) return;
    
    const handleBeforeUnload = async (e) => {
      // 离开房间
      try {
        const { leaveRoom } = await import('../utils/roomManager');
        await leaveRoom(roomId, currentUserId);
      } catch (err) {
        console.error('离开房间失败:', err);
      }
    };
    
    // 监听页面关闭/刷新
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [roomId, currentUserId]);

  // 整合：歌曲切换 + 播放控制
  useEffect(() => {
    // 使用 gameState.currentIndex 作为真实索引
    const actualIndex = gameState.currentIndex !== undefined ? gameState.currentIndex : songIndex;
    const song = gameSongs[actualIndex];
    
    if (!audioRef.current || !song) {
      setLocalProgress(0);
      console.log(`⚠️  [跳过] actualIndex:${actualIndex}, song:${song?.title || 'null'}, audioRef:${!!audioRef.current}`);
      return;
    }
    
    console.log(`🔄 [音频+播放控制] actualIndex:${actualIndex}, 歌曲:${song.title}, isPlaying:${gameState.isPlaying}`);
    
    // 1. 先加载音频
    const currentSrc = audioRef.current.src;
    const needsReload = !currentSrc || !currentSrc.includes(song.path);
    
    // 先确保音频不会循环播放
    if (audioRef.current) {
      audioRef.current.loop = false; // 关键：禁用循环
    }
    
    if (needsReload) {
      console.log(`🎵 [加载新歌] ${song.title}`);
      audioRef.current.pause();
      audioRef.current.loop = false; // 确保新歌也不循环
      audioRef.current.src = song.path;
      audioRef.current.load();
      
      const startTime = song.segmentStart || 0;
      const setStartPosition = () => {
        if (audioRef.current) {
          audioRef.current.currentTime = startTime;
          console.log(`⏱️  [音频就绪] 起始:${startTime}s`);
        }
      };
      
      audioRef.current.onloadedmetadata = setStartPosition;
      if (audioRef.current.readyState >= 2) {
        setStartPosition();
      }
      
      setLocalProgress(0);
      setHasAnsweredCurrentQuestion(false);
    }
    
    // 2. 根据isPlaying状态控制播放
    if (gameState.isPlaying) {
      console.log(`▶️  [开始播放] ${song.title}`);
      
      // 等待音频加载完成后播放
      const tryPlay = () => {
        if (audioRef.current && audioRef.current.readyState >= 2) {
          audioRef.current.play().catch(err => {
            console.error('播放失败:', err);
            // 如果立即播放失败，等待一下再试
            setTimeout(() => {
              if (audioRef.current && gameState.isPlaying) {
                audioRef.current.play().catch(e => console.error('重试播放失败:', e));
              }
            }, 100);
          });
        } else {
          // 音频还没准备好，等待
          console.log(`⏳ [等待音频加载] readyState:${audioRef.current?.readyState}`);
          audioRef.current.oncanplay = () => {
            if (gameState.isPlaying) {
              audioRef.current.play().catch(err => console.error('延迟播放失败:', err));
            }
          };
        }
      };
      
      tryPlay();
      
      const startTime = song.segmentStart || 0;
      
      // 本地监控播放进度和时长
      timerRef.current = setInterval(() => {
        if (!audioRef.current) return;
        
        const currentTime = audioRef.current.currentTime;
        const elapsed = currentTime - startTime;
        
        setLocalProgress(Math.min(elapsed, maxDuration));
        
        if (elapsed >= maxDuration || audioRef.current.ended) {
          console.log(`⏹️  [播放结束] elapsed:${elapsed.toFixed(1)}s, maxDuration:${maxDuration}s`);
          
          // 强制暂停并重置到起始位置
          audioRef.current.pause();
          audioRef.current.currentTime = startTime;
          
          setLocalProgress(maxDuration);
          
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          
          if (isHost) {
            handlePlaybackFinish();
          }
        }
      }, 100);
      
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    } else {
      // 暂停播放
      console.log(`⏸️  [暂停] paused:${audioRef.current.paused}, currentTime:${audioRef.current.currentTime}`);
      
      // 强制暂停，即使音频正在播放
      if (!audioRef.current.paused) {
        audioRef.current.pause();
      }
      
      // 清理所有播放相关的事件监听
      audioRef.current.oncanplay = null;
      audioRef.current.onended = null;
      
      setLocalProgress(0);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [gameState.isPlaying, gameState.currentIndex, gameSongs, maxDuration, isHost, songIndex]);

  // 监听题目变化，重置本地答题标记
  useEffect(() => {
    setHasAnsweredCurrentQuestion(false);
  }, [songIndex, currentSong]);

  // 自动滚动消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 点击其他地方关闭踢人按钮
  useEffect(() => {
    const handleClickOutside = () => {
      if (showKickButton) {
        setShowKickButton(null);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showKickButton]);

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
    
    // 检查是否所有人都答对了
    const allAnswered = gameState.correctPlayers && 
      gameState.correctPlayers.length >= players.length;
    
    if (allAnswered) {
      // 所有人都答对了，直接公布答案进入下一题
      await handleRevealAnswer();
    } else {
      await updateGameState(roomId, {
        ...gameState,
        isPlaying: false,
        hasFinishedFirstPlay: true,
        isCountingDown: timeLimit > 0,
        countdown: timeLimit
      });
    }
  };

  // 房主：开始游戏/播放下一题
  const handleHostStart = async () => {
    if (!isHost) return;
    
    // 重置本地答题标记（新题目开始）
    setHasAnsweredCurrentQuestion(false);
    
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

    // 使用正确的歌曲索引
    const actualIndex = gameState.currentIndex !== undefined ? gameState.currentIndex : songIndex;
    const song = gameSongs[actualIndex];
    if (!song) return;

    const inputText = inputVal.trim();
    const artist = ARTISTS.find(a => a.id === song.artistId);
    const isCorrect = gameState.active && 
      (inputText.toLowerCase() === song.title.toLowerCase() ||
       inputText === artist?.name);

    // 检查是否已经答对过
    const alreadyAnswered = gameState.correctPlayers?.includes(currentUserId);
    
    // 如果已经答对过，直接返回，不发送任何消息
    if (alreadyAnswered && isCorrect) {
      setInputVal('');
      return;
    }

    // 答案屏蔽：替换消息中的答案为<正确答案>
    let displayText = inputText;
    if (gameState.active) {
      // 屏蔽歌曲名
      const titleRegex = new RegExp(song.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      displayText = displayText.replace(titleRegex, '<正确答案>');
      
      // 屏蔽歌手名
      if (artist?.name) {
        const artistRegex = new RegExp(artist.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        displayText = displayText.replace(artistRegex, '<正确答案>');
      }
    }

    const newMessage = {
      id: Date.now().toString(),
      playerId: currentUserId || 'unknown',
      playerName: players.find(p => p.id === currentUserId)?.name || '我',
      text: displayText,
      type: 'user',
      timestamp: Date.now()
    };

    await sendMessage(roomId, newMessage);
    setInputVal('');

    if (isCorrect && gameState.active) {
      // 本地检查：如果当前题目已经答对过，直接返回
      if (hasAnsweredCurrentQuestion) {
        console.log('本地检测：当前题目已答对，不能重复得分');
        return;
      }
      
      // 标记本地已答对
      setHasAnsweredCurrentQuestion(true);
      
      // 所有人答对都得1分
      const score = 1;
      const currentPlayer = players.find(p => p.id === currentUserId);
      
      // 立即更新本地分数
      const updatedPlayers = players.map(p => 
        p.id === currentUserId ? { ...p, score: (p.score || 0) + score } : p
      );
      setPlayers(updatedPlayers);
      
      // 同步到Firebase
      try {
        const { updateDoc, doc: firestoreDoc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../firebase');
        const roomRef = firestoreDoc(db, 'rooms', roomId);
        
        // 获取最新数据
        const roomSnap = await getDoc(roomRef);
        const roomData = roomSnap.data();
        const currentCorrectPlayers = roomData.gameState?.correctPlayers || [];
        const latestPlayers = roomData.players || [];
        
        // 更新答对列表（如果还没有的话）
        const newCorrectPlayers = currentCorrectPlayers.includes(currentUserId) 
          ? currentCorrectPlayers 
          : [...currentCorrectPlayers, currentUserId];
        
        // 更新玩家分数（基于最新数据）
        const syncedPlayers = latestPlayers.map(p => 
          p.id === currentUserId ? { ...p, score: (p.score || 0) + score } : p
        );
        
        await updateDoc(roomRef, {
          'gameState.correctPlayers': newCorrectPlayers,
          players: syncedPlayers,
          updatedAt: Date.now()
        });
        
        const totalPlayers = latestPlayers.length;
        
        // 延迟发送系统消息
        setTimeout(async () => {
          const artistInfo = ARTISTS.find(a => a.id === song.artistId);
          
          // 系统消息：XX答对了！- 不显示答案和分数
          await sendMessage(roomId, {
            id: Date.now().toString(),
            playerId: 'system',
            playerName: 'System',
            text: `🎉 ${currentPlayer?.name} 答对了！`,
            type: 'correct',
            timestamp: Date.now()
          });
          
          // 本地消息：给自己显示完整答案（不显示分数）
          setMessages(prev => [...prev, {
            id: `local-${Date.now()}`,
            playerId: 'system',
            playerName: 'System',
            text: `🎉 ${currentPlayer?.name} 答对了！正确答案：《${song.title}》 - ${artistInfo?.name}`,
            type: 'correct',
            timestamp: Date.now(),
            isLocal: true
          }]);
          
          // 检查是否所有人都答对了（使用最新玩家数量）
          if (isHost && newCorrectPlayers.length >= totalPlayers) {
            // 所有人都答对了，1秒后自动公布答案进入下一题
            setTimeout(() => {
              handleRevealAnswer();
            }, 1000);
          }
        }, 300);
      } catch (error) {
        console.error('答题处理失败:', error);
        // 如果是因为已经答对过导致的错误，静默处理
        if (error.message && error.message.includes('已经答对')) {
          return;
        }
      }
    }
  };

  // 房主：提前公布答案
  const handleRevealAnswer = async () => {
    if (!isHost) return;
    
    // 使用正确的歌曲索引
    const actualIndex = gameState.currentIndex !== undefined ? gameState.currentIndex : songIndex;
    const song = gameSongs[actualIndex];
    if (!song) return;
    
    const artist = ARTISTS.find(a => a.id === song.artistId);
    const isLastSong = songIndex + 1 >= totalSongs;
    
    // 发送答案公布消息
    await sendMessage(roomId, {
      id: `reveal-${Date.now()}`,
      playerId: 'system',
      playerName: 'System',
      text: `🎵 答案揭晓：《${song.title}》 - ${artist?.name}`,
      type: 'reveal',
      timestamp: Date.now()
    });
    
    if (isLastSong) {
      // 最后一题，标记游戏结束
      await updateGameState(roomId, {
        ...gameState,
        active: false,
        isCountingDown: false,
        countdown: 0,
        gameEnded: true, // 标记游戏结束
      });
      
      setTimeout(async () => {
        await sendMessage(roomId, {
          id: `game-end-${Date.now()}`,
          playerId: 'system',
          playerName: 'System',
          text: '🎊 游戏结束！点击下方按钮查看结算...',
          type: 'system',
          timestamp: Date.now()
        });
      }, 500);
    } else {
      // 不是最后一题，显示等待提示
      await updateGameState(roomId, {
        ...gameState,
        active: false,
        isCountingDown: false,
        countdown: 0
      });
      
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
    }
  };

  // 使用正确的歌曲索引获取当前歌曲
  const actualIndex = gameState.currentIndex !== undefined ? gameState.currentIndex : songIndex;
  const actualCurrentSong = gameSongs[actualIndex] || currentSong;
  
  if (!actualCurrentSong) return null;

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans overflow-hidden">
      
      {/* Header */}
      <div className="bg-white p-3 shadow-sm flex justify-between items-center rounded-b-3xl z-20 shrink-0">
        <div className="flex items-center gap-2">
          <button 
            onClick={onHome}
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
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-2xl ${
                    isMe 
                      ? 'ring-2 ring-green-400 shadow-lg shadow-green-200' 
                      : 'shadow-md'
                  } ${isHost && !isMe ? 'cursor-pointer' : ''}`}
                  onClick={(e) => {
                    if (isHost && !isMe) {
                      e.stopPropagation(); // 阻止事件冒泡
                      setShowKickButton(showKickButton === p.id ? null : p.id);
                    }
                  }}
                >
                  {p.avatar}
                </div>
                {idx === 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center shadow-sm">
                    <Crown size={10} className="text-yellow-900" />
                  </div>
                )}
                {/* 房主点击头像后显示踢人按钮 */}
                {isHost && !isMe && showKickButton === p.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`确定要将 ${p.name} 踢出房间吗？`)) {
                        handleKick(p.id);
                        setShowKickButton(null);
                      }
                    }}
                    className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 active:scale-90 transition z-20"
                    title={`踢出 ${p.name}`}
                  >
                    <X size={10} strokeWidth={3} />
                  </button>
                )}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center text-[9px] font-black shadow-sm border-2 border-white">
                  {p.score || 0}
                </div>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[9px] font-bold text-slate-500 truncate max-w-[60px]">{p.name}</span>
                {playersInResults.includes(p.id) && (
                  <span className="text-[8px] font-bold text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded-full mt-0.5">结算中</span>
                )}
              </div>
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
             {Math.floor(localProgress)}s
           </span>
           <div className="flex-1 relative h-1.5 bg-slate-100 rounded-lg overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-100"
                  style={{ 
                    width: `${Math.min((localProgress / maxDuration) * 100, 100)}%`
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

      {/* Chat Input or Results/Restart Buttons - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 w-full bg-gradient-to-t from-white via-white to-transparent z-30 max-w-md mx-auto right-0">
        {gameState.gameEnded ? (
          <div className="p-4 space-y-2">
            {isHost && (
              <button
                onClick={onRestart}
                className="w-full py-4 bg-green-500 text-white text-lg font-black rounded-full shadow-xl hover:bg-green-600 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw size={20} /> 再玩一次
              </button>
            )}
            <button
              onClick={onEndGame}
              className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-lg font-black rounded-full shadow-xl hover:from-purple-600 hover:to-pink-600 active:scale-95 transition-all"
            >
              🏆 查看结算
            </button>
          </div>
        ) : (
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
        )}
      </div>

      {showInviteModal && (
        <InviteModal roomId={roomId} onClose={() => setShowInviteModal(false)} />
      )}

      <audio ref={audioRef} />
    </div>
  );
};

export default OnlineGameScreen;
