import React, { useState } from 'react'
import { artists, getArtistSongs } from '../data/songs'

function HomePage({ onStartLocal, onStartOnline, onJoinRoom }) {
  const [gameMode, setGameMode] = useState('local') // local or online
  const [selectedArtists, setSelectedArtists] = useState(['周杰伦'])
  const [playDuration, setPlayDuration] = useState(15)
  const [isFullSong, setIsFullSong] = useState(false)
  const [playbackPosition, setPlaybackPosition] = useState('RANDOM') // RANDOM or START
  const [questionCount, setQuestionCount] = useState(5)
  const [answerTimeLimit, setAnswerTimeLimit] = useState(30)
  const [isUnlimitedTime, setIsUnlimitedTime] = useState(false)

  // 获取选中歌手的总歌曲数
  const getTotalSongs = () => {
    let total = 0
    selectedArtists.forEach(artist => {
      total += getArtistSongs(artist).length
    })
    return total
  }

  // 切换歌手选择
  const toggleArtist = (artist) => {
    if (selectedArtists.includes(artist)) {
      // 至少保留一个歌手
      if (selectedArtists.length > 1) {
        setSelectedArtists(selectedArtists.filter(a => a !== artist))
      }
    } else {
      setSelectedArtists([...selectedArtists, artist])
    }
  }

  // 验证并开始游戏
  const handleStart = () => {
    if (selectedArtists.length === 0) {
      alert('请至少选择一个歌手')
      return
    }

    const totalSongs = getTotalSongs()
    if (questionCount > totalSongs) {
      alert(`题目数量不能超过歌曲总数（${totalSongs}首）`)
      return
    }

    const settings = {
      selectedArtists,
      playDuration: isFullSong ? null : playDuration,
      isFullSong,
      playbackPosition,
      questionCount,
      answerTimeLimit: isUnlimitedTime ? null : answerTimeLimit
    }

    if (gameMode === 'local') {
      onStartLocal(settings)
    } else {
      onStartOnline(settings)
    }
  }

  const maxSongs = getTotalSongs()

  return (
    <div className="home-page">
      <div className="home-container">
        {/* 标题 */}
        <div className="home-header">
          <h1 className="home-title">🎵 听歌猜名</h1>
          <p className="home-subtitle">选择你的游戏模式 ✨</p>
        </div>

        {/* 游戏模式选择 */}
        <div className="mode-selector">
          <button
            className={`mode-button ${gameMode === 'local' ? 'active' : ''}`}
            onClick={() => setGameMode('local')}
          >
            <div className="mode-icon">👥</div>
            <div className="mode-name">本地同玩</div>
          </button>
          <button
            className={`mode-button ${gameMode === 'online' ? 'active' : ''}`}
            onClick={() => setGameMode('online')}
          >
            <div className="mode-icon">⚡</div>
            <div className="mode-name">线上联机</div>
          </button>
        </div>

        {/* 加入房间按钮（仅在线模式显示） */}
        {gameMode === 'online' && (
          <button className="join-room-btn" onClick={onJoinRoom}>
            → 加入房间
          </button>
        )}

        {/* 谁的歌？ */}
        <div className="setting-section">
          <div className="section-title">
            <span className="section-icon">♫</span>
            谁的歌？
          </div>
          <div className="artists-grid">
            {Object.keys(artists).map(artist => (
              <button
                key={artist}
                className={`artist-button ${selectedArtists.includes(artist) ? 'selected' : ''}`}
                onClick={() => toggleArtist(artist)}
              >
                <div className="artist-avatar">
                  <img src="/caige/img/zjl.png" alt={artist} />
                </div>
                <div className="artist-name">{artist}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 难度设置 */}
        <div className="setting-section">
          <div className="section-title">
            <span className="section-icon">⚙️</span>
            难度设置
          </div>

          {/* 播放时长 */}
          <div className="setting-item">
            <div className="setting-header">
              <label>播放时长</label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isFullSong}
                  onChange={(e) => setIsFullSong(e.target.checked)}
                />
                整首？
              </label>
            </div>
            {!isFullSong && (
              <div className="slider-container">
                <span className="slider-label">2s</span>
                <input
                  type="range"
                  min="2"
                  max="30"
                  value={playDuration}
                  onChange={(e) => setPlayDuration(Number(e.target.value))}
                  className="slider"
                />
                <span className="slider-label">30s</span>
                <div className="slider-value">{playDuration} 秒</div>
              </div>
            )}
          </div>

          {/* 从哪里开始听？ */}
          <div className="setting-item">
            <label>从哪里开始听？</label>
            <div className="button-group">
              <button
                className={`toggle-button ${playbackPosition === 'RANDOM' ? 'active' : ''}`}
                onClick={() => setPlaybackPosition('RANDOM')}
              >
                🎲 随机片段
              </button>
              <button
                className={`toggle-button ${playbackPosition === 'START' ? 'active' : ''}`}
                onClick={() => setPlaybackPosition('START')}
              >
                ⏮️ 从头开始
              </button>
            </div>
          </div>
        </div>

        {/* 规则 */}
        <div className="setting-section">
          <div className="section-title">
            <span className="section-icon">⏰</span>
            规则
          </div>

          {/* 题目数量 */}
          <div className="setting-item">
            <div className="setting-header">
              <label>题目数量</label>
              <span className="count-badge">{questionCount} 首</span>
            </div>
            <input
              type="range"
              min="1"
              max={maxSongs}
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="slider"
            />
          </div>

          {/* 答题限时 */}
          <div className="setting-item">
            <label>答题限时</label>
            {!isUnlimitedTime ? (
              <div className="time-options">
                {[5, 10, 15, 30, 60].map(time => (
                  <button
                    key={time}
                    className={`time-button ${answerTimeLimit === time ? 'active' : ''}`}
                    onClick={() => setAnswerTimeLimit(time)}
                  >
                    {time}s
                  </button>
                ))}
                <button
                  className="time-button"
                  onClick={() => setIsUnlimitedTime(true)}
                >
                  ∞
                </button>
              </div>
            ) : (
              <div className="time-options">
                <button className="time-button active">无限制</button>
                <button
                  className="time-button"
                  onClick={() => setIsUnlimitedTime(false)}
                >
                  设置时间
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 开始按钮 */}
        <button className="start-game-button" onClick={handleStart}>
          ▶ {gameMode === 'local' ? '开始本地游戏' : '创建房间'}
        </button>
      </div>
    </div>
  )
}

export default HomePage

