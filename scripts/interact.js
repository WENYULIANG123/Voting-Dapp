const { ethers } = require("hardhat");

/**
 * Voting DApp Interaction Example Script
 * Demonstrates the complete workflow of using the voting smart contract
 */
async function main() {
  console.log("=== Voting DApp Interaction Example ===\n");

  // Get accounts
  const [owner, voter1, voter2, voter3, candidate1, candidate2] = await ethers.getSigners();
  
  console.log("Account Information:");
  console.log("Contract Owner:", owner.address);
  console.log("Voter 1:", voter1.address);
  console.log("Voter 2:", voter2.address);
  console.log("Voter 3:", voter3.address);
  console.log("Candidate 1:", candidate1.address);
  console.log("Candidate 2:", candidate2.address);
  console.log();

  // Deploy contract
  console.log("1. Deploying voting contract...");
  const VotingContract = await ethers.getContractFactory("VotingContract");
  const votingContract = await VotingContract.deploy();
  await votingContract.waitForDeployment();
  console.log("Contract Address:", await votingContract.getAddress());
  console.log();

  // Create election
  console.log("2. Creating election...");
  const currentTime = Math.floor(Date.now() / 1000);
  const registrationStart = currentTime + 60;    // Registration starts in 1 minute
  const registrationEnd = currentTime + 300;     // Registration ends in 5 minutes
  const votingStart = currentTime + 360;         // Voting starts in 6 minutes
  const votingEnd = currentTime + 600;           // Voting ends in 10 minutes

  const createTx = await votingContract.createElection(
    "Student Union President Election",
    "2024 Student Union President Election, please participate actively in voting",
    registrationStart,
    registrationEnd,
    votingStart,
    votingEnd
  );
  
  const createReceipt = await createTx.wait();
  const createEvent = createReceipt.logs.find(log => {
    try {
      const parsed = votingContract.interface.parseLog(log);
      return parsed && parsed.name === "ElectionCreated";
    } catch (e) {
      return false;
    }
  });
  const parsedEvent = votingContract.interface.parseLog(createEvent);
  const electionId = parsedEvent.args.electionId;
  
  console.log("Election ID:", electionId.toString());
  console.log("Election Title: Student Union President Election");
  console.log("Registration Period:", new Date(registrationStart * 1000).toLocaleString(), "to", new Date(registrationEnd * 1000).toLocaleString());
  console.log("Voting Period:", new Date(votingStart * 1000).toLocaleString(), "to", new Date(votingEnd * 1000).toLocaleString());
  console.log();

  // Wait for registration period to start
  console.log("3. Waiting for registration period to start...");
  await ethers.provider.send("evm_increaseTime", [60]);
  await ethers.provider.send("evm_mine", []);
  console.log("Registration period has started");
  console.log();

  // Register candidates
  console.log("4. Candidate registration...");
  
  const register1Tx = await votingContract.connect(candidate1).registerCandidate(
    electionId,
    "John Zhang",
    "Computer Science major with extensive student leadership experience, committed to improving campus life"
  );
  await register1Tx.wait();
  console.log("Candidate 1 registered successfully: John Zhang");

  const register2Tx = await votingContract.connect(candidate2).registerCandidate(
    electionId,
    "Li Si",
    "Software Engineering major, actively involved in club activities, hopes to serve fellow students"
  );
  await register2Tx.wait();
  console.log("Candidate 2 registered successfully: Li Si");
  console.log();

  // Query candidate list
  console.log("5. Querying candidate list...");
  const candidateList = await votingContract.getCandidateList(electionId);
  console.log("Number of candidates:", candidateList.length);
  
  for (let i = 0; i < candidateList.length; i++) {
    const candidate = await votingContract.getCandidate(electionId, candidateList[i]);
    console.log(`Candidate ${i + 1}: ${candidate.name} (${candidate.candidateAddress})`);
    console.log(`  Description: ${candidate.description}`);
    console.log(`  Current votes: ${candidate.voteCount}`);
  }
  console.log();

  // Wait for voting period to start
  console.log("6. Waiting for voting period to start...");
  await ethers.provider.send("evm_increaseTime", [300]);
  await ethers.provider.send("evm_mine", []);
  console.log("Voting period has started");
  console.log();

  // Voting
  console.log("7. Starting voting...");
  
  // Voter 1 votes for candidate 1
  const vote1Tx = await votingContract.connect(voter1).vote(electionId, candidate1.address);
  await vote1Tx.wait();
  console.log("Voter 1 voted for John Zhang");

  // Voter 2 votes for candidate 1
  const vote2Tx = await votingContract.connect(voter2).vote(electionId, candidate1.address);
  await vote2Tx.wait();
  console.log("Voter 2 voted for John Zhang");

  // Voter 3 votes for candidate 2
  const vote3Tx = await votingContract.connect(voter3).vote(electionId, candidate2.address);
  await vote3Tx.wait();
  console.log("Voter 3 voted for Li Si");
  console.log();

  // Query voting status
  console.log("8. Querying voting status...");
  const hasVoted1 = await votingContract.hasUserVoted(electionId, voter1.address);
  const hasVoted2 = await votingContract.hasUserVoted(electionId, voter2.address);
  const hasVoted3 = await votingContract.hasUserVoted(electionId, voter3.address);
  
  console.log("Has Voter 1 voted:", hasVoted1);
  console.log("Has Voter 2 voted:", hasVoted2);
  console.log("Has Voter 3 voted:", hasVoted3);
  console.log();

  // Query real-time results
  console.log("9. Querying real-time voting results...");
  const results = await votingContract.getElectionResults(electionId);
  const totalVotes = await votingContract.getTotalVotes(electionId);
  
  console.log("Total votes:", totalVotes.toString());
  console.log("Voting results:");
  
  for (let i = 0; i < results.candidateAddresses.length; i++) {
    console.log(`Rank ${i + 1}: ${results.names[i]} - ${results.voteCounts[i]} votes`);
  }
  console.log();

  // Query election status
  console.log("10. Querying election status...");
  const status = await votingContract.getElectionStatus(electionId);
  const statusNames = ["Not Started", "Registration", "Voting", "Ended"];
  console.log("Current status:", statusNames[status]);
  
  const timeInfo = await votingContract.getTimeRemaining(electionId);
  console.log("Current phase:", timeInfo.currentPhase);
  console.log("Registration time remaining:", timeInfo.registrationTimeRemaining.toString(), "seconds");
  console.log("Voting time remaining:", timeInfo.votingTimeRemaining.toString(), "seconds");
  console.log();

  // Wait for voting period to end
  console.log("11. Waiting for voting period to end...");
  await ethers.provider.send("evm_increaseTime", [300]);
  await ethers.provider.send("evm_mine", []);
  console.log("Voting period has ended");
  console.log();

  // Query final results
  console.log("12. Final election results...");
  const finalStatus = await votingContract.getElectionStatus(electionId);
  console.log("Election status:", statusNames[finalStatus]);
  
  const finalResults = await votingContract.getElectionResults(electionId);
  const finalTotalVotes = await votingContract.getTotalVotes(electionId);
  
  console.log("Final total votes:", finalTotalVotes.toString());
  console.log("Final results:");
  
  for (let i = 0; i < finalResults.candidateAddresses.length; i++) {
    const percentage = finalTotalVotes > 0 ? 
      (Number(finalResults.voteCounts[i]) * 100 / Number(finalTotalVotes)).toFixed(2) : 0;
    console.log(`Rank ${i + 1}: ${finalResults.names[i]} - ${finalResults.voteCounts[i]} votes (${percentage}%)`);
  }
  
  // Determine winner
  if (finalResults.voteCounts.length > 0) {
    const winner = finalResults.voteCounts[0] > finalResults.voteCounts[1] ? 
      finalResults.names[0] : finalResults.names[1];
    console.log(`\n🏆 Winner: ${winner}`);
  }
  
  console.log("\n=== Interaction Example Completed ===");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Interaction example failed:", error);
    process.exit(1);
  });
