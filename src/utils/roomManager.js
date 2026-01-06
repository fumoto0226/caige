import { db } from '../firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment
} from 'firebase/firestore';

// 生成随机4位房间号
const generateRoomId = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// 检查房间号是否已存在
const checkRoomExists = async (roomId) => {
  const roomRef = doc(db, 'rooms', roomId);
  const roomSnap = await getDoc(roomRef);
  return roomSnap.exists();
};

// 生成唯一的房间号
export const generateUniqueRoomId = async () => {
  let roomId;
  let exists = true;
  let attempts = 0;
  
  while (exists && attempts < 10) {
    roomId = generateRoomId();
    exists = await checkRoomExists(roomId);
    attempts++;
  }
  
  if (exists) {
    throw new Error('无法生成唯一房间号，请稍后重试');
  }
  
  return roomId;
};

// 创建房间
export const createRoom = async (settings, hostPlayer, songList) => {
  const roomId = await generateUniqueRoomId();
  
  const roomData = {
    roomId,
    settings,
    hostId: hostPlayer.id,
    players: [hostPlayer],
    messages: [],
    songList: songList || [], // 保存歌曲列表
    gameState: {
      active: false,
      currentIndex: 0,
      isPlaying: false,
      progress: 0,
      segmentStart: 0,
      hasFinishedFirstPlay: false,
      isCountingDown: false,
      countdown: 0,
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastActivityAt: serverTimestamp() // 最后活动时间
  };
  
  const roomRef = doc(db, 'rooms', roomId);
  await setDoc(roomRef, roomData);
  
  return roomId;
};

// 加入房间
export const joinRoom = async (roomId, player) => {
  const roomRef = doc(db, 'rooms', roomId);
  const roomSnap = await getDoc(roomRef);
  
  if (!roomSnap.exists()) {
    throw new Error('房间不存在');
  }
  
  const roomData = roomSnap.data();
  
  // 检查玩家是否已在房间中
  const existingPlayerIndex = roomData.players.findIndex(p => p.id === player.id);
  
  if (existingPlayerIndex >= 0) {
    // 玩家已存在，更新玩家信息（可能是重新连接）
    const updatedPlayers = [...roomData.players];
    updatedPlayers[existingPlayerIndex] = {
      ...updatedPlayers[existingPlayerIndex],
      name: player.name,
      avatar: player.avatar,
      isCurrentUser: player.isCurrentUser
    };
    
    await updateDoc(roomRef, {
      players: updatedPlayers,
      updatedAt: serverTimestamp()
    });
    
    // 添加系统消息
    await addSystemMessage(roomId, `🔄 ${player.name} 重新连接了`);
    
    return { ...roomData, players: updatedPlayers };
  }
  
  // 检查游戏是否已开始（不允许新玩家加入）
  if (roomData.gameState && roomData.gameState.active === true) {
    throw new Error('游戏已开始，无法加入');
  }
  
  // 检查房间是否已满（最多4人）
  if (roomData.players.length >= 4) {
    throw new Error('房间已满');
  }
  
  await updateDoc(roomRef, {
    players: arrayUnion(player),
    updatedAt: serverTimestamp()
  });
  
  // 添加系统消息
  await addSystemMessage(roomId, `👋 ${player.name} 加入了房间`);
  
  return roomData;
};

// 离开房间
export const leaveRoom = async (roomId, playerId) => {
  const roomRef = doc(db, 'rooms', roomId);
  const roomSnap = await getDoc(roomRef);
  
  if (!roomSnap.exists()) {
    return;
  }
  
  const roomData = roomSnap.data();
  const player = roomData.players.find(p => p.id === playerId);
  const updatedPlayers = roomData.players.filter(p => p.id !== playerId);
  
  // 如果房间没人了，删除房间
  if (updatedPlayers.length === 0) {
    await deleteDoc(roomRef);
    return;
  }
  
  // 如果离开的是房主，转移房主权限给最早加入的玩家
  let newHostId = roomData.hostId;
  if (playerId === roomData.hostId) {
    newHostId = updatedPlayers[0].id;
    await addSystemMessage(roomId, `👑 ${updatedPlayers[0].name} 成为了新房主`);
  }
  
  await updateDoc(roomRef, {
    players: updatedPlayers,
    hostId: newHostId,
    updatedAt: serverTimestamp()
  });
  
  if (player) {
    await addSystemMessage(roomId, `👋 ${player.name} 离开了房间`);
  }
};

// 更新游戏状态
export const updateGameState = async (roomId, gameState) => {
  const roomRef = doc(db, 'rooms', roomId);
  await updateDoc(roomRef, {
    gameState,
    updatedAt: serverTimestamp(),
    lastActivityAt: serverTimestamp() // 更新活动时间
  });
};

// 更新播放进度
export const updateProgress = async (roomId, progress, isPlaying) => {
  const roomRef = doc(db, 'rooms', roomId);
  await updateDoc(roomRef, {
    'gameState.progress': progress,
    'gameState.isPlaying': isPlaying,
    updatedAt: serverTimestamp()
  });
};

// 发送消息
export const sendMessage = async (roomId, message) => {
  const roomRef = doc(db, 'rooms', roomId);
  await updateDoc(roomRef, {
    messages: arrayUnion(message),
    updatedAt: serverTimestamp(),
    lastActivityAt: serverTimestamp() // 更新活动时间
  });
};

// 添加系统消息
export const addSystemMessage = async (roomId, text) => {
  const message = {
    id: `sys-${Date.now()}`,
    type: 'system',
    text,
    timestamp: Date.now()
  };
  await sendMessage(roomId, message);
};

// 监听房间变化
export const subscribeToRoom = (roomId, callback) => {
  const roomRef = doc(db, 'rooms', roomId);
  return onSnapshot(roomRef, (doc) => {
    if (doc.exists()) {
      callback(doc.data());
    } else {
      callback(null);
    }
  });
};

// 更新玩家分数
export const updatePlayerScore = async (roomId, playerId, scoreIncrement) => {
  const roomRef = doc(db, 'rooms', roomId);
  const roomSnap = await getDoc(roomRef);
  
  if (!roomSnap.exists()) return;
  
  const roomData = roomSnap.data();
  const updatedPlayers = roomData.players.map(p => {
    if (p.id === playerId) {
      return { ...p, score: (p.score || 0) + scoreIncrement };
    }
    return p;
  });
  
  await updateDoc(roomRef, {
    players: updatedPlayers,
    updatedAt: serverTimestamp()
  });
};

// 检查并清理过期房间（5分钟无活动）
export const checkAndCloseInactiveRoom = async (roomId) => {
  const roomRef = doc(db, 'rooms', roomId);
  const roomSnap = await getDoc(roomRef);
  
  if (!roomSnap.exists()) return false;
  
  const roomData = roomSnap.data();
  const lastActivity = roomData.lastActivityAt?.toDate() || roomData.updatedAt?.toDate();
  
  if (!lastActivity) return false;
  
  const now = new Date();
  const diffMinutes = (now - lastActivity) / 1000 / 60;
  
  // 如果超过5分钟没活动，删除房间
  if (diffMinutes > 5) {
    await deleteDoc(roomRef);
    return true; // 房间已被清理
  }
  
  return false; // 房间仍然活跃
};

