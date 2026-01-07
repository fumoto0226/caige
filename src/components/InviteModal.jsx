import React, { useState } from 'react';
import { Copy, Check, Link as LinkIcon, Hash, X } from 'lucide-react';

const InviteModal = ({ roomId, onClose }) => {
  const [copied, setCopied] = useState(null); // 'roomId' | 'link' | null
  
  const roomLink = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
  
  const handleCopy = (type) => {
    const textToCopy = type === 'roomId' ? roomId : roomLink;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    }).catch(err => {
      console.error('复制失败:', err);
      alert('复制失败，请手动复制');
    });
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl p-6 max-w-sm w-full animate-popIn shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-black text-slate-800">邀请好友</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>
        
        <div className="space-y-4">
          {/* 房间号 */}
          <div>
            <label className="text-sm font-bold text-slate-500 mb-2 block flex items-center gap-2">
              <Hash size={16} /> 房间号
            </label>
            <div className="flex gap-2">
              <div className="flex-1 bg-slate-100 px-4 py-3 rounded-2xl font-black text-2xl text-center text-slate-800 tracking-wider">
                {roomId}
              </div>
              <button
                onClick={() => handleCopy('roomId')}
                className={`px-4 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 ${
                  copied === 'roomId'
                  ? 'bg-green-500 text-white'
                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                }`}
              >
                {copied === 'roomId' ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2 ml-1">好友可在首页输入房间号加入</p>
          </div>
          
          {/* 分享链接 */}
          <div>
            <label className="text-sm font-bold text-slate-500 mb-2 block flex items-center gap-2">
              <LinkIcon size={16} /> 分享链接
            </label>
            <div className="flex gap-2">
              <div className="flex-1 bg-slate-100 px-4 py-3 rounded-2xl text-sm text-slate-600 overflow-hidden text-ellipsis whitespace-nowrap">
                {roomLink}
              </div>
              <button
                onClick={() => handleCopy('link')}
                className={`px-4 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 ${
                  copied === 'link'
                  ? 'bg-green-500 text-white'
                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                }`}
              >
                {copied === 'link' ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2 ml-1">复制链接发送给好友，点击即可加入</p>
          </div>
        </div>
        
        <button
          onClick={onClose}
          className="w-full mt-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 active:scale-95 transition-all"
        >
          关闭
        </button>
      </div>
    </div>
  );
};

export default InviteModal;

