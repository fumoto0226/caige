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
export const createRoom = async (settings, hostPlayer) => {
  const roomId = await generateUniqueRoomId();
  
  const roomData = {
    roomId,
    settings,
    hostId: hostPlayer.id,
    players: [hostPlayer],
    messages: [],
    gameState: {
      active: true,
      currentIndex: 0,
      isPlaying: false,
      progress: 0,
      segmentStart: 0,
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
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
  const playerExists = roomData.players.some(p => p.id === player.id);
  if (playerExists) {
    return roomData;
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
    updatedAt: serverTimestamp()
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
    updatedAt: serverTimestamp()
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

