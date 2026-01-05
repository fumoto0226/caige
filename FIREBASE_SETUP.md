# Firebase 配置指南

## 1. 创建 Firebase 项目

1. 访问 [Firebase Console](https://console.firebase.google.com/)
2. 点击"添加项目"
3. 输入项目名称（例如：caige-game）
4. 按照提示完成项目创建

## 2. 启用 Firestore 数据库

1. 在 Firebase Console 左侧菜单选择"构建" → "Firestore Database"
2. 点击"创建数据库"
3. 选择"测试模式"开始（稍后可以修改规则）
4. 选择数据库位置（建议选择亚洲区域，如 asia-east1）

## 3. 设置安全规则

在 Firestore Database 的"规则"标签页，使用以下规则：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 允许读写房间数据
    match /rooms/{roomId} {
      allow read, write: if true;
      
      // 允许读写房间内的消息
      match /messages/{messageId} {
        allow read, write: if true;
      }
    }
  }
}
```

**注意：** 这是测试规则，生产环境需要添加身份验证和更严格的规则。

## 4. 获取 Firebase 配置

1. 在 Firebase Console 点击左上角的项目设置（齿轮图标）
2. 选择"项目设置"
3. 滚动到"您的应用"部分
4. 点击"</>"（Web）图标添加 Web 应用
5. 输入应用昵称（例如：caige-web）
6. 复制配置对象

## 5. 配置项目

打开 `src/firebase.js` 文件，将 Firebase 配置替换为你的配置：

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## 6. Firestore 数据结构

### rooms 集合

```javascript
{
  roomId: "1234",
  hostId: "user_xxx",
  hostName: "房主名字",
  players: [
    {
      userId: "user_xxx",
      userName: "玩家名字",
      correct: 0,
      wrong: 0,
      isHost: true
    }
  ],
  settings: {
    selectedArtists: ["周杰伦"],
    playDuration: 15,
    isFullSong: false,
    playbackPosition: "RANDOM",
    questionCount: 5,
    answerTimeLimit: 30
  },
  songQueue: [ /* 歌曲数组 */ ],
  currentIndex: 0,
  gameState: "waiting", // waiting, playing, result
  isPlaying: false,
  active: true,
  createdAt: 1766491157850
}
```

### rooms/{roomId}/messages 子集合

```javascript
{
  userId: "user_xxx",
  userName: "玩家名字",
  text: "消息内容",
  createdAt: 1766491157850
}
```

## 7. 测试

1. 运行 `npm run dev` 启动开发服务器
2. 创建一个在线房间
3. 在另一个浏览器窗口输入房间号加入
4. 测试聊天和游戏功能

## 常见问题

### Q: 无法连接到 Firebase
A: 检查 `firebase.js` 中的配置是否正确

### Q: 聊天消息无法发送
A: 检查 Firestore 规则是否已正确设置

### Q: 房间创建失败
A: 确保已启用 Firestore 数据库，并且规则允许写入

## 生产环境建议

1. 添加 Firebase Authentication（用户认证）
2. 更新 Firestore 安全规则
3. 添加房间过期机制（例如 24 小时后自动删除）
4. 添加房间人数限制
5. 添加防刷机制

