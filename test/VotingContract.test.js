const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VotingContract", function () {
  let votingContract;
  let owner;
  let addr1;
  let addr2;
  let addr3;
  let addrs;

  beforeEach(async function () {
    [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();
    
    const VotingContract = await ethers.getContractFactory("VotingContract");
    votingContract = await VotingContract.deploy();
    await votingContract.waitForDeployment();
  });

  describe("部署", function () {
    it("应该正确部署合约", async function () {
      expect(await votingContract.getAddress()).to.not.equal(ethers.ZeroAddress);
    });

    it("初始选举数量应该为0", async function () {
      const totalElections = await votingContract.getTotalElections();
      expect(totalElections).to.equal(0);
    });
  });

  describe("创建选举", function () {
    let electionId;
    let registrationStart;
    let registrationEnd;
    let votingStart;
    let votingEnd;

    beforeEach(async function () {
      const currentTime = Math.floor(Date.now() / 1000);
      registrationStart = currentTime + 300; // 5分钟后开始
      registrationEnd = currentTime + 3600; // 1小时后结束注册
      votingStart = currentTime + 3660; // 注册结束后1分钟开始投票
      votingEnd = currentTime + 7200; // 2小时后结束投票

      const tx = await votingContract.createElection(
        "测试选举",
        "这是一个测试选举",
        registrationStart,
        registrationEnd,
        votingStart,
        votingEnd
      );
      
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          const parsed = votingContract.interface.parseLog(log);
          return parsed && parsed.name === "ElectionCreated";
        } catch (e) {
          return false;
        }
      });
      const parsedEvent = votingContract.interface.parseLog(event);
      electionId = parsedEvent.args.electionId;
    });

    it("应该成功创建选举", async function () {
      expect(electionId).to.equal(1);
      
      const election = await votingContract.getElection(electionId);
      expect(election.title).to.equal("测试选举");
      expect(election.description).to.equal("这是一个测试选举");
      expect(election.creator).to.equal(owner.address);
    });

    it("应该正确设置时间参数", async function () {
      const election = await votingContract.getElection(electionId);
      expect(election.registrationStart).to.equal(registrationStart);
      expect(election.registrationEnd).to.equal(registrationEnd);
      expect(election.votingStart).to.equal(votingStart);
      expect(election.votingEnd).to.equal(votingEnd);
    });

    it("应该拒绝无效的时间范围", async function () {
      const currentTime = Math.floor(Date.now() / 1000);
      
      // 测试注册期时间无效
      await expect(
        votingContract.createElection(
          "无效选举1",
          "描述",
          currentTime + 3600, // 注册开始
          currentTime + 60,   // 注册结束（早于开始）
          currentTime + 3660,
          currentTime + 7200
        )
      ).to.be.revertedWith("Invalid registration period");

      // 测试注册期和投票期冲突
      await expect(
        votingContract.createElection(
          "无效选举2",
          "描述",
          currentTime + 60,
          currentTime + 3600,
          currentTime + 1800, // 投票开始（在注册期内）
          currentTime + 7200
        )
      ).to.be.revertedWith("注册期和投票期时间冲突");

      // 测试过去的时间
      await expect(
        votingContract.createElection(
          "无效选举3",
          "描述",
          currentTime - 60, // 过去的时间
          currentTime + 3600,
          currentTime + 3660,
          currentTime + 7200
        )
      ).to.be.revertedWith("注册开始时间必须是未来时间");
    });
  });

  describe("候选人注册", function () {
    let electionId;

    beforeEach(async function () {
      const currentTime = Math.floor(Date.now() / 1000);
      const registrationStart = currentTime + 60;
      const registrationEnd = currentTime + 3600;
      const votingStart = currentTime + 3660;
      const votingEnd = currentTime + 7200;

      const tx = await votingContract.createElection(
        "测试选举",
        "描述",
        registrationStart,
        registrationEnd,
        votingStart,
        votingEnd
      );
      
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          const parsed = votingContract.interface.parseLog(log);
          return parsed && parsed.name === "ElectionCreated";
        } catch (e) {
          return false;
        }
      });
      const parsedEvent = votingContract.interface.parseLog(event);
      electionId = parsedEvent.args.electionId;
    });

    it("应该允许在注册期内注册候选人", async function () {
      // 等待注册期开始
      await ethers.provider.send("evm_increaseTime", [60]);
      await ethers.provider.send("evm_mine", []);

      const tx = await votingContract.connect(addr1).registerCandidate(
        electionId,
        "候选人1",
        "候选人1的描述"
      );

      await expect(tx)
        .to.emit(votingContract, "CandidateRegistered")
        .withArgs(electionId, addr1.address, "候选人1", "候选人1的描述");

      const candidate = await votingContract.getCandidate(electionId, addr1.address);
      expect(candidate.name).to.equal("候选人1");
      expect(candidate.registered).to.be.true;
      expect(candidate.voteCount).to.equal(0);
    });

    it("应该拒绝在注册期外注册", async function () {
      // 在注册期开始前尝试注册
      await expect(
        votingContract.connect(addr1).registerCandidate(
          electionId,
          "候选人1",
          "描述"
        )
      ).to.be.revertedWith("当前不在注册期内");

      // 等待注册期结束
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine", []);

      await expect(
        votingContract.connect(addr1).registerCandidate(
          electionId,
          "候选人1",
          "描述"
        )
      ).to.be.revertedWith("当前不在注册期内");
    });

    it("应该拒绝重复注册", async function () {
      // 等待注册期开始
      await ethers.provider.send("evm_increaseTime", [60]);
      await ethers.provider.send("evm_mine", []);

      // 第一次注册
      await votingContract.connect(addr1).registerCandidate(
        electionId,
        "候选人1",
        "描述"
      );

      // 尝试重复注册
      await expect(
        votingContract.connect(addr1).registerCandidate(
          electionId,
          "候选人1",
          "描述"
        )
      ).to.be.revertedWith("已经注册为候选人");
    });
  });

  describe("投票", function () {
    let electionId;

    beforeEach(async function () {
      const currentTime = Math.floor(Date.now() / 1000);
      const registrationStart = currentTime + 60;
      const registrationEnd = currentTime + 3600;
      const votingStart = currentTime + 3660;
      const votingEnd = currentTime + 7200;

      const tx = await votingContract.createElection(
        "测试选举",
        "描述",
        registrationStart,
        registrationEnd,
        votingStart,
        votingEnd
      );
      
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          const parsed = votingContract.interface.parseLog(log);
          return parsed && parsed.name === "ElectionCreated";
        } catch (e) {
          return false;
        }
      });
      const parsedEvent = votingContract.interface.parseLog(event);
      electionId = parsedEvent.args.electionId;

      // 注册候选人
      await ethers.provider.send("evm_increaseTime", [60]);
      await ethers.provider.send("evm_mine", []);
      
      await votingContract.connect(addr1).registerCandidate(
        electionId,
        "候选人1",
        "描述"
      );
      
      await votingContract.connect(addr2).registerCandidate(
        electionId,
        "候选人2",
        "描述"
      );
    });

    it("应该允许在投票期内投票", async function () {
      // 等待投票期开始
      await ethers.provider.send("evm_increaseTime", [3660]);
      await ethers.provider.send("evm_mine", []);

      const tx = await votingContract.connect(addr3).vote(electionId, addr1.address);
      
      await expect(tx)
        .to.emit(votingContract, "VoteCast")
        .withArgs(electionId, addr3.address, addr1.address, await ethers.provider.getBlockNumber());

      const candidate = await votingContract.getCandidate(electionId, addr1.address);
      expect(candidate.voteCount).to.equal(1);

      const hasVoted = await votingContract.hasUserVoted(electionId, addr3.address);
      expect(hasVoted).to.be.true;

      const totalVotes = await votingContract.getTotalVotes(electionId);
      expect(totalVotes).to.equal(1);
    });

    it("应该拒绝在投票期外投票", async function () {
      // 在投票期开始前尝试投票
      await expect(
        votingContract.connect(addr3).vote(electionId, addr1.address)
      ).to.be.revertedWith("当前不在投票期内");

      // 等待投票期结束
      await ethers.provider.send("evm_increaseTime", [7200]);
      await ethers.provider.send("evm_mine", []);

      await expect(
        votingContract.connect(addr3).vote(electionId, addr1.address)
      ).to.be.revertedWith("当前不在投票期内");
    });

    it("应该拒绝重复投票", async function () {
      // 等待投票期开始
      await ethers.provider.send("evm_increaseTime", [3660]);
      await ethers.provider.send("evm_mine", []);

      // 第一次投票
      await votingContract.connect(addr3).vote(electionId, addr1.address);

      // 尝试重复投票
      await expect(
        votingContract.connect(addr3).vote(electionId, addr2.address)
      ).to.be.revertedWith("已经投过票");
    });

    it("应该拒绝给不存在的候选人投票", async function () {
      // 等待投票期开始
      await ethers.provider.send("evm_increaseTime", [3660]);
      await ethers.provider.send("evm_mine", []);

      await expect(
        votingContract.connect(addr3).vote(electionId, addr3.address)
      ).to.be.revertedWith("候选人不存在");
    });
  });

  describe("查询功能", function () {
    let electionId;

    beforeEach(async function () {
      const currentTime = Math.floor(Date.now() / 1000);
      const registrationStart = currentTime + 60;
      const registrationEnd = currentTime + 3600;
      const votingStart = currentTime + 3660;
      const votingEnd = currentTime + 7200;

      const tx = await votingContract.createElection(
        "测试选举",
        "描述",
        registrationStart,
        registrationEnd,
        votingStart,
        votingEnd
      );
      
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          const parsed = votingContract.interface.parseLog(log);
          return parsed && parsed.name === "ElectionCreated";
        } catch (e) {
          return false;
        }
      });
      const parsedEvent = votingContract.interface.parseLog(event);
      electionId = parsedEvent.args.electionId;

      // 注册候选人
      await ethers.provider.send("evm_increaseTime", [60]);
      await ethers.provider.send("evm_mine", []);
      
      await votingContract.connect(addr1).registerCandidate(
        electionId,
        "候选人1",
        "描述1"
      );
      
      await votingContract.connect(addr2).registerCandidate(
        electionId,
        "候选人2",
        "描述2"
      );

      // 投票
      await ethers.provider.send("evm_increaseTime", [3660]);
      await ethers.provider.send("evm_mine", []);
      
      await votingContract.connect(addr3).vote(electionId, addr1.address);
      await votingContract.connect(owner).vote(electionId, addr1.address);
      await votingContract.connect(addrs[0]).vote(electionId, addr2.address);
    });

    it("应该正确返回候选人列表", async function () {
      const candidateList = await votingContract.getCandidateList(electionId);
      expect(candidateList).to.have.lengthOf(2);
      expect(candidateList).to.include(addr1.address);
      expect(candidateList).to.include(addr2.address);
    });

    it("应该正确返回选举结果", async function () {
      const results = await votingContract.getElectionResults(electionId);
      expect(results.candidateAddresses).to.have.lengthOf(2);
      expect(results.names).to.have.lengthOf(2);
      expect(results.voteCounts).to.have.lengthOf(2);
      
      // 候选人1应该有2票，候选人2应该有1票
      const candidate1Index = results.candidateAddresses.indexOf(addr1.address);
      const candidate2Index = results.candidateAddresses.indexOf(addr2.address);
      
      expect(results.voteCounts[candidate1Index]).to.equal(2);
      expect(results.voteCounts[candidate2Index]).to.equal(1);
    });

    it("应该正确返回选举状态", async function () {
      // 测试不同阶段的状态
      let status = await votingContract.getElectionStatus(electionId);
      expect(status).to.equal(3); // Ended

      // 创建新的选举测试其他状态
      const currentTime = Math.floor(Date.now() / 1000);
      const registrationStart = currentTime + 60;
      const registrationEnd = currentTime + 3600;
      const votingStart = currentTime + 3660;
      const votingEnd = currentTime + 7200;

      const tx = await votingContract.createElection(
        "新选举",
        "描述",
        registrationStart,
        registrationEnd,
        votingStart,
        votingEnd
      );
      
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === "ElectionCreated");
      const newElectionId = event.args.electionId;

      // 未开始状态
      status = await votingContract.getElectionStatus(newElectionId);
      expect(status).to.equal(0); // NotStarted

      // 注册期状态
      await ethers.provider.send("evm_increaseTime", [60]);
      await ethers.provider.send("evm_mine", []);
      
      status = await votingContract.getElectionStatus(newElectionId);
      expect(status).to.equal(1); // Registration

      // 投票期状态
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine", []);
      
      status = await votingContract.getElectionStatus(newElectionId);
      expect(status).to.equal(2); // Voting
    });

    it("应该正确返回剩余时间", async function () {
      const timeInfo = await votingContract.getTimeRemaining(electionId);
      expect(timeInfo.currentPhase).to.equal("Ended");
      expect(timeInfo.registrationTimeRemaining).to.equal(0);
      expect(timeInfo.votingTimeRemaining).to.equal(0);
    });
  });

  describe("边界情况", function () {
    it("应该拒绝访问不存在的选举", async function () {
      await expect(
        votingContract.getElection(999)
      ).to.be.revertedWith("Election does not exist");

      await expect(
        votingContract.getCandidate(999, addr1.address)
      ).to.be.revertedWith("Election does not exist");

      await expect(
        votingContract.vote(999, addr1.address)
      ).to.be.revertedWith("Election does not exist");
    });
  });
});
