import React, { useState, useEffect, useRef } from 'react'

// 歌曲数据库 - 从 music 目录自动生成
const songDatabase = [
  // 2000.11.07.Jay
  { name: '龙卷风', path: '/caige/music/周杰伦/2000.11.07.Jay/周杰伦-龙卷风.mp3', album: 'Jay' },
  { name: '可爱女人', path: '/caige/music/周杰伦/2000.11.07.Jay/周杰伦-可爱女人.mp3', album: 'Jay' },
  { name: '星晴', path: '/caige/music/周杰伦/2000.11.07.Jay/周杰伦-星晴.mp3', album: 'Jay' },
  { name: '娘子', path: '/caige/music/周杰伦/2000.11.07.Jay/周杰伦-娘子.mp3', album: 'Jay' },
  { name: '斗牛', path: '/caige/music/周杰伦/2000.11.07.Jay/周杰伦-斗牛.mp3', album: 'Jay' },
  { name: '黑色幽默', path: '/caige/music/周杰伦/2000.11.07.Jay/周杰伦-黑色幽默.mp3', album: 'Jay' },
  
  // 2001范特西
  { name: '爱在西元前', path: '/caige/music/周杰伦/2001范特西/周杰伦 - .爱在西元前.mp3', album: '范特西' },
  { name: '简单爱', path: '/caige/music/周杰伦/2001范特西/周杰伦 - .简单爱.mp3', album: '范特西' },
  { name: '双截棍', path: '/caige/music/周杰伦/2001范特西/周杰伦 - .双截棍.mp3', album: '范特西' },
  { name: '安静', path: '/caige/music/周杰伦/2001范特西/周杰伦 - .安静.mp3', album: '范特西' },
  { name: '开不了口', path: '/caige/music/周杰伦/2001范特西/周杰伦 - .开不了口.mp3', album: '范特西' },
  { name: '上海一九四三', path: '/caige/music/周杰伦/2001范特西/周杰伦 - .上海一九四三.mp3', album: '范特西' },
  
  // 2002八度空间
  { name: '半岛铁盒', path: '/caige/music/周杰伦/2002.7八度空间/周杰伦 - .半岛铁盒.mp3', album: '八度空间' },
  { name: '回到过去', path: '/caige/music/周杰伦/2002.7八度空间/周杰伦 - .回到过去.mp3', album: '八度空间' },
  { name: '龙拳', path: '/caige/music/周杰伦/2002.7八度空间/周杰伦 - .龙拳.mp3', album: '八度空间' },
  { name: '爷爷泡的茶', path: '/caige/music/周杰伦/2002.7八度空间/周杰伦 - .爷爷泡的茶.mp3', album: '八度空间' },
  
  // 2003叶惠美
  { name: '晴天', path: '/caige/music/周杰伦/2003叶惠美/周杰伦 - .晴天.mp3', album: '叶惠美' },
  { name: '以父之名', path: '/caige/music/周杰伦/2003叶惠美/周杰伦 - .以父之名.mp3', album: '叶惠美' },
  { name: '东风破', path: '/caige/music/周杰伦/2003叶惠美/周杰伦 - .东风破.mp3', album: '叶惠美' },
  { name: '三年二班', path: '/caige/music/周杰伦/2003叶惠美/周杰伦 - .三年二班.mp3', album: '叶惠美' },
  { name: '她的睫毛', path: '/caige/music/周杰伦/2003叶惠美/周杰伦 - .她的睫毛.mp3', album: '叶惠美' },
  
  // 2004七里香
  { name: '七里香', path: '/caige/music/周杰伦/2004七里香/周杰伦 - .七里香_20190720_154109.mp3', album: '七里香' },
  { name: '我的地盘', path: '/caige/music/周杰伦/2004七里香/周杰伦 - .我的地盘.mp3', album: '七里香' },
  { name: '搁浅', path: '/caige/music/周杰伦/2004七里香/周杰伦 - .搁浅.mp3', album: '七里香' },
  { name: '借口', path: '/caige/music/周杰伦/2004七里香/周杰伦 - .借口.mp3', album: '七里香' },
  { name: '外婆', path: '/caige/music/周杰伦/2004七里香/周杰伦 - .外婆.mp3', album: '七里香' },
  
  // 2005十一月的萧邦
  { name: '夜曲', path: '/caige/music/周杰伦/2005十一月的萧邦/周杰伦 - .夜曲.mp3', album: '十一月的萧邦' },
  { name: '发如雪', path: '/caige/music/周杰伦/2005十一月的萧邦/周杰伦 - .发如雪.mp3', album: '十一月的萧邦' },
  { name: '枫', path: '/caige/music/周杰伦/2005十一月的萧邦/周杰伦 - .枫.mp3', album: '十一月的萧邦' },
  { name: '黑色毛衣', path: '/caige/music/周杰伦/2005十一月的萧邦/周杰伦 - .黑色毛衣.mp3', album: '十一月的萧邦' },
  { name: '四面楚歌', path: '/caige/music/周杰伦/2005十一月的萧邦/周杰伦 - 05.四面楚歌.mp3', album: '十一月的萧邦' },
  
  // 2006依然范特西
  { name: '千里之外', path: '/caige/music/周杰伦/2006依然范特西/周杰伦 - .千里之外.mp3', album: '依然范特西' },
  { name: '听妈妈的话', path: '/caige/music/周杰伦/2006依然范特西/周杰伦 - .听妈妈的话_20190720_154126.mp3', album: '依然范特西' },
  { name: '菊花台', path: '/caige/music/周杰伦/2006依然范特西/周杰伦 - .菊花台.mp3', album: '依然范特西' },
  { name: '本草纲目', path: '/caige/music/周杰伦/2006依然范特西/周杰伦 - .本草纲目.mp3', album: '依然范特西' },
  
  // 2007我很忙
  { name: '青花瓷', path: '/caige/music/周杰伦/2007我很忙/周杰伦 - .青花瓷.mp3', album: '我很忙' },
  { name: '彩虹', path: '/caige/music/周杰伦/2007我很忙/周杰伦 - .彩虹.mp3', album: '我很忙' },
  { name: '牛仔很忙', path: '/caige/music/周杰伦/2007我很忙/周杰伦 - .牛仔很忙.mp3', album: '我很忙' },
  { name: '蒲公英的约定', path: '/caige/music/周杰伦/2007我很忙/周杰伦 - .蒲公英的约定.mp3', album: '我很忙' },
  
  // 2008魔杰座
  { name: '稻香', path: '/caige/music/周杰伦/2008魔杰座/周杰伦 - .稻香.mp3', album: '魔杰座' },
  { name: '兰亭序', path: '/caige/music/周杰伦/2008魔杰座/周杰伦 - .兰亭序.mp3', album: '魔杰座' },
  { name: '说好的幸福呢', path: '/caige/music/周杰伦/2008魔杰座/周杰伦 - .说好的幸福呢.mp3', album: '魔杰座' },
  { name: '给我一首歌的时间', path: '/caige/music/周杰伦/2008魔杰座/周杰伦 - .给我一首歌的时间.mp3', album: '魔杰座' },
  
  // 2010跨时代
  { name: '烟花易冷', path: '/caige/music/周杰伦/2010跨时代/周杰伦 - .烟花易冷.mp3', album: '跨时代' },
  { name: '超人不会飞', path: '/caige/music/周杰伦/2010跨时代/周杰伦 - .超人不会飞.mp3', album: '跨时代' },
  { name: '跨时代', path: '/caige/music/周杰伦/2010跨时代/周杰伦 - .跨时代.mp3', album: '跨时代' },
  
  // 2013十二新作
  { name: '红尘客栈', path: '/caige/music/周杰伦/2013十二新作/周杰伦 - .红尘客栈.mp3', album: '十二新作' },
  { name: '明明就', path: '/caige/music/周杰伦/2013十二新作/周杰伦 - .明明就.mp3', album: '十二新作' },
  
  // 2014哎哟不错哦
  { name: '算什么男人', path: '/caige/music/周杰伦/2014哎哟,不错哦/周杰伦 - .算什么男人.mp3', album: '哎哟不错哦' },
  { name: '听爸爸的话', path: '/caige/music/周杰伦/2014哎哟,不错哦/周杰伦 - .听爸爸的话.mp3', album: '哎哟不错哦' },
  
  // 新歌
  { name: '等你下课', path: '/caige/music/周杰伦/周杰伦 - .等你下课.mp3', album: '单曲' },
  { name: 'Mojito', path: '/caige/music/周杰伦/周杰伦-Mojito.mp3', album: '单曲' },
  { name: '说好不哭', path: '/caige/music/周杰伦/周杰伦-说好不哭.mp3', album: '单曲' },
];

function App() {
  const [gameState, setGameState] = useState('menu') // menu, playing, result
  const [currentSong, setCurrentSong] = useState(null)
  const [options, setOptions] = useState([])
  const [score, setScore] = useState(0)
  const [round, setRound] = useState(0)
  const [totalRounds, setTotalRounds] = useState(10)
  const [isPlaying, setIsPlaying] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const [playTime, setPlayTime] = useState(5) // 播放时长（秒）
  const audioRef = useRef(null)

  // 开始游戏
  const startGame = () => {
    setScore(0)
    setRound(0)
    setGameState('playing')
    loadNextSong()
  }

  // 加载下一首歌
  const loadNextSong = () => {
    setShowResult(false)
    setSelectedAnswer(null)
    setIsPlaying(false)

    // 随机选择一首歌
    const randomSong = songDatabase[Math.floor(Math.random() * songDatabase.length)]
    setCurrentSong(randomSong)

    // 生成3个错误选项
    const wrongOptions = []
    while (wrongOptions.length < 3) {
      const randomOption = songDatabase[Math.floor(Math.random() * songDatabase.length)]
      if (randomOption.name !== randomSong.name && !wrongOptions.includes(randomOption.name)) {
        wrongOptions.push(randomOption.name)
      }
    }

    // 混合正确答案和错误选项
    const allOptions = [...wrongOptions, randomSong.name]
    setOptions(allOptions.sort(() => Math.random() - 0.5))

    setRound(round + 1)
  }

  // 播放音乐
  const playMusic = () => {
    if (audioRef.current && currentSong) {
      audioRef.current.src = currentSong.path
      audioRef.current.play()
      setIsPlaying(true)

      // 播放指定时长后停止
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.pause()
          audioRef.current.currentTime = 0
        }
        setIsPlaying(false)
      }, playTime * 1000)
    }
  }

  // 选择答案
  const selectAnswer = (answer) => {
    if (selectedAnswer) return // 已经选择过了

    setSelectedAnswer(answer)
    setShowResult(true)

    // 停止音乐
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setIsPlaying(false)

    // 判断是否正确
    if (answer === currentSong.name) {
      setScore(score + 10)
    }

    // 2秒后加载下一首或显示结束画面
    setTimeout(() => {
      if (round >= totalRounds) {
        setGameState('result')
      } else {
        loadNextSong()
      }
    }, 2000)
  }

  return (
    <div className="app">
      <audio ref={audioRef} />
      
      {/* 菜单界面 */}
      {gameState === 'menu' && (
        <div className="menu">
          <div className="title-card">
            <img src="/caige/img/zjl.png" alt="周杰伦" className="artist-image" />
            <h1>🎵 猜歌名</h1>
            <p className="subtitle">周杰伦歌曲竞猜</p>
          </div>
          
          <div className="game-info">
            <div className="info-item">
              <span className="info-label">题目数量</span>
              <span className="info-value">{totalRounds} 题</span>
            </div>
            <div className="info-item">
              <span className="info-label">播放时长</span>
              <span className="info-value">{playTime} 秒</span>
            </div>
            <div className="info-item">
              <span className="info-label">歌曲库</span>
              <span className="info-value">{songDatabase.length} 首</span>
            </div>
          </div>

          <button className="start-button" onClick={startGame}>
            开始游戏
          </button>
        </div>
      )}

      {/* 游戏界面 */}
      {gameState === 'playing' && currentSong && (
        <div className="game">
          <div className="game-header">
            <div className="progress">
              第 {round}/{totalRounds} 题
            </div>
            <div className="score">得分: {score}</div>
          </div>

          <div className="music-card">
            <div className="album-info">
              <div className="album-icon">🎵</div>
              <div className="album-text">
                <p className="album-name">{currentSong.album}</p>
                <p className="album-hint">听音乐，猜歌名</p>
              </div>
            </div>

            <button 
              className={`play-button ${isPlaying ? 'playing' : ''}`}
              onClick={playMusic}
              disabled={isPlaying || selectedAnswer}
            >
              {isPlaying ? '🔊 播放中...' : '▶️ 点击播放'}
            </button>
          </div>

          <div className="options">
            {options.map((option, index) => (
              <button
                key={index}
                className={`option ${
                  selectedAnswer === option 
                    ? option === currentSong.name 
                      ? 'correct' 
                      : 'wrong'
                    : showResult && option === currentSong.name
                    ? 'correct-show'
                    : ''
                }`}
                onClick={() => selectAnswer(option)}
                disabled={selectedAnswer !== null}
              >
                {option}
                {selectedAnswer === option && option === currentSong.name && ' ✓'}
                {selectedAnswer === option && option !== currentSong.name && ' ✗'}
              </button>
            ))}
          </div>

          {showResult && (
            <div className={`result-message ${selectedAnswer === currentSong.name ? 'correct' : 'wrong'}`}>
              {selectedAnswer === currentSong.name ? '🎉 答对了！+10分' : `❌ 答错了，正确答案是：${currentSong.name}`}
            </div>
          )}
        </div>
      )}

      {/* 结果界面 */}
      {gameState === 'result' && (
        <div className="result">
          <h1>🎊 游戏结束</h1>
          <div className="final-score">
            <div className="score-label">最终得分</div>
            <div className="score-value">{score}</div>
            <div className="score-max">/ {totalRounds * 10}</div>
          </div>
          
          <div className="score-rating">
            {score >= totalRounds * 8 && <p>🏆 真正的周杰伦铁粉！</p>}
            {score >= totalRounds * 6 && score < totalRounds * 8 && <p>🎵 很不错的成绩！</p>}
            {score >= totalRounds * 4 && score < totalRounds * 6 && <p>👍 继续加油！</p>}
            {score < totalRounds * 4 && <p>💪 多听几遍就会了！</p>}
          </div>

          <div className="result-buttons">
            <button className="restart-button" onClick={startGame}>
              再玩一次
            </button>
            <button className="menu-button" onClick={() => setGameState('menu')}>
              返回菜单
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
