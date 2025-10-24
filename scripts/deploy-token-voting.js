const { ethers } = require("hardhat");

async function main() {
  console.log("Starting deployment of Token Voting System...");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deployer account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // Deploy SimpleToken contract
  console.log("\n1. Deploying SimpleToken...");
  const SimpleToken = await ethers.getContractFactory("SimpleToken");
  const initialSupply = 1000000; // 1 million tokens
  const simpleToken = await SimpleToken.deploy(initialSupply);
  await simpleToken.waitForDeployment();
  
  console.log("SimpleToken deployed to:", await simpleToken.getAddress());
  console.log("Token name:", await simpleToken.name());
  console.log("Token symbol:", await simpleToken.symbol());
  console.log("Total supply:", ethers.formatEther(await simpleToken.totalSupply()));
  console.log("Deployer balance:", ethers.formatEther(await simpleToken.balanceOf(deployer.address)));

  // Deploy TokenVotingContract
  console.log("\n2. Deploying TokenVotingContract...");
  const TokenVotingContract = await ethers.getContractFactory("TokenVotingContract");
  const tokenVotingContract = await TokenVotingContract.deploy();
  await tokenVotingContract.waitForDeployment();

  console.log("TokenVotingContract deployed to:", await tokenVotingContract.getAddress());

  // Create sample elections
  console.log("\n3. Creating sample elections...");
  const currentTime = Math.floor(Date.now() / 1000);
  
  // Traditional voting election
  const registrationStart1 = currentTime + 60; // 1 minute from now
  const registrationEnd1 = currentTime + 3600; // 1 hour from now
  const votingStart1 = currentTime + 3660; // 1 minute after registration ends
  const votingEnd1 = currentTime + 7200; // 2 hours from now

  const tx1 = await tokenVotingContract.createElection(
    "Student Council Election",
    "Traditional voting for student council president",
    registrationStart1,
    registrationEnd1,
    votingStart1,
    votingEnd1,
    0, // VotingType.OneVotePerAddress
    ethers.ZeroAddress, // No token required
    0 // No minimum tokens
  );
  await tx1.wait();
  console.log("Traditional election created, transaction hash:", tx1.hash);

  // Token-weighted voting election
  const registrationStart2 = currentTime + 120; // 2 minutes from now
  const registrationEnd2 = currentTime + 3660; // 1 hour and 1 minute from now
  const votingStart2 = currentTime + 3720; // 1 minute after registration ends
  const votingEnd2 = currentTime + 7320; // 2 hours and 2 minutes from now

  const tx2 = await tokenVotingContract.createElection(
    "DAO Governance Vote",
    "Token-weighted voting for DAO proposal",
    registrationStart2,
    registrationEnd2,
    votingStart2,
    votingEnd2,
    1, // VotingType.TokenWeighted
    await simpleToken.getAddress(), // Use SimpleToken
    ethers.parseEther("100") // Minimum 100 tokens required
  );
  await tx2.wait();
  console.log("Token-weighted election created, transaction hash:", tx2.hash);

  // Staked voting election
  const registrationStart3 = currentTime + 180; // 3 minutes from now
  const registrationEnd3 = currentTime + 3720; // 1 hour and 2 minutes from now
  const votingStart3 = currentTime + 3780; // 1 minute after registration ends
  const votingEnd3 = currentTime + 7380; // 2 hours and 3 minutes from now

  const tx3 = await tokenVotingContract.createElection(
    "Staked Governance Vote",
    "Staked token voting for protocol upgrade",
    registrationStart3,
    registrationEnd3,
    votingStart3,
    votingEnd3,
    2, // VotingType.StakedVoting
    await simpleToken.getAddress(), // Use SimpleToken
    ethers.parseEther("500") // Minimum 500 tokens required
  );
  await tx3.wait();
  console.log("Staked voting election created, transaction hash:", tx3.hash);

  // Distribute tokens to test accounts
  console.log("\n4. Distributing tokens to test accounts...");
  const accounts = await ethers.getSigners();
  
  for (let i = 1; i < Math.min(accounts.length, 6); i++) {
    const amount = ethers.parseEther("10000"); // 10,000 tokens each
    await simpleToken.transfer(accounts[i].address, amount);
    console.log(`Transferred 10,000 tokens to ${accounts[i].address}`);
  }

  // Save deployment information
  const deploymentInfo = {
    network: await ethers.provider.getNetwork(),
    deployer: deployer.address,
    deploymentTime: new Date().toISOString(),
    contracts: {
      SimpleToken: {
        address: await simpleToken.getAddress(),
        name: await simpleToken.name(),
        symbol: await simpleToken.symbol(),
        totalSupply: ethers.formatEther(await simpleToken.totalSupply()),
        transactionHash: simpleToken.deploymentTransaction().hash
      },
      TokenVotingContract: {
        address: await tokenVotingContract.getAddress(),
        transactionHash: tokenVotingContract.deploymentTransaction().hash
      }
    },
    elections: {
      traditional: {
        id: 1,
        title: "Student Council Election",
        type: "OneVotePerAddress"
      },
      tokenWeighted: {
        id: 2,
        title: "DAO Governance Vote",
        type: "TokenWeighted",
        tokenAddress: await simpleToken.getAddress(),
        minTokens: "100"
      },
      stakedVoting: {
        id: 3,
        title: "Staked Governance Vote",
        type: "StakedVoting",
        tokenAddress: await simpleToken.getAddress(),
        minTokens: "500"
      }
    }
  };

  console.log("\n=== Deployment Summary ===");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Instructions for testing
  console.log("\n=== Testing Instructions ===");
  console.log("1. Traditional Voting (Election ID: 1):");
  console.log("   - Anyone can register as candidate during registration period");
  console.log("   - Each address gets one vote during voting period");
  console.log("   - No tokens required");
  
  console.log("\n2. Token-Weighted Voting (Election ID: 2):");
  console.log("   - Requires minimum 100 tokens to vote");
  console.log("   - Vote weight equals token amount used");
  console.log("   - Tokens are not locked during voting");
  
  console.log("\n3. Staked Voting (Election ID: 3):");
  console.log("   - Requires minimum 500 tokens to vote");
  console.log("   - Must stake tokens first using stakeTokens()");
  console.log("   - Staked tokens are locked during voting");
  
  console.log("\n=== Next Steps ===");
  console.log("1. Wait for registration periods to start");
  console.log("2. Register candidates using registerCandidate()");
  console.log("3. For staked voting, stake tokens using stakeTokens()");
  console.log("4. Vote using vote() function with appropriate parameters");
  console.log("5. Check results using getElectionResults()");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
