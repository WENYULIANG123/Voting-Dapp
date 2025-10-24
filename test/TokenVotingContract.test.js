const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TokenVotingContract", function () {
  let simpleToken;
  let tokenVoting;
  let owner;
  let voter1;
  let voter2;
  let voter3;
  let candidate1;
  let candidate2;
  let addrs;

  beforeEach(async function () {
    // Get signers
    [owner, voter1, voter2, voter3, candidate1, candidate2, ...addrs] = await ethers.getSigners();

    // Deploy SimpleToken
    const SimpleToken = await ethers.getContractFactory("SimpleToken");
    simpleToken = await SimpleToken.deploy(1000000); // 1 million tokens
    await simpleToken.waitForDeployment();

    // Deploy TokenVotingContract
    const TokenVotingContract = await ethers.getContractFactory("TokenVotingContract");
    tokenVoting = await TokenVotingContract.deploy();
    await tokenVoting.waitForDeployment();

    // Distribute tokens to test accounts
    const distributeAmount = ethers.parseEther("10000");
    await simpleToken.transfer(voter1.address, distributeAmount);
    await simpleToken.transfer(voter2.address, distributeAmount);
    await simpleToken.transfer(voter3.address, distributeAmount);
    await simpleToken.transfer(candidate1.address, distributeAmount);
    await simpleToken.transfer(candidate2.address, distributeAmount);
  });

  describe("Deployment", function () {
    it("Should deploy both contracts successfully", async function () {
      expect(await simpleToken.getAddress()).to.not.equal(ethers.ZeroAddress);
      expect(await tokenVoting.getAddress()).to.not.equal(ethers.ZeroAddress);
    });

    it("Should have correct token information", async function () {
      expect(await simpleToken.name()).to.equal("Simple Token");
      expect(await simpleToken.symbol()).to.equal("SIMPLE");
      expect(await simpleToken.decimals()).to.equal(18);
    });

    it("Should distribute tokens correctly", async function () {
      const balance = ethers.parseEther("10000");
      expect(await simpleToken.balanceOf(voter1.address)).to.equal(balance);
      expect(await simpleToken.balanceOf(voter2.address)).to.equal(balance);
      expect(await simpleToken.balanceOf(candidate1.address)).to.equal(balance);
    });
  });

  describe("Election Creation", function () {
    it("Should create traditional voting election", async function () {
      const currentTime = Math.floor(Date.now() / 1000);
      const registrationStart = currentTime + 300;
      const registrationEnd = currentTime + 3600;
      const votingStart = currentTime + 3660;
      const votingEnd = currentTime + 7200;

      await expect(
        tokenVoting.createElection(
          "Traditional Election",
          "One vote per address",
          registrationStart,
          registrationEnd,
          votingStart,
          votingEnd,
          0, // VotingType.OneVotePerAddress
          ethers.ZeroAddress,
          0
        )
      ).to.emit(tokenVoting, "ElectionCreated");
    });

    it("Should create token-weighted voting election", async function () {
      const currentTime = Math.floor(Date.now() / 1000);
      const registrationStart = currentTime + 300;
      const registrationEnd = currentTime + 3600;
      const votingStart = currentTime + 3660;
      const votingEnd = currentTime + 7200;

      await expect(
        tokenVoting.createElection(
          "Token Weighted Election",
          "Vote weight equals token amount",
          registrationStart,
          registrationEnd,
          votingStart,
          votingEnd,
          1, // VotingType.TokenWeighted
          await simpleToken.getAddress(),
          ethers.parseEther("100")
        )
      ).to.emit(tokenVoting, "ElectionCreated");
    });

    it("Should create staked voting election", async function () {
      const currentTime = Math.floor(Date.now() / 1000);
      const registrationStart = currentTime + 300;
      const registrationEnd = currentTime + 3600;
      const votingStart = currentTime + 3660;
      const votingEnd = currentTime + 7200;

      await expect(
        tokenVoting.createElection(
          "Staked Voting Election",
          "Must stake tokens to vote",
          registrationStart,
          registrationEnd,
          votingStart,
          votingEnd,
          2, // VotingType.StakedVoting
          await simpleToken.getAddress(),
          ethers.parseEther("500")
        )
      ).to.emit(tokenVoting, "ElectionCreated");
    });

    it("Should fail to create election with invalid time range", async function () {
      const currentTime = Math.floor(Date.now() / 1000);
      const registrationStart = currentTime - 60; // Past time
      const registrationEnd = currentTime + 3600;
      const votingStart = currentTime + 3660;
      const votingEnd = currentTime + 7200;

      await expect(
        tokenVoting.createElection(
          "Invalid Election",
          "Invalid time range",
          registrationStart,
          registrationEnd,
          votingStart,
          votingEnd,
          0,
          ethers.ZeroAddress,
          0
        )
      ).to.be.revertedWith("Registration start must be in the future");
    });
  });

  describe("Token Staking", function () {
    it("Should allow users to stake tokens", async function () {
      const stakeAmount = ethers.parseEther("1000");
      
      // Approve token spending
      await simpleToken.connect(voter1).approve(await tokenVoting.getAddress(), stakeAmount);
      
      // Stake tokens
      await expect(
        tokenVoting.connect(voter1).stakeTokens(await simpleToken.getAddress(), stakeAmount)
      ).to.emit(tokenVoting, "TokensStaked");

      // Check staked amount
      expect(await tokenVoting.getStakedAmount(voter1.address, await simpleToken.getAddress()))
        .to.equal(stakeAmount);
    });

    it("Should allow users to unstake tokens", async function () {
      const stakeAmount = ethers.parseEther("1000");
      
      // Stake tokens first
      await simpleToken.connect(voter1).approve(await tokenVoting.getAddress(), stakeAmount);
      await tokenVoting.connect(voter1).stakeTokens(await simpleToken.getAddress(), stakeAmount);
      
      // Unstake tokens
      await expect(
        tokenVoting.connect(voter1).unstakeTokens(await simpleToken.getAddress(), stakeAmount)
      ).to.emit(tokenVoting, "TokensUnstaked");

      // Check staked amount
      expect(await tokenVoting.getStakedAmount(voter1.address, await simpleToken.getAddress()))
        .to.equal(0);
    });

    it("Should fail to stake more tokens than balance", async function () {
      const stakeAmount = ethers.parseEther("20000"); // More than balance
      
      await simpleToken.connect(voter1).approve(await tokenVoting.getAddress(), stakeAmount);
      
      await expect(
        tokenVoting.connect(voter1).stakeTokens(await simpleToken.getAddress(), stakeAmount)
      ).to.be.revertedWith("Insufficient token balance");
    });
  });

  describe("Traditional Voting", function () {
    let electionId;

    beforeEach(async function () {
      // Create traditional voting election
      const currentTime = Math.floor(Date.now() / 1000);
      const registrationStart = currentTime + 300;
      const registrationEnd = currentTime + 3600;
      const votingStart = currentTime + 3660;
      const votingEnd = currentTime + 7200;

      const tx = await tokenVoting.createElection(
        "Traditional Election",
        "One vote per address",
        registrationStart,
        registrationEnd,
        votingStart,
        votingEnd,
        0, // VotingType.OneVotePerAddress
        ethers.ZeroAddress,
        0
      );
      
      const receipt = await tx.wait();
      electionId = 1; // First election
    });

    it("Should allow candidate registration during registration period", async function () {
      // Fast forward to registration period
      await ethers.provider.send("evm_increaseTime", [300]);
      await ethers.provider.send("evm_mine");

      await expect(
        tokenVoting.connect(candidate1).registerCandidate(
          electionId,
          "Alice Johnson",
          "Experienced candidate"
        )
      ).to.emit(tokenVoting, "CandidateRegistered");
    });

    it("Should allow voting during voting period", async function () {
      // Register candidate
      await ethers.provider.send("evm_increaseTime", [300]);
      await ethers.provider.send("evm_mine");
      await tokenVoting.connect(candidate1).registerCandidate(
        electionId,
        "Alice Johnson",
        "Experienced candidate"
      );

      // Fast forward to voting period
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");

      // Vote
      await expect(
        tokenVoting.connect(voter1).vote(electionId, candidate1.address, 0)
      ).to.emit(tokenVoting, "VoteCast");

      // Check vote count
      const candidate = await tokenVoting.getCandidate(electionId, candidate1.address);
      expect(candidate.voteCount).to.equal(1);
    });

    it("Should prevent double voting", async function () {
      // Register candidate and vote
      await ethers.provider.send("evm_increaseTime", [300]);
      await ethers.provider.send("evm_mine");
      await tokenVoting.connect(candidate1).registerCandidate(
        electionId,
        "Alice Johnson",
        "Experienced candidate"
      );

      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");
      await tokenVoting.connect(voter1).vote(electionId, candidate1.address, 0);

      // Try to vote again
      await expect(
        tokenVoting.connect(voter1).vote(electionId, candidate1.address, 0)
      ).to.be.revertedWith("Already voted");
    });
  });

  describe("Token-Weighted Voting", function () {
    let electionId;

    beforeEach(async function () {
      // Create token-weighted voting election
      const currentTime = Math.floor(Date.now() / 1000);
      const registrationStart = currentTime + 300;
      const registrationEnd = currentTime + 3600;
      const votingStart = currentTime + 3660;
      const votingEnd = currentTime + 7200;

      const tx = await tokenVoting.createElection(
        "Token Weighted Election",
        "Vote weight equals token amount",
        registrationStart,
        registrationEnd,
        votingStart,
        votingEnd,
        1, // VotingType.TokenWeighted
        await simpleToken.getAddress(),
        ethers.parseEther("100")
      );
      
      electionId = 1;
    });

    it("Should allow token-weighted voting", async function () {
      // Register candidate
      await ethers.provider.send("evm_increaseTime", [300]);
      await ethers.provider.send("evm_mine");
      await tokenVoting.connect(candidate1).registerCandidate(
        electionId,
        "Alice Johnson",
        "Experienced candidate"
      );

      // Fast forward to voting period
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");

      // Approve and vote with tokens
      const voteAmount = ethers.parseEther("500");
      await simpleToken.connect(voter1).approve(await tokenVoting.getAddress(), voteAmount);
      
      await expect(
        tokenVoting.connect(voter1).vote(electionId, candidate1.address, voteAmount)
      ).to.emit(tokenVoting, "VoteCast");

      // Check vote counts
      const candidate = await tokenVoting.getCandidate(electionId, candidate1.address);
      expect(candidate.voteCount).to.equal(1);
      expect(candidate.tokenVoteCount).to.equal(voteAmount);
    });

    it("Should fail to vote with insufficient tokens", async function () {
      // Register candidate
      await ethers.provider.send("evm_increaseTime", [300]);
      await ethers.provider.send("evm_mine");
      await tokenVoting.connect(candidate1).registerCandidate(
        electionId,
        "Alice Johnson",
        "Experienced candidate"
      );

      // Fast forward to voting period
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");

      // Try to vote with insufficient tokens
      const voteAmount = ethers.parseEther("50"); // Less than minimum
      await simpleToken.connect(voter1).approve(await tokenVoting.getAddress(), voteAmount);
      
      await expect(
        tokenVoting.connect(voter1).vote(electionId, candidate1.address, voteAmount)
      ).to.be.revertedWith("Insufficient token amount");
    });
  });

  describe("Staked Voting", function () {
    let electionId;

    beforeEach(async function () {
      // Create staked voting election
      const currentTime = Math.floor(Date.now() / 1000);
      const registrationStart = currentTime + 300;
      const registrationEnd = currentTime + 3600;
      const votingStart = currentTime + 3660;
      const votingEnd = currentTime + 7200;

      const tx = await tokenVoting.createElection(
        "Staked Voting Election",
        "Must stake tokens to vote",
        registrationStart,
        registrationEnd,
        votingStart,
        votingEnd,
        2, // VotingType.StakedVoting
        await simpleToken.getAddress(),
        ethers.parseEther("500")
      );
      
      electionId = 1;
    });

    it("Should allow staked voting", async function () {
      // Stake tokens first
      const stakeAmount = ethers.parseEther("1000");
      await simpleToken.connect(voter1).approve(await tokenVoting.getAddress(), stakeAmount);
      await tokenVoting.connect(voter1).stakeTokens(await simpleToken.getAddress(), stakeAmount);

      // Register candidate
      await ethers.provider.send("evm_increaseTime", [300]);
      await ethers.provider.send("evm_mine");
      await tokenVoting.connect(candidate1).registerCandidate(
        electionId,
        "Alice Johnson",
        "Experienced candidate"
      );

      // Fast forward to voting period
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");

      // Vote with staked tokens
      const voteAmount = ethers.parseEther("500");
      await expect(
        tokenVoting.connect(voter1).vote(electionId, candidate1.address, voteAmount)
      ).to.emit(tokenVoting, "VoteCast");

      // Check vote counts and remaining stake
      const candidate = await tokenVoting.getCandidate(electionId, candidate1.address);
      expect(candidate.voteCount).to.equal(1);
      expect(candidate.tokenVoteCount).to.equal(voteAmount);
      
      const remainingStake = await tokenVoting.getStakedAmount(voter1.address, await simpleToken.getAddress());
      expect(remainingStake).to.equal(stakeAmount.sub(voteAmount));
    });

    it("Should fail to vote without staking", async function () {
      // Register candidate
      await ethers.provider.send("evm_increaseTime", [300]);
      await ethers.provider.send("evm_mine");
      await tokenVoting.connect(candidate1).registerCandidate(
        electionId,
        "Alice Johnson",
        "Experienced candidate"
      );

      // Fast forward to voting period
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");

      // Try to vote without staking
      const voteAmount = ethers.parseEther("500");
      await expect(
        tokenVoting.connect(voter1).vote(electionId, candidate1.address, voteAmount)
      ).to.be.revertedWith("Insufficient staked tokens");
    });
  });

  describe("Election Results", function () {
    let electionId;

    beforeEach(async function () {
      // Create election and register candidates
      const currentTime = Math.floor(Date.now() / 1000);
      const registrationStart = currentTime + 300;
      const registrationEnd = currentTime + 3600;
      const votingStart = currentTime + 3660;
      const votingEnd = currentTime + 7200;

      await tokenVoting.createElection(
        "Test Election",
        "Test election for results",
        registrationStart,
        registrationEnd,
        votingStart,
        votingEnd,
        0, // Traditional voting
        ethers.ZeroAddress,
        0
      );
      
      electionId = 1;

      // Register candidates
      await ethers.provider.send("evm_increaseTime", [300]);
      await ethers.provider.send("evm_mine");
      
      await tokenVoting.connect(candidate1).registerCandidate(
        electionId,
        "Alice Johnson",
        "Candidate 1"
      );
      
      await tokenVoting.connect(candidate2).registerCandidate(
        electionId,
        "Bob Smith",
        "Candidate 2"
      );
    });

    it("Should return correct election results", async function () {
      // Fast forward to voting period and vote
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");
      
      await tokenVoting.connect(voter1).vote(electionId, candidate1.address, 0);
      await tokenVoting.connect(voter2).vote(electionId, candidate1.address, 0);
      await tokenVoting.connect(voter3).vote(electionId, candidate2.address, 0);

      // Get results
      const results = await tokenVoting.getElectionResults(electionId);
      const totalVotes = await tokenVoting.getTotalVotes(electionId);

      expect(totalVotes[0]).to.equal(3); // 3 votes total
      expect(results.candidateAddresses.length).to.equal(2);
      expect(results.names[0]).to.equal("Alice Johnson"); // Should be first (2 votes)
      expect(results.voteCounts[0]).to.equal(2);
      expect(results.names[1]).to.equal("Bob Smith"); // Should be second (1 vote)
      expect(results.voteCounts[1]).to.equal(1);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle multiple elections correctly", async function () {
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Create multiple elections
      for (let i = 0; i < 3; i++) {
        await tokenVoting.createElection(
          `Election ${i + 1}`,
          `Description ${i + 1}`,
          currentTime + 300 + i * 100,
          currentTime + 3600 + i * 100,
          currentTime + 3660 + i * 100,
          currentTime + 7200 + i * 100,
          0,
          ethers.ZeroAddress,
          0
        );
      }

      const totalElections = await tokenVoting.getTotalElections();
      expect(totalElections).to.equal(3);
    });

    it("Should prevent voting outside voting period", async function () {
      const currentTime = Math.floor(Date.now() / 1000);
      const registrationStart = currentTime + 300;
      const registrationEnd = currentTime + 3600;
      const votingStart = currentTime + 3660;
      const votingEnd = currentTime + 7200;

      await tokenVoting.createElection(
        "Test Election",
        "Test election",
        registrationStart,
        registrationEnd,
        votingStart,
        votingEnd,
        0,
        ethers.ZeroAddress,
        0
      );

      // Try to vote before voting period
      await expect(
        tokenVoting.connect(voter1).vote(1, candidate1.address, 0)
      ).to.be.revertedWith("Not in voting period");
    });
  });
});
