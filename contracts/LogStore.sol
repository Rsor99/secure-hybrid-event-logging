// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/// Blockchain-only mode: full log data stored on-chain.
/// Mirrors log-service WriteLog / LogRecord.
///
/// Hash function: SHA256 is used consistently throughout the entire system
/// (log content hash, Merkle tree, history chain) for standardization and
/// cross-platform compatibility.
///
/// Canonical JSON (used to compute contentHash off-chain):
///   SHA256( UTF-8( JSON.stringify({id, timestamp, level, source, message, metadata}) ) )
///   - Fixed field order: id → timestamp → level → source → message → metadata
///   - No extra whitespace; keys are in the order listed above (not sorted)
///   - Stable serialization — same input always produces the same bytes
///
/// Data integrity verification is performed off-chain: recompute
/// SHA256(canonical JSON) and compare to the stored contentHash.
contract LogStore {

    // ── level encoding ────────────────────────────────────────────────────────
    uint8 public constant DEBUG    = 0;
    uint8 public constant INFO     = 1;
    uint8 public constant WARN     = 2;
    uint8 public constant ERROR    = 3;
    uint8 public constant CRITICAL = 4;

    // ── storage ───────────────────────────────────────────────────────────────
    struct LogRecord {
        uint8   level;          // 0–4, see constants above
        bytes32 source;         // UTF-8 source name, right-padded with 0x00 (max 31 bytes)
        string  messagePreview; // first 256 bytes (not characters), may truncate mid-UTF-8 sequence
        uint256 historyLen;
        bytes32 historyHash;    // running SHA256 chain: SHA256(prevHistoryHash || contentHash)
        string  message;        // full message stored on-chain
        string  metadataJson;   // JSON metadata stored on-chain
        uint256 timestamp;
        uint256 blockNumber;
        address submitter;
    }

    mapping(bytes32 => LogRecord) public logs;
    bytes32[]                     public logsOrdered; // insertion-order index; not scalable in production (event indexing preferred)
    uint256                       public logCount;

    mapping(address => bytes32) private _submitterHistoryHash;
    mapping(address => uint256) private _submitterHistoryLen;

    event LogWritten(
        bytes32 indexed contentHash,
        address indexed submitter,
        uint8           level,
        bytes32         source
    );

    // ── write ─────────────────────────────────────────────────────────────────
    function write(
        bytes32         contentHash,
        uint8           level,
        bytes32         source,
        string calldata messagePreview,
        string calldata message,
        string calldata metadataJson
    ) external {
        require(logs[contentHash].timestamp == 0, "DuplicateRecord");

        bytes32 prevHistory = _submitterHistoryHash[msg.sender];
        // History chain uses SHA256 (same as content hash) for consistency.
        bytes32 newHistory  = sha256(abi.encode(prevHistory, contentHash));
        uint256 newLen      = _submitterHistoryLen[msg.sender] + 1;

        _submitterHistoryHash[msg.sender] = newHistory;
        _submitterHistoryLen[msg.sender]  = newLen;

        logs[contentHash] = LogRecord({
            level:          level,
            source:         source,
            messagePreview: _truncate(messagePreview, 256),
            historyLen:     newLen,
            historyHash:    newHistory,
            message:        message,
            metadataJson:   metadataJson,
            timestamp:      block.timestamp,
            blockNumber:    block.number,
            submitter:      msg.sender
        });

        logsOrdered.push(contentHash);
        logCount++;

        emit LogWritten(contentHash, msg.sender, level, source);
    }

    // ── query ─────────────────────────────────────────────────────────────────
    /// Existence check only. Does not guarantee data integrity.
    /// Full verification requires recomputing SHA256(canonical JSON) off-chain.
    function exists(bytes32 contentHash) external view returns (bool) {
        return logs[contentHash].timestamp != 0;
    }

    function getRecord(bytes32 contentHash) external view returns (LogRecord memory) {
        require(logs[contentHash].timestamp != 0, "NotFound");
        return logs[contentHash];
    }

    function getPage(uint256 offset, uint256 limit)
        external
        view
        returns (bytes32[] memory page)
    {
        uint256 total = logsOrdered.length;
        if (offset >= total) return new bytes32[](0);
        uint256 end = offset + limit > total ? total : offset + limit;
        page = new bytes32[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            page[i - offset] = logsOrdered[i];
        }
    }

    // ── internal ──────────────────────────────────────────────────────────────
    // Truncates to maxBytes bytes (not characters). May cut mid-UTF-8 sequence.
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
