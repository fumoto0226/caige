import React, { useState, useRef, useEffect } from 'react'
import { getArtistSongs } from '../data/songs'

function LocalGame({ settings, onExit }) {
  const [gameState, setGameState] = useState('setup') // setup, playing, scoring, result
  const [playerCount, setPlayerCount] = useState(1)
  const [players, setPlayers] = useState([{ name: '玩家1', correct: 0, wrong: 0 }])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentSong, setCurrentSong] = useState(null)
  const [songQueue, setSongQueue] = useState([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  const [timer, setTimer] = useState(null)
  const [progress, setProgress] = useState(0)
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false)
  const [segmentStart, setSegmentStart] = useState(0)
  const [segmentDuration, setSegmentDuration] = useState(0)
  
  const audioRef = useRef(null)
  const timerRef = useRef(null)
  const progressIntervalRef = useRef(null)

  // 初始化歌曲队列
  useEffect(() => {
    const songs = []
    settings.selectedArtists.forEach(artist => {
      songs.push(...getArtistSongs(artist))
    })
    
    // 随机打乱并选取指定数量
    const shuffled = songs.sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, settings.questionCount)
    setSongQueue(selected)
    
    if (selected.length > 0) {
      loadSong(selected[0])
    }
  }, [])

  // 加载歌曲
  const loadSong = (song) => {
    setCurrentSong(song)
    setShowAnswer(false)
    setHasPlayedOnce(false)
    setProgress(0)
    
    if (audioRef.current) {
      audioRef.current.src = song.path
      audioRef.current.load()
      
      // 等待音频加载完成后设置播放片段
      audioRef.current.addEventListener('loadedmetadata', () => {
        const duration = audioRef.current.duration
        let start = 0
        let playDuration = settings.isFullSong ? duration : settings.playDuration
        
        if (settings.playbackPosition === 'RANDOM' && !settings.isFullSong) {
          // 随机选择一个起始点
          const maxStart = Math.max(0, duration - settings.playDuration)
          start = Math.random() * maxStart
        }
        
        setSegmentStart(start)
        setSegmentDuration(playDuration)
      }, { once: true })
    }
  }

  // 开始游戏
  const startGame = () => {
    if (players.length === 0) {
      alert('请至少添加一位玩家')
      return
    }
    setGameState('playing')
  }

  // 播放音乐
  const playMusic = () => {
    if (!audioRef.current || !currentSong) return
    
    audioRef.current.currentTime = segmentStart
    audioRef.current.play()
    setIsPlaying(true)
    
    // 更新进度条
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
    
    // 设置停止时间
    const stopTimer = setTimeout(() => {
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

  // 重播
  const replayMusic = () => {
    if (!hasPlayedOnce) return
    pauseMusic()
    setProgress(0)
    playMusic()
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
          handleShowAnswer()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // 显示答案
  const handleShowAnswer = () => {
    pauseMusic()
    setShowAnswer(true)
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    setGameState('scoring')
  }

  // 记录玩家答题结果
  const recordAnswer = (playerIndex, isCorrect) => {
    const newPlayers = [...players]
    if (isCorrect) {
      newPlayers[playerIndex].correct++
    } else {
      newPlayers[playerIndex].wrong++
    }
    setPlayers(newPlayers)
  }

  // 下一题
  const nextQuestion = () => {
    if (currentIndex + 1 < songQueue.length) {
      setCurrentIndex(currentIndex + 1)
      loadSong(songQueue[currentIndex + 1])
      setGameState('playing')
      setTimer(null)
    } else {
      // 游戏结束
      setGameState('result')
    }
  }

  // 添加玩家
  const addPlayer = () => {
    const newPlayers = [...players, {
      name: `玩家${players.length + 1}`,
      correct: 0,
      wrong: 0
    }]
    setPlayers(newPlayers)
    setPlayerCount(newPlayers.length)
  }

  // 删除玩家
  const removePlayer = (index) => {
    if (players.length === 1) return
    const newPlayers = players.filter((_, i) => i !== index)
    setPlayers(newPlayers)
    setPlayerCount(newPlayers.length)
  }

  // 编辑玩家名字
  const editPlayerName = (index, name) => {
    const newPlayers = [...players]
    newPlayers[index].name = name
    setPlayers(newPlayers)
  }

  // 拖动进度条
  const handleProgressDrag = (e) => {
    if (!hasPlayedOnce || !audioRef.current) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    const newTime = segmentStart + (segmentDuration * percent)
    audioRef.current.currentTime = newTime
    setProgress(percent * 100)
  }

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
    }
  }, [])

  // 排行榜数据
  const getLeaderboard = () => {
    return [...players].sort((a, b) => {
      if (b.correct !== a.correct) return b.correct - a.correct
      return a.wrong - b.wrong
    })
  }

  if (gameState === 'setup') {
    return (
      <div className="local-game">
        <div className="game-container">
          <h2 className="game-title">设置游戏人数</h2>
          
          <div className="players-setup">
            {players.map((player, index) => (
              <div key={index} className="player-setup-item">
                <input
                  type="text"
                  value={player.name}
                  onChange={(e) => editPlayerName(index, e.target.value)}
                  className="player-name-input"
                  placeholder={`玩家${index + 1}`}
                />
                {players.length > 1 && (
                  <button
                    onClick={() => removePlayer(index)}
                    className="remove-player-btn"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            
            <button onClick={addPlayer} className="add-player-btn">
              + 添加玩家
            </button>
          </div>

          <div className="setup-actions">
            <button onClick={startGame} className="start-btn">
              开始游戏
            </button>
            <button onClick={onExit} className="exit-btn">
              返回首页
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (gameState === 'result') {
    const leaderboard = getLeaderboard()
    return (
      <div className="local-game">
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
                  <div className="player-name">{player.name}</div>
                  <div className="player-score">
                    ✓ {player.correct} | ✗ {player.wrong}
                  </div>
                </div>
                <div className="player-total">
                  {player.correct} 分
                </div>
              </div>
            ))}
          </div>

          <div className="result-actions">
            <button onClick={onExit} className="home-btn">
              返回首页
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="local-game">
      <audio ref={audioRef} />
      
      <div className="game-container">
        {/* 头部信息 */}
        <div className="game-header">
          <div className="question-info">
            第 {currentIndex + 1}/{songQueue.length} 题
          </div>
          <button onClick={onExit} className="exit-btn-small">
            结束游戏
          </button>
        </div>

        {/* 音乐播放区 */}
        <div className="music-player">
          <div className="album-display">
            <div className="album-icon">🎵</div>
            <div className="album-info">
              <p className="album-name">{currentSong?.album}</p>
              <p className="album-hint">听音乐，猜歌名</p>
            </div>
          </div>

          {/* 进度条 */}
          <div 
            className="progress-bar-container"
            onClick={hasPlayedOnce ? handleProgressDrag : null}
            style={{ cursor: hasPlayedOnce ? 'pointer' : 'default' }}
          >
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

          {/* 控制按钮 */}
          <div className="control-buttons">
            <button
              onClick={playMusic}
              disabled={isPlaying || (!hasPlayedOnce && gameState === 'scoring')}
              className="control-btn play-btn"
            >
              {isPlaying ? '⏸️ 暂停' : '▶️ 播放'}
            </button>
            {hasPlayedOnce && (
              <button
                onClick={replayMusic}
                disabled={isPlaying}
                className="control-btn replay-btn"
              >
                🔄 重播
              </button>
            )}
          </div>

          {/* 倒计时 */}
          {hasPlayedOnce && timer !== null && !showAnswer && (
            <div className="timer-display">
              ⏱️ {timer}s
            </div>
          )}

          {/* 查看答案按钮 */}
          {gameState === 'playing' && hasPlayedOnce && !showAnswer && (
            <button onClick={handleShowAnswer} className="show-answer-btn">
              查看答案
            </button>
          )}
        </div>

        {/* 答案和计分区 */}
        {showAnswer && (
          <div className="answer-section">
            <div className="answer-display">
              <div className="answer-label">正确答案</div>
              <div className="answer-name">{currentSong?.name}</div>
              <div className="answer-album">{currentSong?.album}</div>
            </div>

            {gameState === 'scoring' && (
              <div className="scoring-section">
                <div className="scoring-title">记录答题结果</div>
                {players.map((player, index) => (
                  <div key={index} className="scoring-item">
                    <span className="player-name">{player.name}</span>
                    <div className="scoring-buttons">
                      <button
                        onClick={() => recordAnswer(index, true)}
                        className="score-btn correct-btn"
                      >
                        ✓ 答对
                      </button>
                      <button
                        onClick={() => recordAnswer(index, false)}
                        className="score-btn wrong-btn"
                      >
                        ✗ 答错
                      </button>
                    </div>
                  </div>
                ))}
                <button onClick={nextQuestion} className="next-btn">
                  完成，下一题 →
                </button>
              </div>
            )}
          </div>
        )}

        {/* 玩家积分显示 */}
        <div className="players-score">
          {players.map((player, index) => (
            <div key={index} className="player-score-item">
              <div className="player-name">{player.name}</div>
              <div className="player-stats">
                <span className="correct">✓ {player.correct}</span>
                <span className="wrong">✗ {player.wrong}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default LocalGame

