/**
 * DAO治理示例
 * 展示如何使用代币投票系统进行DAO治理
 */

const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 DAO治理示例开始...\n");

    // 获取合约实例
    const [deployer, member1, member2, member3] = await ethers.getSigners();
    
    // 假设合约已经部署
    const tokenVotingAddress = "0x..."; // 替换为实际地址
    const tokenAddress = "0x..."; // 替换为实际地址
    
    const TokenVotingContract = await ethers.getContractFactory("TokenVotingContract");
    const tokenVoting = TokenVotingContract.attach(tokenVotingAddress);
    
    const SimpleToken = await ethers.getContractFactory("SimpleToken");
    const token = SimpleToken.attach(tokenAddress);

    // 1. 创建DAO治理选举
    console.log("📋 创建DAO治理选举...");
    
    const now = Math.floor(Date.now() / 1000);
    const registrationStart = now + 60; // 1分钟后开始注册
    const registrationEnd = now + 3600; // 1小时后结束注册
    const votingStart = now + 3660; // 注册结束后1分钟开始投票
    const votingEnd = now + 7200; // 2小时后结束投票

    const tx1 = await tokenVoting.createElection(
        "DAO协议升级投票",
        "投票决定是否将协议从V1.0升级到V2.0，包含新的安全特性和性能优化",
        registrationStart,
        registrationEnd,
        votingStart,
        votingEnd,
        1, // TokenWeighted - 代币权重投票
        tokenAddress,
        ethers.utils.parseEther("1000") // 最少持有1000代币才能投票
    );
    
    const receipt1 = await tx1.wait();
    const electionId = receipt1.events.find(e => e.event === "ElectionCreated").args.electionId;
    console.log(`✅ 选举创建成功，ID: ${electionId}`);

    // 2. 注册候选人
    console.log("\n👥 注册候选人...");
    
    // 注册"支持升级"候选人
    await tokenVoting.registerCandidate(
        electionId,
        "支持升级",
        "支持将协议升级到V2.0版本"
    );
    console.log("✅ 候选人'支持升级'注册成功");

    // 注册"反对升级"候选人
    await tokenVoting.registerCandidate(
        electionId,
        "反对升级",
        "反对协议升级，建议继续使用V1.0版本"
    );
    console.log("✅ 候选人'反对升级'注册成功");

    // 3. 等待注册期结束，开始投票
    console.log("\n⏰ 等待投票期开始...");
    await new Promise(resolve => setTimeout(resolve, 3660000)); // 等待投票开始

    // 4. 模拟投票
    console.log("\n🗳️ 开始投票...");
    
    // 获取候选人地址
    const candidates = await tokenVoting.getElectionCandidates(electionId);
    const supportCandidate = candidates[0];
    const opposeCandidate = candidates[1];

    // Member1投票：支持升级，使用5000代币
    console.log("Member1投票：支持升级，使用5000代币");
    await token.approve(tokenVotingAddress, ethers.utils.parseEther("5000"));
    await tokenVoting.vote(electionId, supportCandidate, ethers.utils.parseEther("5000"));

    // Member2投票：反对升级，使用3000代币
    console.log("Member2投票：反对升级，使用3000代币");
    await token.approve(tokenVotingAddress, ethers.utils.parseEther("3000"));
    await tokenVoting.vote(electionId, opposeCandidate, ethers.utils.parseEther("3000"));

    // Member3投票：支持升级，使用2000代币
    console.log("Member3投票：支持升级，使用2000代币");
    await token.approve(tokenVotingAddress, ethers.utils.parseEther("2000"));
    await tokenVoting.vote(electionId, supportCandidate, ethers.utils.parseEther("2000"));

    // 5. 等待投票结束
    console.log("\n⏰ 等待投票期结束...");
    await new Promise(resolve => setTimeout(resolve, 3600000)); // 等待投票结束

    // 6. 查看结果
    console.log("\n📊 查看投票结果...");
    const results = await tokenVoting.getElectionResults(electionId);
    
    console.log("选举结果:");
    for (let i = 0; i < results.candidateAddresses.length; i++) {
        console.log(`候选人: ${results.names[i]}`);
        console.log(`  投票数: ${results.voteCounts[i]}`);
        console.log(`  代币权重: ${ethers.utils.formatEther(results.tokenVoteCounts[i])} 代币`);
    }

    const [totalVotes, totalTokenVotes] = await tokenVoting.getTotalVotes(electionId);
    console.log(`\n总投票数: ${totalVotes}`);
    console.log(`总代币权重: ${ethers.utils.formatEther(totalTokenVotes)} 代币`);

    // 7. 分析结果
    console.log("\n📈 结果分析:");
    const supportVotes = results.voteCounts[0];
    const opposeVotes = results.voteCounts[1];
    const supportTokens = results.tokenVoteCounts[0];
    const opposeTokens = results.tokenVoteCounts[1];

    if (supportTokens.gt(opposeTokens)) {
        console.log("🎉 支持升级的提案获得通过！");
        console.log(`支持方获得 ${ethers.utils.formatEther(supportTokens)} 代币权重`);
        console.log(`反对方获得 ${ethers.utils.formatEther(opposeTokens)} 代币权重`);
    } else {
        console.log("❌ 反对升级的提案获得通过！");
        console.log(`反对方获得 ${ethers.utils.formatEther(opposeTokens)} 代币权重`);
        console.log(`支持方获得 ${ethers.utils.formatEther(supportTokens)} 代币权重`);
    }

    console.log("\n✅ DAO治理示例完成！");
}

// 运行示例
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ 示例执行失败:", error);
        process.exit(1);
    });
