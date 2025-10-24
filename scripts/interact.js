const { ethers } = require("hardhat");

/**
 * 投票DApp交互示例脚本
 * 演示如何使用投票智能合约的完整流程
 */
async function main() {
  console.log("=== 投票DApp交互示例 ===\n");

  // 获取账户
  const [owner, voter1, voter2, voter3, candidate1, candidate2] = await ethers.getSigners();
  
  console.log("账户信息:");
  console.log("合约所有者:", owner.address);
  console.log("投票者1:", voter1.address);
  console.log("投票者2:", voter2.address);
  console.log("投票者3:", voter3.address);
  console.log("候选人1:", candidate1.address);
  console.log("候选人2:", candidate2.address);
  console.log();

  // 部署合约
  console.log("1. 部署投票合约...");
  const VotingContract = await ethers.getContractFactory("VotingContract");
  const votingContract = await VotingContract.deploy();
  await votingContract.deployed();
  console.log("合约地址:", votingContract.address);
  console.log();

  // 创建选举
  console.log("2. 创建选举...");
  const currentTime = Math.floor(Date.now() / 1000);
  const registrationStart = currentTime + 60;    // 1分钟后开始注册
  const registrationEnd = currentTime + 300;     // 5分钟后结束注册
  const votingStart = currentTime + 360;         // 6分钟后开始投票
  const votingEnd = currentTime + 600;           // 10分钟后结束投票

  const createTx = await votingContract.createElection(
    "学生会主席选举",
    "2024年学生会主席选举，请积极参与投票",
    registrationStart,
    registrationEnd,
    votingStart,
    votingEnd
  );
  
  const createReceipt = await createTx.wait();
  const createEvent = createReceipt.events.find(e => e.event === "ElectionCreated");
  const electionId = createEvent.args.electionId;
  
  console.log("选举ID:", electionId.toString());
  console.log("选举标题: 学生会主席选举");
  console.log("注册期:", new Date(registrationStart * 1000).toLocaleString(), "到", new Date(registrationEnd * 1000).toLocaleString());
  console.log("投票期:", new Date(votingStart * 1000).toLocaleString(), "到", new Date(votingEnd * 1000).toLocaleString());
  console.log();

  // 等待注册期开始
  console.log("3. 等待注册期开始...");
  await ethers.provider.send("evm_increaseTime", [60]);
  await ethers.provider.send("evm_mine", []);
  console.log("注册期已开始");
  console.log();

  // 注册候选人
  console.log("4. 候选人注册...");
  
  const register1Tx = await votingContract.connect(candidate1).registerCandidate(
    electionId,
    "张三",
    "计算机科学专业，有丰富的学生工作经验，致力于改善校园生活"
  );
  await register1Tx.wait();
  console.log("候选人1注册成功: 张三");

  const register2Tx = await votingContract.connect(candidate2).registerCandidate(
    electionId,
    "李四",
    "软件工程专业，积极参与社团活动，希望为同学们服务"
  );
  await register2Tx.wait();
  console.log("候选人2注册成功: 李四");
  console.log();

  // 查询候选人列表
  console.log("5. 查询候选人列表...");
  const candidateList = await votingContract.getCandidateList(electionId);
  console.log("候选人数量:", candidateList.length);
  
  for (let i = 0; i < candidateList.length; i++) {
    const candidate = await votingContract.getCandidate(electionId, candidateList[i]);
    console.log(`候选人${i + 1}: ${candidate.name} (${candidate.candidateAddress})`);
    console.log(`  描述: ${candidate.description}`);
    console.log(`  当前得票: ${candidate.voteCount}`);
  }
  console.log();

  // 等待投票期开始
  console.log("6. 等待投票期开始...");
  await ethers.provider.send("evm_increaseTime", [300]);
  await ethers.provider.send("evm_mine", []);
  console.log("投票期已开始");
  console.log();

  // 投票
  console.log("7. 开始投票...");
  
  // 投票者1投票给候选人1
  const vote1Tx = await votingContract.connect(voter1).vote(electionId, candidate1.address);
  await vote1Tx.wait();
  console.log("投票者1投票给张三");

  // 投票者2投票给候选人1
  const vote2Tx = await votingContract.connect(voter2).vote(electionId, candidate1.address);
  await vote2Tx.wait();
  console.log("投票者2投票给张三");

  // 投票者3投票给候选人2
  const vote3Tx = await votingContract.connect(voter3).vote(electionId, candidate2.address);
  await vote3Tx.wait();
  console.log("投票者3投票给李四");
  console.log();

  // 查询投票状态
  console.log("8. 查询投票状态...");
  const hasVoted1 = await votingContract.hasUserVoted(electionId, voter1.address);
  const hasVoted2 = await votingContract.hasUserVoted(electionId, voter2.address);
  const hasVoted3 = await votingContract.hasUserVoted(electionId, voter3.address);
  
  console.log("投票者1是否已投票:", hasVoted1);
  console.log("投票者2是否已投票:", hasVoted2);
  console.log("投票者3是否已投票:", hasVoted3);
  console.log();

  // 查询实时结果
  console.log("9. 查询实时投票结果...");
  const results = await votingContract.getElectionResults(electionId);
  const totalVotes = await votingContract.getTotalVotes(electionId);
  
  console.log("总投票数:", totalVotes.toString());
  console.log("投票结果:");
  
  for (let i = 0; i < results.candidateAddresses.length; i++) {
    console.log(`第${i + 1}名: ${results.names[i]} - ${results.voteCounts[i]}票`);
  }
  console.log();

  // 查询选举状态
  console.log("10. 查询选举状态...");
  const status = await votingContract.getElectionStatus(electionId);
  const statusNames = ["未开始", "注册期", "投票期", "已结束"];
  console.log("当前状态:", statusNames[status]);
  
  const timeInfo = await votingContract.getTimeRemaining(electionId);
  console.log("当前阶段:", timeInfo.currentPhase);
  console.log("注册剩余时间:", timeInfo.registrationTimeRemaining.toString(), "秒");
  console.log("投票剩余时间:", timeInfo.votingTimeRemaining.toString(), "秒");
  console.log();

  // 等待投票期结束
  console.log("11. 等待投票期结束...");
  await ethers.provider.send("evm_increaseTime", [300]);
  await ethers.provider.send("evm_mine", []);
  console.log("投票期已结束");
  console.log();

  // 查询最终结果
  console.log("12. 最终选举结果...");
  const finalStatus = await votingContract.getElectionStatus(electionId);
  console.log("选举状态:", statusNames[finalStatus]);
  
  const finalResults = await votingContract.getElectionResults(electionId);
  const finalTotalVotes = await votingContract.getTotalVotes(electionId);
  
  console.log("最终总投票数:", finalTotalVotes.toString());
  console.log("最终结果:");
  
  for (let i = 0; i < finalResults.candidateAddresses.length; i++) {
    const percentage = finalTotalVotes.gt(0) ? 
      (finalResults.voteCounts[i] * 100 / finalTotalVotes).toFixed(2) : 0;
    console.log(`第${i + 1}名: ${finalResults.names[i]} - ${finalResults.voteCounts[i]}票 (${percentage}%)`);
  }
  
  // 确定获胜者
  if (finalResults.voteCounts.length > 0) {
    const winner = finalResults.voteCounts[0] > finalResults.voteCounts[1] ? 
      finalResults.names[0] : finalResults.names[1];
    console.log(`\n🏆 获胜者: ${winner}`);
  }
  
  console.log("\n=== 交互示例完成 ===");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("交互示例失败:", error);
    process.exit(1);
  });
