import React, { useState, useEffect } from 'react';
import { Trophy, Home, RotateCcw, ArrowLeft, UserX } from 'lucide-react';
import { subscribeToRoom, kickPlayer } from '../utils/roomManager';

const ResultsScreen = ({ players, onRestart, onHome, mode, roomId, currentUserId, onBackToRoom }) => {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const [playersInResults, setPlayersInResults] = useState([]);
  const [showKickMenu, setShowKickMenu] = useState(null); // playerId to show menu for
  const isHost = mode === 'ONLINE' && players.length > 0 && players[0]?.id === currentUserId;

  // 订阅房间数据以获取正在查看结算的玩家列表
  useEffect(() => {
    if (!roomId) return;

    const unsubscribe = subscribeToRoom(roomId, (roomData) => {
      if (roomData?.gameState?.playersInResults) {
        setPlayersInResults(roomData.gameState.playersInResults);
      }
    });

    return () => unsubscribe();
  }, [roomId]);

  const handleKick = async (playerId) => {
    if (!isHost || !roomId) return;
    
    const playerToKick = players.find(p => p.id === playerId);
    const hostName = players.find(p => p.id === currentUserId)?.name || '房主';
    
    if (playerToKick && window.confirm(`确定要踢出 ${playerToKick.name} 吗？`)) {
      await kickPlayer(roomId, playerId, hostName);
      setShowKickMenu(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* 缩小的顶部横幅 */}
      <div className="bg-green-500 pt-8 pb-12 rounded-b-[2rem] shadow-lg relative overflow-hidden shrink-0">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
           <div className="absolute top-5 left-5 w-12 h-12 bg-white rounded-full"></div>
           <div className="absolute bottom-5 right-5 w-16 h-16 bg-white rounded-full"></div>
        </div>
        
        <div className="text-center relative z-10">
          <div className="inline-block p-2 bg-white/20 rounded-full backdrop-blur-sm mb-2">
             <Trophy size={40} className="text-yellow-300 animate-bounce" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">游戏结束!</h1>
          <p className="text-green-100 font-semibold text-sm mt-1">最终排行榜</p>
        </div>
      </div>

      {/* 紧凑的排行榜 */}
      <div className="flex-1 px-4 -mt-8 relative z-20 pb-32 overflow-y-auto no-scrollbar">
        <div className="space-y-2">
          {sortedPlayers.map((player, index) => (
            <div 
              key={player.id} 
              className={`flex items-center p-3 rounded-2xl shadow-sm border-2 ${
                index === 0 
                ? 'bg-white border-yellow-400 shadow-yellow-100' 
                : 'bg-white border-slate-100'
              }`}
            >
              <div className={`w-8 h-8 flex items-center justify-center rounded-full font-black text-base mr-3 ${
                index === 0 ? 'bg-yellow-400 text-yellow-900' : 
                index === 1 ? 'bg-slate-300 text-slate-600' : 
                index === 2 ? 'bg-orange-300 text-orange-800' : 'bg-slate-100 text-slate-400'
              }`}>
                {index + 1}
              </div>
              
              {/* 显示emoji头像 */}
              <div 
                className={`relative w-10 h-10 flex items-center justify-center text-2xl mr-2 ${isHost && player.id !== currentUserId && mode === 'ONLINE' ? 'cursor-pointer' : ''}`}
                onClick={() => {
                  if (isHost && player.id !== currentUserId && mode === 'ONLINE') {
                    setShowKickMenu(showKickMenu === player.id ? null : player.id);
                  }
                }}
              >
                {player.avatar || '👤'}
                {/* 显示正在查看结算的标记 */}
                {mode === 'ONLINE' && playersInResults.includes(player.id) && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                    <span className="text-[8px]">✓</span>
                  </div>
                )}
                {/* 踢人菜单 */}
                {showKickMenu === player.id && (
                  <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border-2 border-red-200 p-2 z-50 whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleKick(player.id);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 text-red-500 hover:bg-red-50 rounded-md text-xs font-bold"
                    >
                      <UserX size={14} /> 踢出房间
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <h3 className="font-bold text-base text-slate-800">{player.name}</h3>
                {index === 0 && <span className="inline-block bg-yellow-100 text-yellow-700 text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">MVP</span>}
              </div>
              
              <div className="text-xl font-black text-slate-800">
                {player.score} <span className="text-xs font-bold text-slate-400">pts</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 按钮区域 - Fixed 浮动布局 */}
      <div className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-white via-white to-transparent z-30 max-w-md mx-auto right-0">
        <div className="space-y-2">
          {mode === 'ONLINE' && onBackToRoom && (
            <button 
              onClick={onBackToRoom}
              className="w-full py-3 bg-blue-500 text-white font-black rounded-2xl shadow-lg shadow-blue-200 active:scale-95 transition flex justify-center items-center gap-2 text-base"
            >
              <ArrowLeft size={18} strokeWidth={3} /> 返回房间
            </button>
          )}
          {mode === 'ONLINE' && isHost && (
            <button 
              onClick={onRestart}
              disabled={playersInResults.length > 0}
              className={`w-full py-3 font-black rounded-2xl shadow-lg active:scale-95 transition flex justify-center items-center gap-2 text-base ${
                playersInResults.length > 0
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-slate-100'
                  : 'bg-green-500 text-white shadow-green-200'
              }`}
            >
              <RotateCcw size={18} strokeWidth={3} /> 再玩一次
              {playersInResults.length > 0 && <span className="text-xs">({playersInResults.length}人结算中)</span>}
            </button>
          )}
          {mode !== 'ONLINE' && (
            <button 
              onClick={onRestart}
              className="w-full py-3 bg-green-500 text-white font-black rounded-2xl shadow-lg shadow-green-200 active:scale-95 transition flex justify-center items-center gap-2 text-base"
            >
              <RotateCcw size={18} strokeWidth={3} /> 再玩一次
            </button>
          )}
          <button 
            onClick={onHome}
            className="w-full py-3 bg-white text-slate-500 font-bold rounded-2xl border-2 border-slate-100 hover:bg-slate-50 hover:text-slate-600 active:scale-95 transition flex justify-center items-center gap-2 text-sm"
          >
            <Home size={18} strokeWidth={3} /> {mode === 'ONLINE' ? '退出房间' : '返回首页'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultsScreen;
