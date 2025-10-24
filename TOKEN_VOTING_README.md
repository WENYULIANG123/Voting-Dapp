# Token-Enhanced Voting DApp

An advanced voting system that integrates ERC-20 tokens with blockchain-based voting, supporting multiple voting mechanisms including traditional voting, token-weighted voting, and staked voting.

## 🚀 Features

### Core Voting Types
- ✅ **Traditional Voting**: One vote per address (classic voting)
- ✅ **Token-Weighted Voting**: Vote weight equals token amount used
- ✅ **Staked Voting**: Must stake tokens first, then vote with staked tokens
- ✅ **ERC-20 Token Integration**: Full compatibility with any ERC-20 token
- ✅ **Token Staking System**: Stake and unstake tokens for governance

### Advanced Features
- ✅ **Multi-Election Support**: Create multiple elections simultaneously
- ✅ **Flexible Time Management**: Customizable registration and voting periods
- ✅ **Comprehensive Results**: Both vote count and token-weighted results
- ✅ **Security Features**: ReentrancyGuard, input validation, time checks
- ✅ **Event Logging**: Complete audit trail of all operations

## 🏗️ Architecture

### Smart Contracts

1. **SimpleToken.sol**: Basic ERC-20 token implementation
2. **TokenVotingContract.sol**: Enhanced voting system with token integration

### Voting Types

```solidity
enum VotingType {
    OneVotePerAddress,  // Traditional voting (1 vote per address)
    TokenWeighted,      // Token-weighted voting
    StakedVoting        // Staked token voting
}
```

## 📋 Project Structure

```
voting-dapp/
├── contracts/
│   ├── SimpleToken.sol              # ERC-20 token contract
│   ├── TokenVotingContract.sol      # Enhanced voting contract
│   └── VotingContract.sol           # Original voting contract
├── scripts/
│   ├── deploy-token-voting.js       # Deploy both contracts
│   ├── interact-token-voting.js     # Interaction demo
│   ├── deploy.js                    # Original deployment
│   └── interact.js                  # Original interaction
├── test/
│   ├── TokenVotingContract.test.js  # Comprehensive test suite
│   └── VotingContract.test.js       # Original tests
└── README.md                        # Original documentation
```

## 🛠️ Installation & Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Compile Contracts

```bash
npm run compile
```

### 3. Run Tests

```bash
# Run all tests
npm test

# Run token voting tests only
npm run test:token-voting
```

### 4. Deploy Contracts

```bash
# Deploy to local network
npm run deploy:token-voting:local

# Deploy to other networks
npm run deploy:token-voting
```

## 🎯 Usage Examples

### 1. Traditional Voting

```javascript
// Create traditional election
await tokenVoting.createElection(
    "Student Council Election",
    "Traditional voting for student council",
    registrationStart,
    registrationEnd,
    votingStart,
    votingEnd,
    0, // VotingType.OneVotePerAddress
    ethers.constants.AddressZero, // No token required
    0 // No minimum tokens
);

// Vote (one vote per address)
await tokenVoting.vote(electionId, candidateAddress, 0);
```

### 2. Token-Weighted Voting

```javascript
// Create token-weighted election
await tokenVoting.createElection(
    "DAO Governance Vote",
    "Token-weighted voting for DAO proposal",
    registrationStart,
    registrationEnd,
    votingStart,
    votingEnd,
    1, // VotingType.TokenWeighted
    tokenAddress, // ERC-20 token address
    ethers.utils.parseEther("100") // Minimum 100 tokens required
);

// Approve and vote with tokens
await token.approve(votingContract.address, voteAmount);
await tokenVoting.vote(electionId, candidateAddress, voteAmount);
```

### 3. Staked Voting

```javascript
// Create staked voting election
await tokenVoting.createElection(
    "Protocol Upgrade Vote",
    "Staked token voting for protocol upgrade",
    registrationStart,
    registrationEnd,
    votingStart,
    votingEnd,
    2, // VotingType.StakedVoting
    tokenAddress, // ERC-20 token address
    ethers.utils.parseEther("500") // Minimum 500 tokens required
);

// Stake tokens first
await token.approve(votingContract.address, stakeAmount);
await tokenVoting.stakeTokens(tokenAddress, stakeAmount);

// Vote with staked tokens
await tokenVoting.vote(electionId, candidateAddress, voteAmount);
```

### 4. Token Staking

```javascript
// Stake tokens
await token.approve(votingContract.address, amount);
await tokenVoting.stakeTokens(tokenAddress, amount);

// Unstake tokens
await tokenVoting.unstakeTokens(tokenAddress, amount);

// Check staked amount
const stakedAmount = await tokenVoting.getStakedAmount(voterAddress, tokenAddress);
```

## 📊 API Reference

### Election Creation

```solidity
function createElection(
    string memory _title,
    string memory _description,
    uint256 _registrationStart,
    uint256 _registrationEnd,
    uint256 _votingStart,
    uint256 _votingEnd,
    VotingType _votingType,
    address _tokenAddress,
    uint256 _minTokenRequired
) external
```

### Voting

```solidity
function vote(
    uint256 _electionId,
    address _candidateAddress,
    uint256 _tokenAmount
) external
```

### Token Staking

```solidity
function stakeTokens(address _tokenAddress, uint256 _amount) external
function unstakeTokens(address _tokenAddress, uint256 _amount) external
function getStakedAmount(address _voter, address _tokenAddress) external view returns (uint256)
```

### Results & Queries

```solidity
function getElectionResults(uint256 _electionId) external view returns (
    address[] memory candidateAddresses,
    string[] memory names,
    uint256[] memory voteCounts,
    uint256[] memory tokenVoteCounts
)

function getTotalVotes(uint256 _electionId) external view returns (uint256, uint256)
```

## 🔒 Security Features

1. **ReentrancyGuard**: Prevents reentrancy attacks
2. **Time Validation**: Strict time range validation
3. **Token Validation**: Proper token balance and allowance checks
4. **State Management**: Prevents operations in wrong election phases
5. **Input Validation**: Comprehensive input parameter validation

## 🧪 Testing

The test suite covers:

- ✅ Contract deployment
- ✅ Token distribution
- ✅ Election creation (all types)
- ✅ Candidate registration
- ✅ Traditional voting
- ✅ Token-weighted voting
- ✅ Staked voting
- ✅ Token staking/unstaking
- ✅ Result queries
- ✅ Edge cases and error handling

Run tests:

```bash
npm run test:token-voting
```

## 🚀 Deployment

### Local Development

```bash
# Start local node
npm run node

# Deploy contracts (in another terminal)
npm run deploy:token-voting:local
```

### Testnet/Mainnet

1. Configure network in `hardhat.config.js`
2. Set environment variables
3. Run deployment:

```bash
npm run deploy:token-voting
```

## 📈 Use Cases

### 1. DAO Governance
- **Token-weighted voting** for protocol decisions
- **Staked voting** for major upgrades
- **Traditional voting** for community polls

### 2. Corporate Governance
- **Shareholder voting** with token-weighted system
- **Board elections** with staked voting
- **Employee voting** with traditional system

### 3. Community Management
- **Token holder voting** for project direction
- **Staked voting** for treasury management
- **Traditional voting** for community events

### 4. Gaming & NFTs
- **Token-weighted voting** for game mechanics
- **Staked voting** for rare item distribution
- **Traditional voting** for community contests

## 🔄 Integration Examples

### Frontend Integration

```javascript
// Connect to contracts
const tokenVoting = new ethers.Contract(votingAddress, abi, signer);
const token = new ethers.Contract(tokenAddress, tokenAbi, signer);

// Create election
const tx = await tokenVoting.createElection(
    title,
    description,
    registrationStart,
    registrationEnd,
    votingStart,
    votingEnd,
    votingType,
    tokenAddress,
    minTokens
);

// Vote
await token.approve(votingAddress, voteAmount);
await tokenVoting.vote(electionId, candidateAddress, voteAmount);
```

### Backend Integration

```javascript
// Monitor events
tokenVoting.on("VoteCast", (electionId, voter, candidate, tokenAmount, timestamp) => {
    console.log(`Vote cast: ${voter} voted for ${candidate} with ${tokenAmount} tokens`);
});

// Get results
const results = await tokenVoting.getElectionResults(electionId);
console.log("Election results:", results);
```

## 🎨 Advanced Features

### Custom Token Integration

```javascript
// Use any ERC-20 token
const customToken = new ethers.Contract(tokenAddress, ERC20_ABI, signer);

// Create election with custom token
await tokenVoting.createElection(
    "Custom Token Election",
    "Using custom ERC-20 token",
    registrationStart,
    registrationEnd,
    votingStart,
    votingEnd,
    1, // TokenWeighted
    customToken.address,
    ethers.utils.parseEther("1000")
);
```

### Multi-Election Management

```javascript
// Create multiple elections
const elections = [
    { title: "Election 1", type: 0 }, // Traditional
    { title: "Election 2", type: 1 }, // Token-weighted
    { title: "Election 3", type: 2 }  // Staked
];

for (const election of elections) {
    await tokenVoting.createElection(
        election.title,
        "Description",
        registrationStart,
        registrationEnd,
        votingStart,
        votingEnd,
        election.type,
        tokenAddress,
        minTokens
    );
}
```

## 📝 Events

The contract emits the following events:

- `ElectionCreated`: When a new election is created
- `CandidateRegistered`: When a candidate registers
- `VoteCast`: When a vote is cast
- `TokensStaked`: When tokens are staked
- `TokensUnstaked`: When tokens are unstaked

## 🔧 Configuration

### Environment Variables

```bash
# .env file
PRIVATE_KEY=your_private_key
INFURA_URL=your_infura_url
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### Network Configuration

```javascript
// hardhat.config.js
networks: {
    sepolia: {
        url: process.env.INFURA_URL,
        accounts: [process.env.PRIVATE_KEY]
    }
}
```

## 📚 Additional Resources

- [ERC-20 Standard](https://eips.ethereum.org/EIPS/eip-20)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Ethers.js Documentation](https://docs.ethers.io/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For questions and support:
- Create an issue on GitHub
- Check the documentation
- Review the test cases for examples

---

**Note**: This is an enhanced version of the original voting system. The original `VotingContract.sol` is still available for basic voting needs, while `TokenVotingContract.sol` provides advanced token-integrated voting capabilities.
