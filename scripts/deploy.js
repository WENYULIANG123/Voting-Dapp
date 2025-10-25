const { ethers } = require("hardhat");

async function main() {
  console.log("开始部署投票智能合约...");

  // 获取部署者账户
  const [deployer] = await ethers.getSigners();
  console.log("部署账户:", deployer.address);
  console.log("账户余额:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // 部署合约
  const VotingContract = await ethers.getContractFactory("VotingContract");
  const votingContract = await VotingContract.deploy();
  
  await votingContract.waitForDeployment();

  console.log("投票合约已部署到:", await votingContract.getAddress());
  console.log("部署交易哈希:", votingContract.deploymentTransaction().hash);

  // 验证部署
  console.log("\n验证部署...");
  const totalElections = await votingContract.getTotalElections();
  console.log("初始选举数量:", totalElections.toString());

  // 保存部署信息
  const deploymentInfo = {
    contractAddress: await votingContract.getAddress(),
    deployer: deployer.address,
    deploymentTime: new Date().toISOString(),
    network: await ethers.provider.getNetwork(),
    transactionHash: votingContract.deploymentTransaction().hash
  };

  console.log("\n部署信息:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // 创建示例选举（可选）
  if (process.env.CREATE_SAMPLE_ELECTION === "true") {
    console.log("\n创建示例选举...");
    const currentTime = Math.floor(Date.now() / 1000);
    const registrationStart = currentTime + 60; // 1分钟后开始注册
    const registrationEnd = currentTime + 3600; // 1小时后结束注册
    const votingStart = currentTime + 3660; // 注册结束后1分钟开始投票
    const votingEnd = currentTime + 7200; // 2小时后结束投票

    const tx = await votingContract.createElection(
      "示例选举",
      "这是一个示例选举，用于测试投票系统",
      registrationStart,
      registrationEnd,
      votingStart,
      votingEnd
    );

    await tx.wait();
    console.log("示例选举创建成功，交易哈希:", tx.hash);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("部署失败:", error);
    process.exit(1);
  });
