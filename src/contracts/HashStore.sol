// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/// Hybrid mode: only the content hash is anchored on-chain.
/// Full log data lives off-chain (PostgreSQL).
/// Mirrors hash-service WriteHash / HashRecord.
contract HashStore {
    uint8 public constant DEBUG    = 0;
    uint8 public constant INFO     = 1;
    uint8 public constant WARN     = 2;
    uint8 public constant ERROR    = 3;
    uint8 public constant CRITICAL = 4;

    struct HashRecord {
        uint8   level;
        string  messagePreview;
        uint256 historyLen;
        bytes32 historyHash;
        uint256 timestamp;
        uint256 blockNumber;
        address submitter;
    }

    mapping(bytes32 => HashRecord) public hashes;
    bytes32[]                      public hashesOrdered;
    uint256                        public recordCount;

    mapping(address => bytes32) private _submitterHistoryHash;
    mapping(address => uint256) private _submitterHistoryLen;

    event HashWritten(
        bytes32 indexed contentHash,
        address indexed submitter,
        uint8           level
    );

    function write(
        bytes32         contentHash,
        uint8           level,
        string calldata messagePreview
    ) external {
        require(hashes[contentHash].timestamp == 0, "DuplicateRecord");

        bytes32 prevHistory = _submitterHistoryHash[msg.sender];
        // History chain uses SHA256 (same as content hash) for consistency.
        bytes32 newHistory  = sha256(abi.encode(prevHistory, contentHash));
        uint256 newLen      = _submitterHistoryLen[msg.sender] + 1;

        _submitterHistoryHash[msg.sender] = newHistory;
        _submitterHistoryLen[msg.sender]  = newLen;

        hashes[contentHash] = HashRecord({
            level:          level,
            messagePreview: _truncate(messagePreview, 256),
            historyLen:     newLen,
            historyHash:    newHistory,
            timestamp:      block.timestamp,
            blockNumber:    block.number,
            submitter:      msg.sender
        });

        hashesOrdered.push(contentHash);
        recordCount++;

        emit HashWritten(contentHash, msg.sender, level);
    }

    function exists(bytes32 contentHash) external view returns (bool) {
        return hashes[contentHash].timestamp != 0;
    }

    function getRecord(bytes32 contentHash) external view returns (HashRecord memory) {
        require(hashes[contentHash].timestamp != 0, "NotFound");
        return hashes[contentHash];
    }

    function getPage(uint256 offset, uint256 limit)
        external
        view
        returns (bytes32[] memory page)
    {
        uint256 total = hashesOrdered.length;
        if (offset >= total) return new bytes32[](0);
        uint256 end = offset + limit > total ? total : offset + limit;
        page = new bytes32[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            page[i - offset] = hashesOrdered[i];
        }
    }

    function _truncate(string memory s, uint256 maxBytes)
        internal
        pure
        returns (string memory)
    {
        bytes memory b = bytes(s);
        if (b.length <= maxBytes) return s;
        bytes memory out = new bytes(maxBytes);
        for (uint256 i = 0; i < maxBytes; i++) out[i] = b[i];
        return string(out);
    }
}
