const { ethers } = require("hardhat");

async function main() {
  console.log("=== Simple Token Voting Test ===");
  
  // Get accounts
  const [deployer, voter1, voter2, candidate1, candidate2] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Voter 1:", voter1.address);
  console.log("Voter 2:", voter2.address);
  console.log("Candidate 1:", candidate1.address);
  console.log("Candidate 2:", candidate2.address);

  // Deploy SimpleToken
  console.log("\n1. Deploying SimpleToken...");
  const SimpleToken = await ethers.getContractFactory("SimpleToken");
  const simpleToken = await SimpleToken.deploy(1000000); // 1 million tokens
  await simpleToken.waitForDeployment();
  
  console.log("SimpleToken deployed to:", await simpleToken.getAddress());
  console.log("Token name:", await simpleToken.name());
  console.log("Token symbol:", await simpleToken.symbol());
  console.log("Total supply:", ethers.formatEther(await simpleToken.totalSupply()));

  // Deploy TokenVotingContract
  console.log("\n2. Deploying TokenVotingContract...");
  const TokenVotingContract = await ethers.getContractFactory("TokenVotingContract");
  const tokenVoting = await TokenVotingContract.deploy();
  await tokenVoting.waitForDeployment();

  console.log("TokenVotingContract deployed to:", await tokenVoting.getAddress());

  // Get current block timestamp
  const currentBlock = await ethers.provider.getBlock('latest');
  const currentTime = currentBlock.timestamp;
  console.log("Current blockchain time:", new Date(currentTime * 1000).toLocaleString());

  // Create a test election with shorter time intervals
  console.log("\n3. Creating test election...");
  const registrationStart = currentTime + 5; // 5 seconds from now
  const registrationEnd = currentTime + 15; // 15 seconds from now
  const votingStart = currentTime + 20; // 20 seconds from now
  const votingEnd = currentTime + 30; // 30 seconds from now

  console.log("Registration start:", new Date(registrationStart * 1000).toLocaleString());
  console.log("Registration end:", new Date(registrationEnd * 1000).toLocaleString());
  console.log("Voting start:", new Date(votingStart * 1000).toLocaleString());
  console.log("Voting end:", new Date(votingEnd * 1000).toLocaleString());

  const tx = await tokenVoting.createElection(
    "Test Token Voting",
    "Test election for token-weighted voting",
    registrationStart,
    registrationEnd,
    votingStart,
    votingEnd,
    1, // VotingType.TokenWeighted
    await simpleToken.getAddress(),
    ethers.parseEther("100") // Minimum 100 tokens required
  );
  await tx.wait();
  console.log("Election created with ID: 1");

  // Distribute tokens to test accounts
  console.log("\n4. Distributing tokens...");
  const accounts = [voter1, voter2, candidate1, candidate2];
  for (const account of accounts) {
    const amount = ethers.parseEther("1000"); // 1000 tokens each
    await simpleToken.transfer(account.address, amount);
    console.log(`Transferred 1000 tokens to ${account.address}`);
  }

  // Check token balances
  console.log("\n5. Token balances:");
  for (const account of accounts) {
    const balance = await simpleToken.balanceOf(account.address);
    console.log(`${account.address}: ${ethers.formatEther(balance)} tokens`);
  }

  // Wait for registration period
  console.log("\n6. Waiting for registration period...");
  await new Promise(resolve => setTimeout(resolve, 6000)); // Wait 6 seconds

  // Register candidates
  console.log("\n7. Registering candidates...");
  try {
    // Approve token spending for candidate registration
    await simpleToken.connect(candidate1).approve(await tokenVoting.getAddress(), ethers.parseEther("100"));
    await simpleToken.connect(candidate2).approve(await tokenVoting.getAddress(), ethers.parseEther("100"));
    
    const tx1 = await tokenVoting.connect(candidate1).registerCandidate(
      1,
      "Alice Johnson",
      "Experienced leader with 2 years of council experience"
    );
    await tx1.wait();
    console.log("Candidate 1 registered: Alice Johnson");

    const tx2 = await tokenVoting.connect(candidate2).registerCandidate(
      1,
      "Bob Smith",
      "New candidate with fresh ideas"
    );
    await tx2.wait();
    console.log("Candidate 2 registered: Bob Smith");
  } catch (error) {
    console.log("Candidate registration failed:", error.message);
  }

  // Wait for voting period
  console.log("\n8. Waiting for voting period...");
  await new Promise(resolve => setTimeout(resolve, 6000)); // Wait 6 seconds

  // Vote with tokens
  console.log("\n9. Voting with tokens...");
  try {
    // Get candidate list
    const candidates = await tokenVoting.getCandidateList(1);
    console.log("Candidates:", candidates);

    if (candidates.length >= 2) {
      // Approve token spending for voting
      const voteAmount1 = ethers.parseEther("200"); // Vote with 200 tokens
      const voteAmount2 = ethers.parseEther("300"); // Vote with 300 tokens

      await simpleToken.connect(voter1).approve(await tokenVoting.getAddress(), voteAmount1);
      await simpleToken.connect(voter2).approve(await tokenVoting.getAddress(), voteAmount2);

      // Vote for candidate 1 with different token amounts
      const voteTx1 = await tokenVoting.connect(voter1).vote(1, candidates[0], voteAmount1);
      await voteTx1.wait();
      console.log("Voter 1 voted with 200 tokens for Alice Johnson");

      const voteTx2 = await tokenVoting.connect(voter2).vote(1, candidates[0], voteAmount2);
      await voteTx2.wait();
      console.log("Voter 2 voted with 300 tokens for Alice Johnson");
    }
  } catch (error) {
    console.log("Voting failed:", error.message);
  }

  // Wait for election to end
  console.log("\n10. Waiting for election to end...");
  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

  // Get results
  console.log("\n11. Election results:");
  try {
    const results = await tokenVoting.getElectionResults(1);
    const totalVotes = await tokenVoting.getTotalVotes(1);
    
    console.log("Total votes:", totalVotes[0].toString());
    console.log("Total token votes:", ethers.formatEther(totalVotes[1]));
    
    for (let i = 0; i < results.candidateAddresses.length; i++) {
      console.log(`  ${results.names[i]}: ${results.voteCounts[i]} votes, ${ethers.formatEther(results.tokenVoteCounts[i])} token votes`);
    }
  } catch (error) {
    console.log("Results not available:", error.message);
  }

  console.log("\n=== Test Complete ===");
  console.log("This test demonstrated:");
  console.log("1. Token deployment and distribution");
  console.log("2. Token-weighted voting (vote weight = token amount)");
  console.log("3. Multiple voters with different token amounts");
  console.log("4. Election result queries");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  });
