// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./SimpleToken.sol";

/**
 * @title TokenVotingContract
 * @dev Enhanced voting system with ERC-20 token integration
 * @notice Supports token-weighted voting, staking, and governance features
 */
contract TokenVotingContract is Ownable, ReentrancyGuard {
    
    // Election status enum
    enum ElectionStatus {
        NotStarted,     // Not started
        Registration,   // Registration period
        Voting,         // Voting period
        Ended          // Ended
    }
    
    // Voting type enum
    enum VotingType {
        OneVotePerAddress,  // Traditional voting (1 vote per address)
        TokenWeighted,      // Token-weighted voting
        StakedVoting        // Staked token voting
    }
    
    // Election structure
    struct Election {
        uint256 id;                    // Election ID
        string title;                  // Election title
        string description;            // Election description
        address creator;               // Creator address
        uint256 registrationStart;     // Registration start time
        uint256 registrationEnd;       // Registration end time
        uint256 votingStart;           // Voting start time
        uint256 votingEnd;             // Voting end time
        ElectionStatus status;         // Current status
        VotingType votingType;         // Voting type
        address tokenAddress;          // ERC-20 token address (if applicable)
        uint256 minTokenRequired;      // Minimum tokens required to vote
        bool exists;                   // Whether exists
    }
    
    // Candidate structure
    struct Candidate {
        address candidateAddress;      // Candidate address
        string name;                   // Candidate name
        string description;            // Candidate description
        uint256 voteCount;             // Vote count
        uint256 tokenVoteCount;        // Token-weighted vote count
        bool registered;               // Whether registered
    }
    
    // Vote record structure
    struct Vote {
        address voter;                 // Voter address
        address candidate;             // Voted candidate
        uint256 timestamp;             // Vote timestamp
        uint256 tokenAmount;           // Token amount used for voting
        bool exists;                   // Whether exists
    }
    
    // Staking structure
    struct Stake {
        uint256 amount;                // Staked amount
        uint256 timestamp;             // Stake timestamp
        bool active;                   // Whether stake is active
    }
    
    // State variables
    uint256 public nextElectionId = 1;
    mapping(uint256 => Election) public elections;
    mapping(uint256 => mapping(address => Candidate)) public candidates;
    mapping(uint256 => address[]) public candidateList;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => Vote[]) public votes;
    mapping(uint256 => uint256) public totalVotes;
    mapping(uint256 => uint256) public totalTokenVotes;
    
    // Token staking
    mapping(address => mapping(address => Stake)) public stakes; // voter => token => stake
    mapping(address => uint256) public totalStaked; // token => total staked
    
    // Events
    event ElectionCreated(
        uint256 indexed electionId,
        string title,
        address indexed creator,
        VotingType votingType,
        address tokenAddress,
        uint256 minTokenRequired
    );
    
    event CandidateRegistered(
        uint256 indexed electionId,
        address indexed candidate,
        string name,
        string description
    );
    
    event VoteCast(
        uint256 indexed electionId,
        address indexed voter,
        address indexed candidate,
        uint256 tokenAmount,
        uint256 timestamp
    );
    
    event TokensStaked(
        address indexed voter,
        address indexed token,
        uint256 amount,
        uint256 timestamp
    );
    
    event TokensUnstaked(
        address indexed voter,
        address indexed token,
        uint256 amount,
        uint256 timestamp
    );
    
    // Constructor
    constructor() Ownable(msg.sender) {}
    
    // Modifiers
    modifier electionExists(uint256 _electionId) {
        require(elections[_electionId].exists, "Election does not exist");
        _;
    }
    
    modifier validTimeRange(
        uint256 _registrationStart,
        uint256 _registrationEnd,
        uint256 _votingStart,
        uint256 _votingEnd
    ) {
        require(_registrationStart < _registrationEnd, "Invalid registration period");
        require(_registrationEnd < _votingStart, "Registration and voting periods conflict");
        require(_votingStart < _votingEnd, "Invalid voting period");
        require(_registrationStart > block.timestamp, "Registration start must be in the future");
        _;
    }
    
    modifier validToken(address _tokenAddress) {
        require(_tokenAddress != address(0), "Invalid token address");
        _;
    }
    
    /**
     * @dev Create a new election
     * @param _title Election title
     * @param _description Election description
     * @param _registrationStart Registration start time
     * @param _registrationEnd Registration end time
     * @param _votingStart Voting start time
     * @param _votingEnd Voting end time
     * @param _votingType Voting type
     * @param _tokenAddress ERC-20 token address (address(0) for traditional voting)
     * @param _minTokenRequired Minimum tokens required to vote
     */
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
    ) external validTimeRange(_registrationStart, _registrationEnd, _votingStart, _votingEnd) {
        
        // Validate token address for token-based voting
        if (_votingType != VotingType.OneVotePerAddress) {
            require(_tokenAddress != address(0), "Token address required for token-based voting");
        }
        
        uint256 electionId = nextElectionId++;
        
        elections[electionId] = Election({
            id: electionId,
            title: _title,
            description: _description,
            creator: msg.sender,
            registrationStart: _registrationStart,
            registrationEnd: _registrationEnd,
            votingStart: _votingStart,
            votingEnd: _votingEnd,
            status: ElectionStatus.NotStarted,
            votingType: _votingType,
            tokenAddress: _tokenAddress,
            minTokenRequired: _minTokenRequired,
            exists: true
        });
        
        emit ElectionCreated(
            electionId,
            _title,
            msg.sender,
            _votingType,
            _tokenAddress,
            _minTokenRequired
        );
    }
    
    /**
     * @dev Register as a candidate
     * @param _electionId Election ID
     * @param _name Candidate name
     * @param _description Candidate description
     */
    function registerCandidate(
        uint256 _electionId,
        string memory _name,
        string memory _description
    ) external electionExists(_electionId) {
        Election storage election = elections[_electionId];
        
        // Check if in registration period
        require(
            block.timestamp >= election.registrationStart && 
            block.timestamp <= election.registrationEnd,
            "Not in registration period"
        );
        
        // Check if already registered
        require(
            !candidates[_electionId][msg.sender].registered,
            "Already registered as candidate"
        );
        
        // Register candidate
        candidates[_electionId][msg.sender] = Candidate({
            candidateAddress: msg.sender,
            name: _name,
            description: _description,
            voteCount: 0,
            tokenVoteCount: 0,
            registered: true
        });
        
        candidateList[_electionId].push(msg.sender);
        
        emit CandidateRegistered(_electionId, msg.sender, _name, _description);
    }
    
    /**
     * @dev Vote for a candidate
     * @param _electionId Election ID
     * @param _candidateAddress Candidate address
     * @param _tokenAmount Token amount to use for voting (0 for traditional voting)
     */
    function vote(
        uint256 _electionId,
        address _candidateAddress,
        uint256 _tokenAmount
    ) external electionExists(_electionId) nonReentrant {
        Election storage election = elections[_electionId];
        
        // Check if in voting period
        require(
            block.timestamp >= election.votingStart && 
            block.timestamp <= election.votingEnd,
            "Not in voting period"
        );
        
        // Check if candidate exists
        require(
            candidates[_electionId][_candidateAddress].registered,
            "Candidate does not exist"
        );
        
        // Check if already voted
        require(
            !hasVoted[_electionId][msg.sender],
            "Already voted"
        );
        
        // Handle different voting types
        if (election.votingType == VotingType.OneVotePerAddress) {
            // Traditional voting - one vote per address
            require(_tokenAmount == 0, "Token amount should be 0 for traditional voting");
            
        } else if (election.votingType == VotingType.TokenWeighted) {
            // Token-weighted voting
            require(_tokenAmount > 0, "Token amount required for token-weighted voting");
            require(_tokenAmount >= election.minTokenRequired, "Insufficient token amount");
            
            // Check token balance
            SimpleToken token = SimpleToken(election.tokenAddress);
            require(token.balanceOf(msg.sender) >= _tokenAmount, "Insufficient token balance");
            
        } else if (election.votingType == VotingType.StakedVoting) {
            // Staked voting
            require(_tokenAmount > 0, "Token amount required for staked voting");
            require(_tokenAmount >= election.minTokenRequired, "Insufficient token amount");
            
            // Check staked balance
            require(stakes[msg.sender][election.tokenAddress].amount >= _tokenAmount, "Insufficient staked tokens");
            
            // Reduce staked amount
            stakes[msg.sender][election.tokenAddress].amount -= _tokenAmount;
        }
        
        // Record vote
        hasVoted[_electionId][msg.sender] = true;
        candidates[_electionId][_candidateAddress].voteCount++;
        
        if (_tokenAmount > 0) {
            candidates[_electionId][_candidateAddress].tokenVoteCount += _tokenAmount;
            totalTokenVotes[_electionId] += _tokenAmount;
        }
        
        totalVotes[_electionId]++;
        
        votes[_electionId].push(Vote({
            voter: msg.sender,
            candidate: _candidateAddress,
            timestamp: block.timestamp,
            tokenAmount: _tokenAmount,
            exists: true
        }));
        
        emit VoteCast(_electionId, msg.sender, _candidateAddress, _tokenAmount, block.timestamp);
    }
    
    /**
     * @dev Stake tokens for voting
     * @param _tokenAddress Token address
     * @param _amount Amount to stake
     */
    function stakeTokens(address _tokenAddress, uint256 _amount) 
        external 
        validToken(_tokenAddress) 
        nonReentrant 
    {
        require(_amount > 0, "Amount must be greater than 0");
        
        SimpleToken token = SimpleToken(_tokenAddress);
        require(token.balanceOf(msg.sender) >= _amount, "Insufficient token balance");
        
        // Transfer tokens to contract
        require(token.transferFrom(msg.sender, address(this), _amount), "Token transfer failed");
        
        // Update stake
        stakes[msg.sender][_tokenAddress].amount += _amount;
        stakes[msg.sender][_tokenAddress].timestamp = block.timestamp;
        stakes[msg.sender][_tokenAddress].active = true;
        
        totalStaked[_tokenAddress] += _amount;
        
        emit TokensStaked(msg.sender, _tokenAddress, _amount, block.timestamp);
    }
    
    /**
     * @dev Unstake tokens
     * @param _tokenAddress Token address
     * @param _amount Amount to unstake
     */
    function unstakeTokens(address _tokenAddress, uint256 _amount) 
        external 
        validToken(_tokenAddress) 
        nonReentrant 
    {
        require(_amount > 0, "Amount must be greater than 0");
        require(stakes[msg.sender][_tokenAddress].amount >= _amount, "Insufficient staked amount");
        
        // Update stake
        stakes[msg.sender][_tokenAddress].amount -= _amount;
        totalStaked[_tokenAddress] -= _amount;
        
        // Transfer tokens back to user
        SimpleToken token = SimpleToken(_tokenAddress);
        require(token.transfer(msg.sender, _amount), "Token transfer failed");
        
        emit TokensUnstaked(msg.sender, _tokenAddress, _amount, block.timestamp);
    }
    
    /**
     * @dev Get election information
     * @param _electionId Election ID
     */
    function getElection(uint256 _electionId) 
        external 
        view 
        electionExists(_electionId) 
        returns (
            uint256 id,
            string memory title,
            string memory description,
            address creator,
            uint256 registrationStart,
            uint256 registrationEnd,
            uint256 votingStart,
            uint256 votingEnd,
            ElectionStatus status,
            VotingType votingType,
            address tokenAddress,
            uint256 minTokenRequired
        ) 
    {
        Election memory election = elections[_electionId];
        return (
            election.id,
            election.title,
            election.description,
            election.creator,
            election.registrationStart,
            election.registrationEnd,
            election.votingStart,
            election.votingEnd,
            election.status,
            election.votingType,
            election.tokenAddress,
            election.minTokenRequired
        );
    }
    
    /**
     * @dev Get candidate information
     * @param _electionId Election ID
     * @param _candidateAddress Candidate address
     */
    function getCandidate(uint256 _electionId, address _candidateAddress)
        external
        view
        electionExists(_electionId)
        returns (
            address candidateAddress,
            string memory name,
            string memory description,
            uint256 voteCount,
            uint256 tokenVoteCount,
            bool registered
        )
    {
        Candidate memory candidate = candidates[_electionId][_candidateAddress];
        return (
            candidate.candidateAddress,
            candidate.name,
            candidate.description,
            candidate.voteCount,
            candidate.tokenVoteCount,
            candidate.registered
        );
    }
    
    /**
     * @dev Get election results (sorted by vote count)
     * @param _electionId Election ID
     */
    function getElectionResults(uint256 _electionId)
        external
        view
        electionExists(_electionId)
        returns (
            address[] memory candidateAddresses,
            string[] memory names,
            uint256[] memory voteCounts,
            uint256[] memory tokenVoteCounts
        )
    {
        address[] memory candidateAddresses = candidateList[_electionId];
        uint256 candidateCount = candidateAddresses.length;
        
        address[] memory sortedAddresses = new address[](candidateCount);
        string[] memory sortedNames = new string[](candidateCount);
        uint256[] memory sortedVoteCounts = new uint256[](candidateCount);
        uint256[] memory sortedTokenVoteCounts = new uint256[](candidateCount);
        
        // Copy data
        for (uint256 i = 0; i < candidateCount; i++) {
            sortedAddresses[i] = candidateAddresses[i];
            sortedNames[i] = candidates[_electionId][candidateAddresses[i]].name;
            sortedVoteCounts[i] = candidates[_electionId][candidateAddresses[i]].voteCount;
            sortedTokenVoteCounts[i] = candidates[_electionId][candidateAddresses[i]].tokenVoteCount;
        }
        
        // Simple bubble sort (by vote count descending)
        for (uint256 i = 0; i < candidateCount - 1; i++) {
            for (uint256 j = 0; j < candidateCount - i - 1; j++) {
                if (sortedVoteCounts[j] < sortedVoteCounts[j + 1]) {
                    // Swap addresses
                    address tempAddr = sortedAddresses[j];
                    sortedAddresses[j] = sortedAddresses[j + 1];
                    sortedAddresses[j + 1] = tempAddr;
                    
                    // Swap names
                    string memory tempName = sortedNames[j];
                    sortedNames[j] = sortedNames[j + 1];
                    sortedNames[j + 1] = tempName;
                    
                    // Swap vote counts
                    uint256 tempVotes = sortedVoteCounts[j];
                    sortedVoteCounts[j] = sortedVoteCounts[j + 1];
                    sortedVoteCounts[j + 1] = tempVotes;
                    
                    // Swap token vote counts
                    uint256 tempTokenVotes = sortedTokenVoteCounts[j];
                    sortedTokenVoteCounts[j] = sortedTokenVoteCounts[j + 1];
                    sortedTokenVoteCounts[j + 1] = tempTokenVotes;
                }
            }
        }
        
        return (sortedAddresses, sortedNames, sortedVoteCounts, sortedTokenVoteCounts);
    }
    
    /**
     * @dev Check if user has voted
     * @param _electionId Election ID
     * @param _voter Voter address
     */
    function hasUserVoted(uint256 _electionId, address _voter)
        external
        view
        electionExists(_electionId)
        returns (bool)
    {
        return hasVoted[_electionId][_voter];
    }
    
    /**
     * @dev Get election current status
     * @param _electionId Election ID
     */
    function getElectionStatus(uint256 _electionId)
        external
        view
        electionExists(_electionId)
        returns (ElectionStatus)
    {
        Election memory election = elections[_electionId];
        uint256 currentTime = block.timestamp;
        
        if (currentTime < election.registrationStart) {
            return ElectionStatus.NotStarted;
        } else if (currentTime >= election.registrationStart && currentTime <= election.registrationEnd) {
            return ElectionStatus.Registration;
        } else if (currentTime >= election.votingStart && currentTime <= election.votingEnd) {
            return ElectionStatus.Voting;
        } else {
            return ElectionStatus.Ended;
        }
    }
    
    /**
     * @dev Get staked amount for a user and token
     * @param _voter Voter address
     * @param _tokenAddress Token address
     */
    function getStakedAmount(address _voter, address _tokenAddress)
        external
        view
        returns (uint256)
    {
        return stakes[_voter][_tokenAddress].amount;
    }
    
    /**
     * @dev Get total elections count
     */
    function getTotalElections() external view returns (uint256) {
        return nextElectionId - 1;
    }
    
    /**
     * @dev Get total votes for an election
     * @param _electionId Election ID
     */
    function getTotalVotes(uint256 _electionId)
        external
        view
        electionExists(_electionId)
        returns (uint256, uint256)
    {
        return (totalVotes[_electionId], totalTokenVotes[_electionId]);
    }
}
