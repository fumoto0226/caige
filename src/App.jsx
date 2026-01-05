import React, { useState } from 'react'
import HomePage from './components/HomePage'
import LocalGame from './components/LocalGame'
import OnlineGame from './components/OnlineGame'
import JoinRoom from './components/JoinRoom'

function App() {
  const [screen, setScreen] = useState('home') // home, local, online, join
  const [gameSettings, setGameSettings] = useState(null)
  const [roomId, setRoomId] = useState(null)

  // 开始本地游戏
  const startLocalGame = (settings) => {
    setGameSettings(settings)
    setScreen('local')
  }

  // 开始在线游戏（创建房间）
  const startOnlineGame = (settings) => {
    setGameSettings(settings)
    setScreen('online')
  }

  // 加入在线游戏房间
  const joinOnlineGame = (settings, roomId) => {
    setGameSettings(settings)
    setRoomId(roomId)
    setScreen('online')
  }

  // 返回首页
  const goHome = () => {
    setScreen('home')
    setGameSettings(null)
    setRoomId(null)
  }

  // 显示加入房间界面
  const showJoinRoom = () => {
    setScreen('join')
  }

  return (
    <div className="app">
      {screen === 'home' && (
        <HomePage 
          onStartLocal={startLocalGame}
          onStartOnline={startOnlineGame}
          onJoinRoom={showJoinRoom}
        />
      )}
      
      {screen === 'local' && (
        <LocalGame 
          settings={gameSettings}
          onExit={goHome}
        />
      )}
      
      {screen === 'online' && (
        <OnlineGame 
          settings={gameSettings}
          roomId={roomId}
          onExit={goHome}
        />
      )}

      {screen === 'join' && (
        <JoinRoom
          onJoin={joinOnlineGame}
          onBack={goHome}
        />
      )}
    </div>
  )
}

export default App
