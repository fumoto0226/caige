# 中国大陆用户注意事项

## 问题说明

由于本游戏使用 Firebase 作为在线多人游戏的后端服务，而 **Firebase 在中国大陆被防火墙屏蔽**，导致国内用户可能无法使用线上游戏功能。

### 症状

- 创建/加入房间后立即跳转回首页
- 提示"网络连接失败"
- 无法与其他玩家同步游戏状态

## 解决方案

### 方案1：使用 VPN（推荐）

国内用户需要使用 VPN 服务才能访问 Firebase：

1. 安装可靠的 VPN 应用
2. 连接到香港、日本、新加坡等节点
3. 刷新网页后即可正常使用线上功能

### 方案2：使用本地游戏模式

如果无法使用 VPN，可以选择：

- **本地多人游戏**：在同一台设备上与朋友一起玩
- 不依赖网络连接
- 功能完整，支持所有歌曲和设置

## 给开发者的建议

如果需要完全支持中国大陆用户，建议：

### 短期方案

1. **使用国内云服务**：
   - 阿里云 OSS + 表格存储
   - 腾讯云 CloudBase
   - 七牛云

2. **部署反向代理**：
   - 在国内服务器部署反向代理
   - 转发 Firebase 请求

### 长期方案

**使用自建后端**：
```
技术栈建议：
- 后端：Node.js + Express
- 数据库：MongoDB / PostgreSQL
- 实时通信：Socket.io / WebSocket
- 部署：阿里云 / 腾讯云
```

## 技术细节

### Firebase 域名被墙

以下 Firebase 域名在中国大陆无法访问：
- `firebaseapp.com`
- `firebasestorage.app`
- `googleapis.com`
- `google-analytics.com`

### 代码修改建议

1. **抽象数据层**：
   ```javascript
   // 创建统一的数据服务接口
   class GameDataService {
     async createRoom() { }
     async joinRoom() { }
     subscribe() { }
   }
   
   // Firebase实现
   class FirebaseService extends GameDataService { }
   
   // 国内替代实现
   class ChinaCloudService extends GameDataService { }
   ```

2. **区域检测**：
   ```javascript
   const isChina = () => {
     // 检测用户是否在中国
     return navigator.language === 'zh-CN';
   };
   
   const dataService = isChina() 
     ? new ChinaCloudService() 
     : new FirebaseService();
   ```

## 联系方式

如有问题或建议，请联系开发团队。

