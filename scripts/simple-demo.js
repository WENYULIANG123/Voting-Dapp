const { ethers } = require("hardhat");

async function main() {
  console.log("🎯 代币投票系统演示");
  console.log("==================");

  // 获取账户
  const [deployer, voter1, voter2] = await ethers.getSigners();
  console.log("部署者:", deployer.address);
  console.log("投票者1:", voter1.address);
  console.log("投票者2:", voter2.address);

  // 部署合约
  console.log("\n📦 部署合约...");
  
  // 部署SimpleToken
  const SimpleToken = await ethers.getContractFactory("SimpleToken");
  const simpleToken = await SimpleToken.deploy(1000000); // 100万代币
  await simpleToken.waitForDeployment();
  console.log("✅ SimpleToken 部署成功:", await simpleToken.getAddress());

  // 部署TokenVotingContract
  const TokenVotingContract = await ethers.getContractFactory("TokenVotingContract");
  const tokenVoting = await TokenVotingContract.deploy();
  await tokenVoting.waitForDeployment();
  console.log("✅ TokenVotingContract 部署成功:", await tokenVoting.getAddress());

  // 分发代币
  console.log("\n💰 分发代币...");
  const transferAmount = ethers.parseEther("10000"); // 1万代币
  await simpleToken.transfer(voter1.address, transferAmount);
  await simpleToken.transfer(voter2.address, transferAmount);
  console.log("✅ 已向投票者分发代币");

  // 检查余额
  const balance1 = await simpleToken.balanceOf(voter1.address);
  const balance2 = await simpleToken.balanceOf(voter2.address);
  console.log("投票者1余额:", ethers.formatEther(balance1), "代币");
  console.log("投票者2余额:", ethers.formatEther(balance2), "代币");

  // 创建选举
  console.log("\n🗳️ 创建选举...");
  const currentTime = Math.floor(Date.now() / 1000);
  const registrationStart = currentTime + 60; // 1分钟后开始注册
  const registrationEnd = currentTime + 3600; // 1小时后结束注册
  const votingStart = currentTime + 3660; // 注册结束后1分钟开始投票
  const votingEnd = currentTime + 7200; // 2小时后结束投票

  const tx = await tokenVoting.createElection(
    "DAO治理投票",
    "关于协议升级的治理投票",
    registrationStart,
    registrationEnd,
    votingStart,
    votingEnd,
    1, // TokenWeighted投票
    await simpleToken.getAddress(),
    ethers.parseEther("100") // 最少需要100代币
  );
  await tx.wait();
  console.log("✅ 选举创建成功，交易哈希:", tx.hash);

  // 获取选举信息
  const election = await tokenVoting.getElection(1);
  console.log("\n📋 选举信息:");
  console.log("标题:", election.title);
  console.log("描述:", election.description);
  console.log("投票类型:", election.votingType.toString());
  console.log("最小代币要求:", ethers.formatEther(election.minTokenRequired));

  // 代币质押演示
  console.log("\n🔒 代币质押演示...");
  const stakeAmount = ethers.parseEther("1000");
  
  // 授权代币使用
  await simpleToken.connect(voter1).approve(await tokenVoting.getAddress(), stakeAmount);
  await simpleToken.connect(voter2).approve(await tokenVoting.getAddress(), stakeAmount);
  
  // 质押代币
  await tokenVoting.connect(voter1).stakeTokens(await simpleToken.getAddress(), stakeAmount);
  await tokenVoting.connect(voter2).stakeTokens(await simpleToken.getAddress(), stakeAmount);
  console.log("✅ 投票者1和投票者2各质押了1000代币");

  // 检查质押余额
  const staked1 = await tokenVoting.getStakedAmount(voter1.address, await simpleToken.getAddress());
  const staked2 = await tokenVoting.getStakedAmount(voter2.address, await simpleToken.getAddress());
  console.log("投票者1质押余额:", ethers.formatEther(staked1));
  console.log("投票者2质押余额:", ethers.formatEther(staked2));

  // 获取总选举数
  const totalElections = await tokenVoting.getTotalElections();
  console.log("\n📊 系统统计:");
  console.log("总选举数:", totalElections.toString());

  console.log("\n🎉 演示完成！");
  console.log("系统功能验证:");
  console.log("✅ 合约部署");
  console.log("✅ 代币分发");
  console.log("✅ 选举创建");
  console.log("✅ 代币质押");
  console.log("✅ 数据查询");
  
  console.log("\n💡 下一步可以:");
  console.log("1. 等待注册期开始，注册候选人");
  console.log("2. 等待投票期开始，进行投票");
  console.log("3. 查看选举结果");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("演示失败:", error);
    process.exit(1);
  });
