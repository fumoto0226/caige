import React, { useState } from 'react'
import { Music, Users, Zap, LogIn } from 'lucide-react'
import { artists, getArtistSongs } from '../data/songs'

function HomePage({ onStartLocal, onStartOnline, onJoinRoom }) {
  const [gameMode, setGameMode] = useState('local') // local or online
  const [selectedArtists, setSelectedArtists] = useState(['周杰伦'])
  const [playDuration, setPlayDuration] = useState(15)
  const [isFullSong, setIsFullSong] = useState(false)
  const [includeLive, setIncludeLive] = useState(false)
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
      includeLive,
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
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* 头部 */}
        <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 px-8 py-10 text-white">
          {gameMode === 'online' && (
            <button
              onClick={onJoinRoom}
              className="absolute top-6 right-6 flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-all"
            >
              <LogIn size={20} />
              <span className="font-medium">加入房间</span>
            </button>
          )}
          
          <h1 className="text-4xl font-bold mb-2">听歌猜名</h1>
          <p className="text-blue-100">选择你的游戏模式 ✨</p>
        </div>

        <div className="p-8">
          {/* 游戏模式选择 */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <button
              onClick={() => setGameMode('local')}
              className={`relative p-6 rounded-2xl border-2 transition-all duration-300 ${
                gameMode === 'local'
                  ? 'border-blue-500 bg-blue-50 shadow-lg scale-105'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              }`}
            >
              <div className="flex flex-col items-center gap-3">
                <div className={`p-4 rounded-2xl ${gameMode === 'local' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  <Users size={32} />
                </div>
                <span className="font-semibold text-lg">本地同玩</span>
              </div>
              {gameMode === 'local' && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                  ✓
                </div>
              )}
            </button>

            <button
              onClick={() => setGameMode('online')}
              className={`relative p-6 rounded-2xl border-2 transition-all duration-300 ${
                gameMode === 'online'
                  ? 'border-purple-500 bg-purple-50 shadow-lg scale-105'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              }`}
            >
              <div className="flex flex-col items-center gap-3">
                <div className={`p-4 rounded-2xl ${gameMode === 'online' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  <Zap size={32} />
                </div>
                <span className="font-semibold text-lg">线上联机</span>
              </div>
              {gameMode === 'online' && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm">
                  ✓
                </div>
              )}
            </button>
          </div>

          {/* 谁的歌？ */}
          <div className="mb-8">
            <h2 className="flex items-center gap-2 text-xl font-bold mb-4 text-gray-800">
              <Music className="text-blue-500" size={24} />
              谁的歌?
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {Object.keys(artists).map(artist => (
                <button
                  key={artist}
                  onClick={() => toggleArtist(artist)}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                    selectedArtists.includes(artist)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <img
                    src="/caige/img/zjl.png"
                    alt={artist}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <span className="font-semibold text-gray-800">{artist}</span>
                  {selectedArtists.includes(artist) && (
                    <div className="ml-auto w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                      ✓
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 难度设置 */}
          <div className="mb-8 bg-gray-50 rounded-2xl p-6">
            <h2 className="flex items-center gap-2 text-xl font-bold mb-6 text-gray-800">
              <span className="text-2xl">⚙️</span>
              难度设置
            </h2>

            {/* 播放时长 */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="font-medium text-gray-700">播放时长</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFullSong}
                    onChange={(e) => setIsFullSong(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">整首?</span>
                </label>
              </div>
              {!isFullSong && (
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">2s</span>
                  <input
                    type="range"
                    min="2"
                    max="30"
                    value={playDuration}
                    onChange={(e) => setPlayDuration(Number(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <span className="text-sm text-gray-500">30s</span>
                  <div className="ml-2 px-3 py-1 bg-blue-500 text-white rounded-lg font-semibold min-w-[4rem] text-center">
                    {playDuration} 秒
                  </div>
                </div>
              )}
            </div>

            {/* 包含 Live 版本 */}
            <div className="mb-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeLive}
                  onChange={(e) => setIncludeLive(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                />
                <span className="font-medium text-gray-700">包含 Live 版本</span>
              </label>
            </div>

            {/* 从哪里开始听？ */}
            <div>
              <label className="font-medium text-gray-700 block mb-3">从哪里开始听?</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPlaybackPosition('RANDOM')}
                  className={`py-3 px-4 rounded-xl font-medium transition-all ${
                    playbackPosition === 'RANDOM'
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  🎲 随机片段
                </button>
                <button
                  onClick={() => setPlaybackPosition('START')}
                  className={`py-3 px-4 rounded-xl font-medium transition-all ${
                    playbackPosition === 'START'
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  ⏮️ 从头开始
                </button>
              </div>
            </div>
          </div>

          {/* 规则 */}
          <div className="mb-8 bg-gray-50 rounded-2xl p-6">
            <h2 className="flex items-center gap-2 text-xl font-bold mb-6 text-gray-800">
              <span className="text-2xl">⏰</span>
              规则
            </h2>

            {/* 题目数量 */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="font-medium text-gray-700">题目数量</label>
                <div className="px-3 py-1 bg-blue-500 text-white rounded-full font-semibold">
                  {questionCount} 首
                </div>
              </div>
              <input
                type="range"
                min="1"
                max={maxSongs}
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* 答题限时 */}
            <div>
              <label className="font-medium text-gray-700 block mb-3">答题限时</label>
              <div className="grid grid-cols-3 gap-3">
                {[5, 10, 15, 30, 60].map(time => (
                  <button
                    key={time}
                    onClick={() => {
                      setIsUnlimitedTime(false)
                      setAnswerTimeLimit(time)
                    }}
                    className={`py-3 px-4 rounded-xl font-medium transition-all ${
                      !isUnlimitedTime && answerTimeLimit === time
                        ? 'bg-orange-500 text-white shadow-lg'
                        : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {time}s
                  </button>
                ))}
                <button
                  onClick={() => setIsUnlimitedTime(true)}
                  className={`py-3 px-4 rounded-xl font-medium transition-all ${
                    isUnlimitedTime
                      ? 'bg-orange-500 text-white shadow-lg'
                      : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  ♾️ 无限
                </button>
              </div>
            </div>
          </div>

          {/* 开始按钮 */}
          <button
            onClick={handleStart}
            className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xl font-bold rounded-2xl hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3"
          >
            <Music size={24} />
            {gameMode === 'local' ? '开始本地游戏' : '创建房间'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default HomePage
