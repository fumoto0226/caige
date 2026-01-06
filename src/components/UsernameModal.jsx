import React, { useState } from 'react';
import { User, X } from 'lucide-react';

const UsernameModal = ({ onSubmit, onCancel, defaultUsername = '' }) => {
  const [username, setUsername] = useState(defaultUsername);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.trim().length > 0) {
      onSubmit(username.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full animate-popIn shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-black text-slate-800">输入昵称</h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-slate-100 rounded-full transition"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入你的昵称"
                maxLength={20}
                autoFocus
                className="w-full pl-11 pr-4 py-3 bg-slate-100 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white transition-all placeholder-slate-400 text-slate-800"
              />
            </div>
            <p className="text-xs text-slate-400 mt-2 ml-1">昵称将在游戏中显示</p>
          </div>
          
          <button
            type="submit"
            disabled={username.trim().length === 0}
            className="w-full py-3 bg-green-500 text-white font-black rounded-2xl shadow-lg shadow-green-200 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none active:scale-95 transition-all"
          >
            确定
          </button>
        </form>
      </div>
    </div>
  );
};

export default UsernameModal;

