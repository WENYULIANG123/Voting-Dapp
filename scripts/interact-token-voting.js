const { ethers } = require("hardhat");

async function main() {
  // Contract addresses (update these after deployment)
  const SIMPLE_TOKEN_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Update with actual address
  const TOKEN_VOTING_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"; // Update with actual address

  console.log("Token Voting System Interaction Demo");
  console.log("===================================");

  // Get accounts
  const [deployer, voter1, voter2, voter3, candidate1, candidate2] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Voter 1:", voter1.address);
  console.log("Voter 2:", voter2.address);
  console.log("Voter 3:", voter3.address);
  console.log("Candidate 1:", candidate1.address);
  console.log("Candidate 2:", candidate2.address);

  // Connect to contracts
  const SimpleToken = await ethers.getContractFactory("SimpleToken");
  const simpleToken = SimpleToken.attach(SIMPLE_TOKEN_ADDRESS);

  const TokenVotingContract = await ethers.getContractFactory("TokenVotingContract");
  const tokenVoting = TokenVotingContract.attach(TOKEN_VOTING_ADDRESS);

  console.log("\n=== Contract Information ===");
  console.log("SimpleToken address:", await simpleToken.getAddress());
  console.log("TokenVotingContract address:", await tokenVoting.getAddress());
  console.log("Token name:", await simpleToken.name());
  console.log("Token symbol:", await simpleToken.symbol());

  // Check token balances
  console.log("\n=== Token Balances ===");
  const balances = await Promise.all([
    simpleToken.balanceOf(deployer.address),
    simpleToken.balanceOf(voter1.address),
    simpleToken.balanceOf(voter2.address),
    simpleToken.balanceOf(voter3.address)
  ]);
  
  console.log("Deployer balance:", ethers.formatEther(balances[0]));
  console.log("Voter 1 balance:", ethers.formatEther(balances[1]));
  console.log("Voter 2 balance:", ethers.formatEther(balances[2]));
  console.log("Voter 3 balance:", ethers.formatEther(balances[3]));

  // Get election information
  console.log("\n=== Election Information ===");
  const totalElections = await tokenVoting.getTotalElections();
  console.log("Total elections:", totalElections.toString());

  for (let i = 1; i <= totalElections; i++) {
    const election = await tokenVoting.getElection(i);
    console.log(`\nElection ${i}:`);
    console.log("  Title:", election.title);
    console.log("  Description:", election.description);
    console.log("  Voting Type:", election.votingType.toString());
    console.log("  Token Address:", election.tokenAddress);
    console.log("  Min Tokens Required:", ethers.formatEther(election.minTokenRequired));
    console.log("  Registration Start:", new Date(election.registrationStart * 1000).toLocaleString());
    console.log("  Registration End:", new Date(election.registrationEnd * 1000).toLocaleString());
    console.log("  Voting Start:", new Date(election.votingStart * 1000).toLocaleString());
    console.log("  Voting End:", new Date(election.votingEnd * 1000).toLocaleString());
    
    const status = await tokenVoting.getElectionStatus(i);
    console.log("  Current Status:", status.toString());
  }

  // Demo: Register candidates (if in registration period)
  console.log("\n=== Candidate Registration Demo ===");
  try {
    // Check if we can register for election 1 (traditional voting)
    const election1Status = await tokenVoting.getElectionStatus(1);
    if (election1Status.toString() === "1") { // Registration period
      console.log("Registering candidates for Election 1...");
      
      // Approve token spending for candidate registration (if needed)
      await simpleToken.connect(candidate1).approve(await tokenVoting.getAddress(), ethers.parseEther("1000"));
      await simpleToken.connect(candidate2).approve(await tokenVoting.getAddress(), ethers.parseEther("1000"));
      
      // Register candidates
      const tx1 = await tokenVoting.connect(candidate1).registerCandidate(
        1,
        "Alice Johnson",
        "Experienced student leader with 2 years of council experience"
      );
      await tx1.wait();
      console.log("Candidate 1 registered:", candidate1.address);

      const tx2 = await tokenVoting.connect(candidate2).registerCandidate(
        1,
        "Bob Smith",
        "New candidate with fresh ideas for student welfare"
      );
      await tx2.wait();
      console.log("Candidate 2 registered:", candidate2.address);
    } else {
      console.log("Election 1 is not in registration period. Current status:", election1Status.toString());
    }
  } catch (error) {
    console.log("Candidate registration failed:", error.message);
  }

  // Demo: Staking tokens for staked voting
  console.log("\n=== Token Staking Demo ===");
  try {
    // Check staked amounts before
      const stakedBefore1 = await tokenVoting.getStakedAmount(voter1.address, await simpleToken.getAddress());
      const stakedBefore2 = await tokenVoting.getStakedAmount(voter2.address, await simpleToken.getAddress());
    
    console.log("Staked amounts before:");
    console.log("Voter 1:", ethers.formatEther(stakedBefore1));
    console.log("Voter 2:", ethers.formatEther(stakedBefore2));

    // Stake tokens
    const stakeAmount = ethers.parseEther("1000");
    
    // Approve token spending
    await simpleToken.connect(voter1).approve(await tokenVoting.getAddress(), stakeAmount);
    await simpleToken.connect(voter2).approve(await tokenVoting.getAddress(), stakeAmount);
    
    // Stake tokens
    const stakeTx1 = await tokenVoting.connect(voter1).stakeTokens(await simpleToken.getAddress(), stakeAmount);
    await stakeTx1.wait();
    console.log("Voter 1 staked 1000 tokens");

    const stakeTx2 = await tokenVoting.connect(voter2).stakeTokens(await simpleToken.getAddress(), stakeAmount);
    await stakeTx2.wait();
    console.log("Voter 2 staked 1000 tokens");

    // Check staked amounts after
    const stakedAfter1 = await tokenVoting.getStakedAmount(voter1.address, await simpleToken.getAddress());
    const stakedAfter2 = await tokenVoting.getStakedAmount(voter2.address, await simpleToken.getAddress());
    
    console.log("Staked amounts after:");
    console.log("Voter 1:", ethers.formatEther(stakedAfter1));
    console.log("Voter 2:", ethers.formatEther(stakedAfter2));
  } catch (error) {
    console.log("Token staking failed:", error.message);
  }

  // Demo: Voting (if in voting period)
  console.log("\n=== Voting Demo ===");
  try {
    // Check if we can vote for election 1
    const election1Status = await tokenVoting.getElectionStatus(1);
    if (election1Status.toString() === "2") { // Voting period
      console.log("Voting for Election 1...");
      
      // Get candidate list
      const candidates = await tokenVoting.getCandidateList(1);
      console.log("Candidates:", candidates);
      
      if (candidates.length >= 2) {
        // Vote for candidate 1 (traditional voting)
        const voteTx1 = await tokenVoting.connect(voter1).vote(1, candidates[0], 0);
        await voteTx1.wait();
        console.log("Voter 1 voted for candidate:", candidates[0]);

        const voteTx2 = await tokenVoting.connect(voter2).vote(1, candidates[1], 0);
        await voteTx2.wait();
        console.log("Voter 2 voted for candidate:", candidates[1]);
      }
    } else {
      console.log("Election 1 is not in voting period. Current status:", election1Status.toString());
    }
  } catch (error) {
    console.log("Voting failed:", error.message);
  }

  // Demo: Token-weighted voting
  console.log("\n=== Token-Weighted Voting Demo ===");
  try {
    const election2Status = await tokenVoting.getElectionStatus(2);
    if (election2Status.toString() === "2") { // Voting period
      console.log("Token-weighted voting for Election 2...");
      
      // Approve token spending for voting
      const voteAmount = ethers.parseEther("500");
      await simpleToken.connect(voter1).approve(await tokenVoting.getAddress(), voteAmount);
      await simpleToken.connect(voter2).approve(await tokenVoting.getAddress(), voteAmount);
      
      // Get candidate list
      const candidates = await tokenVoting.getCandidateList(2);
      console.log("Candidates:", candidates);
      
      if (candidates.length >= 1) {
        // Vote with tokens
        const voteTx1 = await tokenVoting.connect(voter1).vote(2, candidates[0], voteAmount);
        await voteTx1.wait();
        console.log("Voter 1 voted with 500 tokens for candidate:", candidates[0]);

        const voteTx2 = await tokenVoting.connect(voter2).vote(2, candidates[0], voteAmount);
        await voteTx2.wait();
        console.log("Voter 2 voted with 500 tokens for candidate:", candidates[0]);
      }
    } else {
      console.log("Election 2 is not in voting period. Current status:", election2Status.toString());
    }
  } catch (error) {
    console.log("Token-weighted voting failed:", error.message);
  }

  // Demo: Staked voting
  console.log("\n=== Staked Voting Demo ===");
  try {
    const election3Status = await tokenVoting.getElectionStatus(3);
    if (election3Status.toString() === "2") { // Voting period
      console.log("Staked voting for Election 3...");
      
      // Get candidate list
      const candidates = await tokenVoting.getCandidateList(3);
      console.log("Candidates:", candidates);
      
      if (candidates.length >= 1) {
        // Vote with staked tokens
        const voteAmount = ethers.parseEther("500");
        const voteTx1 = await tokenVoting.connect(voter1).vote(3, candidates[0], voteAmount);
        await voteTx1.wait();
        console.log("Voter 1 voted with 500 staked tokens for candidate:", candidates[0]);
      }
    } else {
      console.log("Election 3 is not in voting period. Current status:", election3Status.toString());
    }
  } catch (error) {
    console.log("Staked voting failed:", error.message);
  }

  // Get election results
  console.log("\n=== Election Results ===");
  for (let i = 1; i <= totalElections; i++) {
    try {
      const results = await tokenVoting.getElectionResults(i);
      const totalVotes = await tokenVoting.getTotalVotes(i);
      
      console.log(`\nElection ${i} Results:`);
      console.log("Total votes:", totalVotes[0].toString());
      console.log("Total token votes:", ethers.formatEther(totalVotes[1]));
      
      for (let j = 0; j < results.candidateAddresses.length; j++) {
        console.log(`  ${results.names[j]}: ${results.voteCounts[j]} votes, ${ethers.formatEther(results.tokenVoteCounts[j])} token votes`);
      }
    } catch (error) {
      console.log(`Election ${i} results not available:`, error.message);
    }
  }

  console.log("\n=== Demo Complete ===");
  console.log("This demo showed:");
  console.log("1. Traditional voting (1 vote per address)");
  console.log("2. Token-weighted voting (vote weight = token amount)");
  console.log("3. Staked voting (must stake tokens first)");
  console.log("4. Token staking and unstaking");
  console.log("5. Election result queries");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Interaction failed:", error);
    process.exit(1);
  });
