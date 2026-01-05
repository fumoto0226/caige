import React from 'react';

// 简化的在线游戏组件 - 暂未实现
const OnlineGameScreen = ({ onEndGame }) => {
  return (
    <div className="flex flex-col h-full bg-white items-center justify-center p-6">
      <h1 className="text-2xl font-black text-slate-800 mb-4">在线模式</h1>
      <p className="text-slate-500 mb-8 text-center">在线联机功能正在开发中...</p>
      <button 
        onClick={onEndGame}
        className="bg-blue-500 text-white px-6 py-3 rounded-2xl font-bold"
      >
        返回首页
      </button>
    </div>
  );
};

export default OnlineGameScreen;

