import React, { useState, useEffect, useRef } from 'react'
import { db } from '../firebase'
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  updateDoc, 
  arrayUnion,
  serverTimestamp 
} from 'firebase/firestore'
import { getArtistSongs } from '../data/songs'

function OnlineGame({ settings, roomId: initialRoomId, onExit }) {
  const [roomId, setRoomId] = useState(initialRoomId || generateRoomId())
  const [isHost, setIsHost] = useState(!initialRoomId)
  const [players, setPlayers] = useState([])
  const [currentUserId] = useState(generateUserId())
  const [gameState, setGameState] = useState('waiting') // waiting, playing, result
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentSong, setCurrentSong] = useState(null)
  const [songQueue, setSongQueue] = useState([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false)
  const [timer, setTimer] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [showAnswer, setShowAnswer] = useState(false)
  const [segmentStart, setSegmentStart] = useState(0)
  const [segmentDuration, setSegmentDuration] = useState(0)
  
  const audioRef = useRef(null)
  const timerRef = useRef(null)
  const progressIntervalRef = useRef(null)
  const messagesEndRef = useRef(null)

  // 生成房间号
  function generateRoomId() {
    return Math.floor(1000 + Math.random() * 9000).toString()
  }

  // 生成用户ID
  function generateUserId() {
    return 'user_' + Date.now() + '_' + Math.floor(Math.random() * 1000)
  }

  // 初始化房间
  useEffect(() => {
    if (isHost) {
      createRoom()
    } else {
      joinRoom()
    }

    // 监听房间状态
    const roomRef = doc(db, 'rooms', roomId)
    const unsubscribe = onSnapshot(roomRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data()
        setPlayers(data.players || [])
        setGameState(data.gameState || 'waiting')
        setCurrentIndex(data.currentIndex || 0)
        
        if (data.isPlaying !== undefined) {
          setIsPlaying(data.isPlaying)
        }
        
        if (data.songQueue && data.songQueue.length > 0) {
          setSongQueue(data.songQueue)
          if (data.currentIndex < data.songQueue.length) {
            const song = data.songQueue[data.currentIndex]
            if (song && song !== currentSong) {
              loadSong(song)
            }
          }
        }
      }
    })

    // 监听消息
    const messagesRef = collection(db, 'rooms', roomId, 'messages')
    const unsubscribeMessages = onSnapshot(messagesRef, (snapshot) => {
      const msgs = []
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() })
      })
      msgs.sort((a, b) => a.createdAt - b.createdAt)
      setMessages(msgs)
      
      // 检查是否有人答对
      if (currentSong && !showAnswer) {
        const correctAnswer = msgs.find(msg => 
          msg.text.includes(currentSong.name) && 
          msg.createdAt > Date.now() - 60000 // 最近1分钟内的消息
        )
        if (correctAnswer) {
          handleCorrectAnswer(correctAnswer.userId, correctAnswer.userName)
        }
      }
    })

    return () => {
      unsubscribe()
      unsubscribeMessages()
      if (timerRef.current) clearInterval(timerRef.current)
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
    }
  }, [roomId])

  // 滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 创建房间
  const createRoom = async () => {
    // 初始化歌曲队列
    const songs = []
    settings.selectedArtists.forEach(artist => {
      songs.push(...getArtistSongs(artist))
    })
    const shuffled = songs.sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, settings.questionCount)

    const roomData = {
      roomId,
      hostId: currentUserId,
      players: [{
        userId: currentUserId,
        userName: '房主',
        correct: 0,
        wrong: 0,
        isHost: true
      }],
      settings,
      songQueue: selected,
      currentIndex: 0,
      gameState: 'waiting',
      isPlaying: false,
      active: true,
      createdAt: Date.now()
    }

    try {
      await setDoc(doc(db, 'rooms', roomId), roomData)
      setSongQueue(selected)
      if (selected.length > 0) {
        loadSong(selected[0])
      }
    } catch (error) {
      console.error('创建房间失败:', error)
      alert('创建房间失败，请重试')
    }
  }

  // 加入房间
  const joinRoom = async () => {
    try {
      const roomRef = doc(db, 'rooms', roomId)
      const roomSnap = await getDoc(roomRef)
      
      if (!roomSnap.exists()) {
        alert('房间不存在')
        onExit()
        return
      }

      const userName = prompt('请输入你的名字:') || '玩家'
      
      await updateDoc(roomRef, {
        players: arrayUnion({
          userId: currentUserId,
          userName,
          correct: 0,
          wrong: 0,
          isHost: false
        })
      })

      // 发送加入消息
      await sendSystemMessage(`${userName} 加入了房间`)
    } catch (error) {
      console.error('加入房间失败:', error)
      alert('加入房间失败，请重试')
    }
  }

  // 加载歌曲
  const loadSong = (song) => {
    if (!song) return
    
    setCurrentSong(song)
    setShowAnswer(false)
    setHasPlayedOnce(false)
    setProgress(0)
    
    if (audioRef.current) {
      audioRef.current.src = song.path
      audioRef.current.load()
      
      audioRef.current.addEventListener('loadedmetadata', () => {
        const duration = audioRef.current.duration
        let start = 0
        let playDuration = settings.isFullSong ? duration : settings.playDuration
        
        if (settings.playbackPosition === 'RANDOM' && !settings.isFullSong) {
          const maxStart = Math.max(0, duration - settings.playDuration)
          start = Math.random() * maxStart
        }
        
        setSegmentStart(start)
        setSegmentDuration(playDuration)
      }, { once: true })
    }
  }

  // 开始游戏（仅房主）
  const startGameAsHost = async () => {
    if (!isHost) return
    
    try {
      await updateDoc(doc(db, 'rooms', roomId), {
        gameState: 'playing'
      })
      await sendSystemMessage('游戏开始！')
    } catch (error) {
      console.error('开始游戏失败:', error)
    }
  }

  // 播放/暂停音乐（仅房主）
  const togglePlay = async () => {
    if (!isHost) return
    
    try {
      if (isPlaying) {
        pauseMusic()
        await updateDoc(doc(db, 'rooms', roomId), {
          isPlaying: false
        })
      } else {
        playMusic()
        await updateDoc(doc(db, 'rooms', roomId), {
          isPlaying: true
        })
      }
    } catch (error) {
      console.error('控制播放失败:', error)
    }
  }

  // 播放音乐
  const playMusic = () => {
    if (!audioRef.current) return
    
    audioRef.current.currentTime = segmentStart
    audioRef.current.play()
    setIsPlaying(true)
    
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
    }
    progressIntervalRef.current = setInterval(() => {
      if (audioRef.current) {
        const current = audioRef.current.currentTime - segmentStart
        const percent = (current / segmentDuration) * 100
        setProgress(Math.min(percent, 100))
      }
    }, 100)
    
    setTimeout(() => {
      pauseMusic()
      if (!hasPlayedOnce) {
        setHasPlayedOnce(true)
        startAnswerTimer()
      }
    }, segmentDuration * 1000)
  }

  // 暂停音乐
  const pauseMusic = () => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
    setIsPlaying(false)
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
    }
  }

  // 开始答题倒计时
  const startAnswerTimer = () => {
    if (!settings.answerTimeLimit) return
    
    setTimer(settings.answerTimeLimit)
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          if (isHost) {
            showAnswerAndNext()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // 发送消息
  const sendMessage = async () => {
    if (!inputMessage.trim()) return
    
    const currentPlayer = players.find(p => p.userId === currentUserId)
    const userName = currentPlayer?.userName || '玩家'
    
    try {
      const messageData = {
        userId: currentUserId,
        userName,
        text: inputMessage,
        createdAt: Date.now()
      }
      
      await setDoc(
        doc(collection(db, 'rooms', roomId, 'messages')),
        messageData
      )
      
      setInputMessage('')
    } catch (error) {
      console.error('发送消息失败:', error)
    }
  }

  // 发送系统消息
  const sendSystemMessage = async (text) => {
    try {
      await setDoc(
        doc(collection(db, 'rooms', roomId, 'messages')),
        {
          userId: 'system',
          userName: '系统',
          text,
          createdAt: Date.now()
        }
      )
    } catch (error) {
      console.error('发送系统消息失败:', error)
    }
  }

  // 有人答对了
  const handleCorrectAnswer = async (userId, userName) => {
    if (showAnswer) return
    
    setShowAnswer(true)
    pauseMusic()
    
    // 更新答对玩家的分数
    const roomRef = doc(db, 'rooms', roomId)
    const roomSnap = await getDoc(roomRef)
    if (roomSnap.exists()) {
      const data = roomSnap.data()
      const updatedPlayers = data.players.map(p => {
        if (p.userId === userId) {
          return { ...p, correct: (p.correct || 0) + 1 }
        }
        return p
      })
      await updateDoc(roomRef, { players: updatedPlayers })
    }
    
    await sendSystemMessage(`🎉 ${userName} 答对了！答案是：${currentSong.name}`)
    
    // 3秒后下一题
    setTimeout(() => {
      if (isHost) {
        nextQuestion()
      }
    }, 3000)
  }

  // 显示答案并下一题（仅房主）
  const showAnswerAndNext = async () => {
    if (!isHost) return
    
    setShowAnswer(true)
    pauseMusic()
    await sendSystemMessage(`⏰ 时间到！答案是：${currentSong.name}`)
    
    setTimeout(() => {
      nextQuestion()
    }, 3000)
  }

  // 下一题（仅房主）
  const nextQuestion = async () => {
    if (!isHost) return
    
    if (currentIndex + 1 < songQueue.length) {
      await updateDoc(doc(db, 'rooms', roomId), {
        currentIndex: currentIndex + 1,
        isPlaying: false
      })
      setHasPlayedOnce(false)
      setShowAnswer(false)
      setTimer(null)
    } else {
      await updateDoc(doc(db, 'rooms', roomId), {
        gameState: 'result'
      })
      await sendSystemMessage('🎊 游戏结束！')
    }
  }

  // 复制房间号
  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId)
    alert('房间号已复制到剪贴板')
  }

  // 获取排行榜
  const getLeaderboard = () => {
    return [...players].sort((a, b) => {
      if (b.correct !== a.correct) return b.correct - a.correct
      return (a.wrong || 0) - (b.wrong || 0)
    })
  }

  if (gameState === 'waiting') {
    return (
      <div className="online-game">
        <div className="game-container">
          <h2 className="game-title">等待游戏开始</h2>
          
          <div className="room-info">
            <div className="room-id-display">
              <span>房间号: {roomId}</span>
              <button onClick={copyRoomId} className="copy-btn">
                📋 复制
              </button>
            </div>
          </div>

          <div className="players-list">
            <h3>房间内玩家 ({players.length})</h3>
            {players.map((player, index) => (
              <div key={index} className="player-item">
                <span className="player-avatar">👤</span>
                <span className="player-name">
                  {player.userName}
                  {player.isHost && <span className="host-badge">（房主）</span>}
                </span>
              </div>
            ))}
          </div>

          {isHost ? (
            <button onClick={startGameAsHost} className="start-btn">
              开始游戏
            </button>
          ) : (
            <p className="waiting-text">等待房主开始游戏...</p>
          )}

          <button onClick={onExit} className="exit-btn">
            退出房间
          </button>
        </div>
      </div>
    )
  }

  if (gameState === 'result') {
    const leaderboard = getLeaderboard()
    return (
      <div className="online-game">
        <div className="game-container">
          <h1 className="result-title">🎊 游戏结束</h1>
          
          <div className="leaderboard">
            {leaderboard.map((player, index) => (
              <div key={index} className={`leaderboard-item rank-${index + 1}`}>
                <div className="rank-badge">
                  {index === 0 && '🥇'}
                  {index === 1 && '🥈'}
                  {index === 2 && '🥉'}
                  {index > 2 && `#${index + 1}`}
                </div>
                <div className="player-info">
                  <div className="player-name">{player.userName}</div>
                  <div className="player-score">
                    ✓ {player.correct} | ✗ {player.wrong || 0}
                  </div>
                </div>
                <div className="player-total">
                  {player.correct} 分
                </div>
              </div>
            ))}
          </div>

          <button onClick={onExit} className="home-btn">
            返回首页
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="online-game">
      <audio ref={audioRef} />
      
      <div className="game-layout">
        {/* 左侧 - 游戏区 */}
        <div className="game-area">
          <div className="game-header">
            <div className="question-info">
              第 {currentIndex + 1}/{songQueue.length} 题
            </div>
            <div className="room-id-small">房间: {roomId}</div>
          </div>

          <div className="music-player">
            <div className="album-display">
              <div className="album-icon">🎵</div>
              <div className="album-info">
                <p className="album-name">{currentSong?.album}</p>
                <p className="album-hint">在聊天框输入歌名</p>
              </div>
            </div>

            <div className="progress-bar-container">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="progress-time">
                {Math.floor((progress / 100) * segmentDuration)}s / {Math.floor(segmentDuration)}s
              </div>
            </div>

            {isHost && (
              <div className="control-buttons">
                <button
                  onClick={togglePlay}
                  disabled={gameState !== 'playing'}
                  className="control-btn play-btn"
                >
                  {isPlaying ? '⏸️ 暂停' : '▶️ 播放'}
                </button>
              </div>
            )}

            {hasPlayedOnce && timer !== null && !showAnswer && (
              <div className="timer-display">
                ⏱️ {timer}s
              </div>
            )}

            {showAnswer && (
              <div className="answer-display">
                <div className="answer-label">答案</div>
                <div className="answer-name">{currentSong?.name}</div>
              </div>
            )}
          </div>

          <div className="players-score">
            {players.map((player, index) => (
              <div key={index} className="player-score-item">
                <div className="player-name">{player.userName}</div>
                <div className="player-stats">
                  <span className="correct">✓ {player.correct}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 右侧 - 聊天区 */}
        <div className="chat-area">
          <div className="chat-header">💬 聊天</div>
          <div className="messages-container">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`message ${msg.userId === 'system' ? 'system-message' : ''} ${msg.userId === currentUserId ? 'my-message' : ''}`}
              >
                <span className="message-user">{msg.userName}: </span>
                <span className="message-text">{msg.text}</span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="chat-input-area">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="输入歌名..."
              className="chat-input"
            />
            <button onClick={sendMessage} className="send-btn">
              发送
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OnlineGame

