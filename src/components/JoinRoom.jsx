import React, { useState } from 'react'

function JoinRoom({ onJoin, onBack }) {
  const [roomId, setRoomId] = useState('')

  const handleJoin = () => {
    if (!roomId.trim()) {
      alert('请输入房间号')
      return
    }
    
    // 这里会从 Firebase 读取房间设置
    // 暂时使用默认设置
    const settings = {
      selectedArtists: ['周杰伦'],
      playDuration: 15,
      isFullSong: false,
      playbackPosition: 'RANDOM',
      questionCount: 5,
      answerTimeLimit: 30
    }
    
    onJoin(settings, roomId.trim())
  }

  return (
    <div className="join-room">
      <div className="join-container">
        <button onClick={onBack} className="back-btn">
          ← 返回
        </button>

        <div className="join-header">
          <div className="join-icon">→</div>
          <h2 className="join-title">加入游戏</h2>
          <p className="join-subtitle">请输入好友分享的房间号</p>
        </div>

        <div className="room-input-container">
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="例如：8821"
            className="room-input"
            maxLength={6}
          />
        </div>

        <button onClick={handleJoin} className="join-btn">
          进入房间 🚀
        </button>
      </div>
    </div>
  )
}

export default JoinRoom

