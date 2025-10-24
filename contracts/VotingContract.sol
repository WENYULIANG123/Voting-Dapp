// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title VotingContract
 * @dev 基于以太坊的投票智能合约
 * @notice 支持创建选举、候选人注册、投票和结果查询
 */
contract VotingContract is Ownable, ReentrancyGuard {
    
    // 选举状态枚举
    enum ElectionStatus {
        NotStarted,     // 未开始
        Registration,   // 注册期
        Voting,         // 投票期
        Ended          // 已结束
    }
    
    // 选举结构体
    struct Election {
        uint256 id;                    // 选举ID
        string title;                  // 选举标题
        string description;            // 选举描述
        address creator;               // 创建者
        uint256 registrationStart;     // 注册开始时间
        uint256 registrationEnd;       // 注册结束时间
        uint256 votingStart;           // 投票开始时间
        uint256 votingEnd;             // 投票结束时间
        ElectionStatus status;         // 当前状态
        bool exists;                   // 是否存在
    }
    
    // 候选人结构体
    struct Candidate {
        address candidateAddress;      // 候选人地址
        string name;                   // 候选人姓名
        string description;            // 候选人描述
        uint256 voteCount;             // 得票数
        bool registered;               // 是否已注册
    }
    
    // 投票记录结构体
    struct Vote {
        address voter;                 // 投票者地址
        address candidate;             // 被投票的候选人
        uint256 timestamp;             // 投票时间
        bool exists;                   // 是否存在
    }
    
    // 状态变量
    uint256 public nextElectionId = 1;
    mapping(uint256 => Election) public elections;
    mapping(uint256 => mapping(address => Candidate)) public candidates;
    mapping(uint256 => address[]) public candidateList;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => Vote[]) public votes;
    mapping(uint256 => uint256) public totalVotes;
    
    // 事件定义
    event ElectionCreated(
        uint256 indexed electionId,
        string title,
        address indexed creator,
        uint256 registrationStart,
        uint256 registrationEnd,
        uint256 votingStart,
        uint256 votingEnd
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
        uint256 timestamp
    );
    
    event ElectionStatusChanged(
        uint256 indexed electionId,
        ElectionStatus oldStatus,
        ElectionStatus newStatus
    );
    
    // Constructor
    constructor() Ownable(msg.sender) {}
    
    // 修饰符
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
    
    /**
     * @dev 创建新的选举
     * @param _title 选举标题
     * @param _description 选举描述
     * @param _registrationStart 注册开始时间
     * @param _registrationEnd 注册结束时间
     * @param _votingStart 投票开始时间
     * @param _votingEnd 投票结束时间
     */
    function createElection(
        string memory _title,
        string memory _description,
        uint256 _registrationStart,
        uint256 _registrationEnd,
        uint256 _votingStart,
        uint256 _votingEnd
    ) external validTimeRange(_registrationStart, _registrationEnd, _votingStart, _votingEnd) {
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
            exists: true
        });
        
        emit ElectionCreated(
            electionId,
            _title,
            msg.sender,
            _registrationStart,
            _registrationEnd,
            _votingStart,
            _votingEnd
        );
    }
    
    /**
     * @dev 注册成为候选人
     * @param _electionId 选举ID
     * @param _name 候选人姓名
     * @param _description 候选人描述
     */
    function registerCandidate(
        uint256 _electionId,
        string memory _name,
        string memory _description
    ) external electionExists(_electionId) {
        Election storage election = elections[_electionId];
        
        // 检查是否在注册期内
        require(
            block.timestamp >= election.registrationStart && 
            block.timestamp <= election.registrationEnd,
            "Not in registration period"
        );
        
        // 检查是否已经注册
        require(
            !candidates[_electionId][msg.sender].registered,
            "Already registered as candidate"
        );
        
        // 注册候选人
        candidates[_electionId][msg.sender] = Candidate({
            candidateAddress: msg.sender,
            name: _name,
            description: _description,
            voteCount: 0,
            registered: true
        });
        
        candidateList[_electionId].push(msg.sender);
        
        emit CandidateRegistered(_electionId, msg.sender, _name, _description);
    }
    
    /**
     * @dev 投票
     * @param _electionId 选举ID
     * @param _candidateAddress 候选人地址
     */
    function vote(
        uint256 _electionId,
        address _candidateAddress
    ) external electionExists(_electionId) nonReentrant {
        Election storage election = elections[_electionId];
        
        // 检查是否在投票期内
        require(
            block.timestamp >= election.votingStart && 
            block.timestamp <= election.votingEnd,
            "Not in voting period"
        );
        
        // 检查候选人是否存在
        require(
            candidates[_electionId][_candidateAddress].registered,
            "Candidate does not exist"
        );
        
        // 检查是否已经投票
        require(
            !hasVoted[_electionId][msg.sender],
            "Already voted"
        );
        
        // 记录投票
        hasVoted[_electionId][msg.sender] = true;
        candidates[_electionId][_candidateAddress].voteCount++;
        totalVotes[_electionId]++;
        
        votes[_electionId].push(Vote({
            voter: msg.sender,
            candidate: _candidateAddress,
            timestamp: block.timestamp,
            exists: true
        }));
        
        emit VoteCast(_electionId, msg.sender, _candidateAddress, block.timestamp);
    }
    
    /**
     * @dev 获取选举信息
     * @param _electionId 选举ID
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
            ElectionStatus status
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
            election.status
        );
    }
    
    /**
     * @dev 获取候选人信息
     * @param _electionId 选举ID
     * @param _candidateAddress 候选人地址
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
            bool registered
        )
    {
        Candidate memory candidate = candidates[_electionId][_candidateAddress];
        return (
            candidate.candidateAddress,
            candidate.name,
            candidate.description,
            candidate.voteCount,
            candidate.registered
        );
    }
    
    /**
     * @dev 获取选举的所有候选人列表
     * @param _electionId 选举ID
     */
    function getCandidateList(uint256 _electionId)
        external
        view
        electionExists(_electionId)
        returns (address[] memory)
    {
        return candidateList[_electionId];
    }
    
    /**
     * @dev 获取选举结果（按得票数排序）
     * @param _electionId 选举ID
     */
    function getElectionResults(uint256 _electionId)
        external
        view
        electionExists(_electionId)
        returns (
            address[] memory candidateAddresses,
            string[] memory names,
            uint256[] memory voteCounts
        )
    {
        address[] memory candidateAddresses = candidateList[_electionId];
        uint256 candidateCount = candidateAddresses.length;
        
        address[] memory sortedAddresses = new address[](candidateCount);
        string[] memory sortedNames = new string[](candidateCount);
        uint256[] memory sortedVoteCounts = new uint256[](candidateCount);
        
        // 复制数据
        for (uint256 i = 0; i < candidateCount; i++) {
            sortedAddresses[i] = candidateAddresses[i];
            sortedNames[i] = candidates[_electionId][candidateAddresses[i]].name;
            sortedVoteCounts[i] = candidates[_electionId][candidateAddresses[i]].voteCount;
        }
        
        // 简单冒泡排序（按得票数降序）
        for (uint256 i = 0; i < candidateCount - 1; i++) {
            for (uint256 j = 0; j < candidateCount - i - 1; j++) {
                if (sortedVoteCounts[j] < sortedVoteCounts[j + 1]) {
                    // 交换地址
                    address tempAddr = sortedAddresses[j];
                    sortedAddresses[j] = sortedAddresses[j + 1];
                    sortedAddresses[j + 1] = tempAddr;
                    
                    // 交换姓名
                    string memory tempName = sortedNames[j];
                    sortedNames[j] = sortedNames[j + 1];
                    sortedNames[j + 1] = tempName;
                    
                    // 交换票数
                    uint256 tempVotes = sortedVoteCounts[j];
                    sortedVoteCounts[j] = sortedVoteCounts[j + 1];
                    sortedVoteCounts[j + 1] = tempVotes;
                }
            }
        }
        
        return (sortedAddresses, sortedNames, sortedVoteCounts);
    }
    
    /**
     * @dev 检查用户是否已投票
     * @param _electionId 选举ID
     * @param _voter 投票者地址
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
     * @dev 获取选举当前状态
     * @param _electionId 选举ID
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
     * @dev 获取选举剩余时间
     * @param _electionId 选举ID
     */
    function getTimeRemaining(uint256 _electionId)
        external
        view
        electionExists(_electionId)
        returns (
            uint256 registrationTimeRemaining,
            uint256 votingTimeRemaining,
            string memory currentPhase
        )
    {
        Election memory election = elections[_electionId];
        uint256 currentTime = block.timestamp;
        
        if (currentTime < election.registrationStart) {
            return (
                election.registrationStart - currentTime,
                0,
                "NotStarted"
            );
        } else if (currentTime >= election.registrationStart && currentTime <= election.registrationEnd) {
            return (
                election.registrationEnd - currentTime,
                election.votingEnd - currentTime,
                "Registration"
            );
        } else if (currentTime >= election.votingStart && currentTime <= election.votingEnd) {
            return (
                0,
                election.votingEnd - currentTime,
                "Voting"
            );
        } else {
            return (0, 0, "Ended");
        }
    }
    
    /**
     * @dev 获取总选举数量
     */
    function getTotalElections() external view returns (uint256) {
        return nextElectionId - 1;
    }
    
    /**
     * @dev 获取选举的投票总数
     * @param _electionId 选举ID
     */
    function getTotalVotes(uint256 _electionId)
        external
        view
        electionExists(_electionId)
        returns (uint256)
    {
        return totalVotes[_electionId];
    }
}
