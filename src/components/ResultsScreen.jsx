import React from 'react';
import { Trophy, Home, RotateCcw } from 'lucide-react';

const ResultsScreen = ({ players, onRestart, onHome }) => {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

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
              <div className="w-10 h-10 flex items-center justify-center text-2xl mr-2">
                {player.avatar || '👤'}
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
          <button 
            onClick={onRestart}
            className="w-full py-3 bg-green-500 text-white font-black rounded-2xl shadow-lg shadow-green-200 active:scale-95 transition flex justify-center items-center gap-2 text-base"
          >
             <RotateCcw size={18} strokeWidth={3} /> 再玩一次
          </button>
          <button 
            onClick={onHome}
            className="w-full py-3 bg-white text-slate-500 font-bold rounded-2xl border-2 border-slate-100 hover:bg-slate-50 hover:text-slate-600 active:scale-95 transition flex justify-center items-center gap-2 text-sm"
          >
            <Home size={18} strokeWidth={3} /> 返回首页
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultsScreen;
