/**
 * GameFi治理示例
 * 展示如何在游戏中使用代币投票系统
 */

const { ethers } = require("hardhat");

async function main() {
    console.log("🎮 GameFi治理示例开始...\n");

    // 获取合约实例
    const [deployer, player1, player2, player3, player4] = await ethers.getSigners();
    
    // 假设合约已经部署
    const tokenVotingAddress = "0x..."; // 替换为实际地址
    const gameTokenAddress = "0x..."; // 替换为实际地址
    
    const TokenVotingContract = await ethers.getContractFactory("TokenVotingContract");
    const tokenVoting = TokenVotingContract.attach(tokenVotingAddress);
    
    const SimpleToken = await ethers.getContractFactory("SimpleToken");
    const gameToken = SimpleToken.attach(gameTokenAddress);

    // 1. 创建游戏机制投票
    console.log("🎯 创建游戏机制投票...");
    
    const now = Math.floor(Date.now() / 1000);
    const registrationStart = now + 60;
    const registrationEnd = now + 1800; // 30分钟注册期
    const votingStart = now + 1860;
    const votingEnd = now + 3600; // 30分钟投票期

    const tx1 = await tokenVoting.createElection(
        "游戏奖励机制调整",
        "投票决定是否调整游戏内奖励机制，影响玩家收益",
        registrationStart,
        registrationEnd,
        votingStart,
        votingEnd,
        1, // TokenWeighted - 代币权重投票
        gameTokenAddress,
        ethers.utils.parseEther("100") // 最少持有100游戏代币才能投票
    );
    
    const receipt1 = await tx1.wait();
    const electionId = receipt1.events.find(e => e.event === "ElectionCreated").args.electionId;
    console.log(`✅ 游戏投票创建成功，ID: ${electionId}`);

    // 2. 注册游戏选项
    console.log("\n🎲 注册游戏选项...");
    
    // 选项1：增加每日任务奖励
    await tokenVoting.registerCandidate(
        electionId,
        "增加每日任务奖励",
        "将每日任务奖励从100代币增加到150代币"
    );
    console.log("✅ 选项'增加每日任务奖励'注册成功");

    // 选项2：增加PVP奖励
    await tokenVoting.registerCandidate(
        electionId,
        "增加PVP奖励",
        "将PVP胜利奖励从50代币增加到80代币"
    );
    console.log("✅ 选项'增加PVP奖励'注册成功");

    // 选项3：增加挖矿奖励
    await tokenVoting.registerCandidate(
        electionId,
        "增加挖矿奖励",
        "将挖矿奖励从20代币/小时增加到30代币/小时"
    );
    console.log("✅ 选项'增加挖矿奖励'注册成功");

    // 选项4：保持现状
    await tokenVoting.registerCandidate(
        electionId,
        "保持现状",
        "不改变当前的奖励机制"
    );
    console.log("✅ 选项'保持现状'注册成功");

    // 3. 等待投票期开始
    console.log("\n⏰ 等待投票期开始...");
    await new Promise(resolve => setTimeout(resolve, 1860000)); // 等待投票开始

    // 4. 模拟玩家投票
    console.log("\n🎮 玩家开始投票...");
    
    // 获取候选人地址
    const candidates = await tokenVoting.getElectionCandidates(electionId);
    const dailyTaskCandidate = candidates[0];
    const pvpCandidate = candidates[1];
    const miningCandidate = candidates[2];
    const statusQuoCandidate = candidates[3];

    // Player1投票：支持增加每日任务奖励，使用2000代币
    console.log("Player1投票：支持增加每日任务奖励，使用2000代币");
    await gameToken.approve(tokenVotingAddress, ethers.utils.parseEther("2000"));
    await tokenVoting.vote(electionId, dailyTaskCandidate, ethers.utils.parseEther("2000"));

    // Player2投票：支持增加PVP奖励，使用1500代币
    console.log("Player2投票：支持增加PVP奖励，使用1500代币");
    await gameToken.approve(tokenVotingAddress, ethers.utils.parseEther("1500"));
    await tokenVoting.vote(electionId, pvpCandidate, ethers.utils.parseEther("1500"));

    // Player3投票：支持增加挖矿奖励，使用3000代币
    console.log("Player3投票：支持增加挖矿奖励，使用3000代币");
    await gameToken.approve(tokenVotingAddress, ethers.utils.parseEther("3000"));
    await tokenVoting.vote(electionId, miningCandidate, ethers.utils.parseEther("3000"));

    // Player4投票：支持保持现状，使用1000代币
    console.log("Player4投票：支持保持现状，使用1000代币");
    await gameToken.approve(tokenVotingAddress, ethers.utils.parseEther("1000"));
    await tokenVoting.vote(electionId, statusQuoCandidate, ethers.utils.parseEther("1000"));

    // 5. 等待投票结束
    console.log("\n⏰ 等待投票期结束...");
    await new Promise(resolve => setTimeout(resolve, 1800000)); // 等待投票结束

    // 6. 查看结果
    console.log("\n📊 查看投票结果...");
    const results = await tokenVoting.getElectionResults(electionId);
    
    console.log("游戏投票结果:");
    for (let i = 0; i < results.candidateAddresses.length; i++) {
        console.log(`选项: ${results.names[i]}`);
        console.log(`  投票数: ${results.voteCounts[i]}`);
        console.log(`  代币权重: ${ethers.utils.formatEther(results.tokenVoteCounts[i])} 代币`);
    }

    const [totalVotes, totalTokenVotes] = await tokenVoting.getTotalVotes(electionId);
    console.log(`\n总投票数: ${totalVotes}`);
    console.log(`总代币权重: ${ethers.utils.formatEther(totalTokenVotes)} 代币`);

    // 7. 分析结果并执行游戏更新
    console.log("\n🎯 结果分析:");
    let maxTokens = ethers.BigNumber.from(0);
    let winningOption = "";
    
    for (let i = 0; i < results.candidateAddresses.length; i++) {
        if (results.tokenVoteCounts[i].gt(maxTokens)) {
            maxTokens = results.tokenVoteCounts[i];
            winningOption = results.names[i];
        }
    }

    console.log(`🏆 获胜选项: ${winningOption}`);
    console.log(`获得代币权重: ${ethers.utils.formatEther(maxTokens)} 代币`);

    // 8. 模拟游戏更新
    console.log("\n🔄 执行游戏更新...");
    switch(winningOption) {
        case "增加每日任务奖励":
            console.log("✅ 游戏已更新：每日任务奖励从100代币增加到150代币");
            break;
        case "增加PVP奖励":
            console.log("✅ 游戏已更新：PVP胜利奖励从50代币增加到80代币");
            break;
        case "增加挖矿奖励":
            console.log("✅ 游戏已更新：挖矿奖励从20代币/小时增加到30代币/小时");
            break;
        case "保持现状":
            console.log("✅ 游戏保持现状：奖励机制不变");
            break;
    }

    console.log("\n✅ GameFi治理示例完成！");
}

// 运行示例
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ 示例执行失败:", error);
        process.exit(1);
    });
