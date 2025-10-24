# 投票DApp使用指南

## 快速开始

### 1. 环境准备

确保已安装Node.js (版本 >= 14.0.0) 和npm。

### 2. 安装依赖

```bash
cd voting-dapp
npm install
```

### 3. 编译合约

```bash
npm run compile
```

### 4. 运行测试

```bash
npm test
```

## 部署和使用

### 本地开发环境

1. **启动本地区块链网络**
```bash
npm run node
```

2. **部署合约**（在新终端窗口）
```bash
npm run deploy:local
```

3. **运行交互示例**
```bash
npx hardhat run scripts/interact.js --network localhost
```

## 合约交互示例

### 使用ethers.js与合约交互

```javascript
const { ethers } = require("hardhat");

async function interactWithContract() {
  // 连接到已部署的合约
  const contractAddress = "0x..."; // 替换为实际合约地址
  const VotingContract = await ethers.getContractFactory("VotingContract");
  const votingContract = VotingContract.attach(contractAddress);
  
  // 获取账户
  const [owner, voter1, voter2] = await ethers.getSigners();
  
  // 1. 创建选举
  const currentTime = Math.floor(Date.now() / 1000);
  const tx = await votingContract.createElection(
    "测试选举",
    "这是一个测试选举",
    currentTime + 60,    // 1分钟后开始注册
    currentTime + 3600,  // 1小时后结束注册
    currentTime + 3660,  // 注册结束后1分钟开始投票
    currentTime + 7200   // 2小时后结束投票
  );
  
  const receipt = await tx.wait();
  const event = receipt.events.find(e => e.event === "ElectionCreated");
  const electionId = event.args.electionId;
  
  console.log("选举ID:", electionId.toString());
  
  // 2. 等待注册期开始后注册候选人
  await ethers.provider.send("evm_increaseTime", [60]);
  await ethers.provider.send("evm_mine", []);
  
  await votingContract.connect(voter1).registerCandidate(
    electionId,
    "候选人1",
    "候选人1的描述"
  );
  
  // 3. 等待投票期开始后投票
  await ethers.provider.send("evm_increaseTime", [3600]);
  await ethers.provider.send("evm_mine", []);
  
  await votingContract.connect(voter2).vote(electionId, voter1.address);
  
  // 4. 查询结果
  const results = await votingContract.getElectionResults(electionId);
  console.log("选举结果:", results);
}
```

## 主要功能使用

### 创建选举

```javascript
// 设置时间参数（Unix时间戳）
const currentTime = Math.floor(Date.now() / 1000);
const registrationStart = currentTime + 3600;  // 1小时后开始注册
const registrationEnd = currentTime + 7200;    // 2小时后结束注册
const votingStart = currentTime + 7260;        // 注册结束后1分钟开始投票
const votingEnd = currentTime + 10800;         // 3小时后结束投票

const tx = await votingContract.createElection(
  "选举标题",
  "选举描述",
  registrationStart,
  registrationEnd,
  votingStart,
  votingEnd
);
```

### 注册候选人

```javascript
// 确保在注册期内
await votingContract.registerCandidate(
  electionId,
  "候选人姓名",
  "候选人描述"
);
```

### 投票

```javascript
// 确保在投票期内
await votingContract.vote(electionId, candidateAddress);
```

### 查询功能

```javascript
// 获取选举信息
const election = await votingContract.getElection(electionId);

// 获取候选人信息
const candidate = await votingContract.getCandidate(electionId, candidateAddress);

// 获取候选人列表
const candidateList = await votingContract.getCandidateList(electionId);

// 获取选举结果
const results = await votingContract.getElectionResults(electionId);

// 检查是否已投票
const hasVoted = await votingContract.hasUserVoted(electionId, voterAddress);

// 获取选举状态
const status = await votingContract.getElectionStatus(electionId);

// 获取剩余时间
const timeInfo = await votingContract.getTimeRemaining(electionId);
```

## 时间管理

### 选举状态

- `0` - NotStarted: 未开始
- `1` - Registration: 注册期
- `2` - Voting: 投票期
- `3` - Ended: 已结束

### 时间设置建议

```javascript
const currentTime = Math.floor(Date.now() / 1000);

// 建议的时间设置
const registrationStart = currentTime + 3600;   // 1小时后开始注册
const registrationEnd = currentTime + 7200;     // 2小时后结束注册（注册期1小时）
const votingStart = currentTime + 7260;         // 注册结束后1分钟开始投票
const votingEnd = currentTime + 18000;          // 5小时后结束投票（投票期3小时）
```

## 错误处理

### 常见错误

1. **"选举不存在"** - 检查electionId是否正确
2. **"当前不在注册期内"** - 检查当前时间是否在注册期内
3. **"当前不在投票期内"** - 检查当前时间是否在投票期内
4. **"已经注册为候选人"** - 该地址已经注册过
5. **"已经投过票"** - 该地址已经投过票
6. **"候选人不存在"** - 检查候选人地址是否正确

### 错误处理示例

```javascript
try {
  await votingContract.vote(electionId, candidateAddress);
  console.log("投票成功");
} catch (error) {
  if (error.message.includes("当前不在投票期内")) {
    console.log("投票期未开始或已结束");
  } else if (error.message.includes("已经投过票")) {
    console.log("您已经投过票了");
  } else if (error.message.includes("候选人不存在")) {
    console.log("候选人不存在");
  } else {
    console.log("投票失败:", error.message);
  }
}
```

## 事件监听

```javascript
// 监听选举创建事件
votingContract.on("ElectionCreated", (electionId, title, creator, registrationStart, registrationEnd, votingStart, votingEnd) => {
  console.log("新选举创建:", {
    electionId: electionId.toString(),
    title,
    creator,
    registrationStart: new Date(registrationStart * 1000),
    registrationEnd: new Date(registrationEnd * 1000),
    votingStart: new Date(votingStart * 1000),
    votingEnd: new Date(votingEnd * 1000)
  });
});

// 监听投票事件
votingContract.on("VoteCast", (electionId, voter, candidate, timestamp) => {
  console.log("新投票:", {
    electionId: electionId.toString(),
    voter,
    candidate,
    timestamp: new Date(timestamp * 1000)
  });
});
```

## 部署到测试网络

### 1. 配置网络

在`hardhat.config.js`中添加网络配置：

```javascript
networks: {
  sepolia: {
    url: "YOUR_SEPOLIA_RPC_URL",
    accounts: ["YOUR_PRIVATE_KEY"]
  }
}
```

### 2. 部署

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

### 3. 验证合约（可选）

```bash
npx hardhat verify --network sepolia CONTRACT_ADDRESS
```

## 最佳实践

1. **时间设置**: 给注册期和投票期留足够的时间
2. **错误处理**: 总是处理可能的错误情况
3. **事件监听**: 使用事件来跟踪合约状态变化
4. **Gas费用**: 考虑Gas费用，特别是在主网上
5. **测试**: 在测试网络上充分测试后再部署到主网
6. **安全性**: 妥善保管私钥，不要提交到代码库

## 故障排除

### 常见问题

1. **合约部署失败**
   - 检查网络连接
   - 确保账户有足够的ETH支付Gas费用
   - 检查Hardhat配置

2. **交易失败**
   - 检查Gas限制
   - 确保在正确的时间段内操作
   - 检查合约状态

3. **查询结果为空**
   - 确保选举ID正确
   - 检查选举是否已创建
   - 确认在正确的时间段内

### 调试技巧

```javascript
// 启用详细日志
const provider = new ethers.providers.JsonRpcProvider();
provider.on("debug", (info) => {
  console.log("Debug:", info);
});

// 检查交易状态
const tx = await votingContract.vote(electionId, candidateAddress);
const receipt = await tx.wait();
console.log("交易状态:", receipt.status);
console.log("Gas使用:", receipt.gasUsed.toString());
```
