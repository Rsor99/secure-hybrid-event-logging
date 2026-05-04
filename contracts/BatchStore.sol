// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/// Batch-anchor mode: anchors the Merkle root of a batch of log content hashes.
/// Full log data lives off-chain. Mirrors batch-service WriteBatch / BatchRecord.
///
/// Hash function: SHA256 throughout (content hashes, Merkle tree, history chain).
///
/// Merkle tree specification:
///   - Binary tree; hash function: SHA256
///   - Leaf node:    SHA256(contentHash)          — contentHash is already SHA256
///   - Internal node: SHA256(leftChild || rightChild)  — raw byte concatenation
///   - If node count is odd: last node is duplicated (no sentinel)
///   - Ordering: insertion order of logs is preserved (no sorting)
///
/// The contract declares that merkleRoot is a Merkle root of log content hashes.
/// Per-log inclusion proof (leaf → root path) is verified off-chain by recomputing
/// the tree from PostgreSQL data.
///
/// Summary fields (counts, maxSeverity) are informational and not verified on-chain.
/// They must be validated off-chain against the actual log data.
contract BatchStore {

    // ── level encoding (same as LogStore / HashStore) ─────────────────────────
    uint8 public constant DEBUG    = 0;
    uint8 public constant INFO     = 1;
    uint8 public constant WARN     = 2;
    uint8 public constant ERROR    = 3;
    uint8 public constant CRITICAL = 4;

    // ── storage ───────────────────────────────────────────────────────────────
    struct BatchRecord {
        uint256 historyLen;
        bytes32 historyHash;    // running SHA256 chain: SHA256(prevHistoryHash || merkleRoot)
        string  startId;        // first log ID in this batch (insertion order, not necessarily contiguous with other batches)
        string  endId;          // last log ID in this batch (insertion order, not necessarily contiguous)
        uint32  count;          // total number of logs in batch
        // Summary fields — informational only; not verified on-chain; validate off-chain
        uint32  debugCount;
        uint32  infoCount;
        uint32  warnCount;
        uint32  errorCount;
        uint32  criticalCount;
        uint8   maxSeverity;    // 0–4, highest level present in batch
        uint256 timestamp;
        uint256 blockNumber;
        address submitter;
    }

    mapping(bytes32 => BatchRecord) public batches;
    bytes32[]                       public batchesOrdered; // insertion-order index; not scalable in production
    uint256                         public batchCount;

    mapping(address => bytes32) private _submitterHistoryHash;
    mapping(address => uint256) private _submitterHistoryLen;

    event BatchWritten(
        bytes32 indexed merkleRoot,
        address indexed submitter,
        uint32          count,
        uint8           maxSeverity
    );

    // ── write ─────────────────────────────────────────────────────────────────
    function write(
        bytes32         merkleRoot,
        string calldata startId,
        string calldata endId,
        uint32          count,
        uint32          debugCount,
        uint32          infoCount,
        uint32          warnCount,
        uint32          errorCount,
        uint32          criticalCount,
        uint8           maxSeverity
    ) external {
        require(batches[merkleRoot].timestamp == 0, "DuplicateRecord");

        bytes32 prevHistory = _submitterHistoryHash[msg.sender];
        // History chain uses SHA256 (same as content hash and Merkle tree) for consistency.
        bytes32 newHistory  = sha256(abi.encode(prevHistory, merkleRoot));
        uint256 newLen      = _submitterHistoryLen[msg.sender] + 1;

        _submitterHistoryHash[msg.sender] = newHistory;
        _submitterHistoryLen[msg.sender]  = newLen;

        batches[merkleRoot] = BatchRecord({
            historyLen:    newLen,
            historyHash:   newHistory,
            startId:       startId,
            endId:         endId,
            count:         count,
            debugCount:    debugCount,
            infoCount:     infoCount,
            warnCount:     warnCount,
            errorCount:    errorCount,
            criticalCount: criticalCount,
            maxSeverity:   maxSeverity,
            timestamp:     block.timestamp,
            blockNumber:   block.number,
            submitter:     msg.sender
        });

        batchesOrdered.push(merkleRoot);
        batchCount++;

        emit BatchWritten(merkleRoot, msg.sender, count, maxSeverity);
    }

    // ── query ─────────────────────────────────────────────────────────────────
    /// Existence check only. Does not guarantee data integrity.
    /// Per-log Merkle inclusion proof (leaf → root path) is verified off-chain
    /// by recomputing the SHA256 binary Merkle tree from PostgreSQL log data.
    function exists(bytes32 merkleRoot) external view returns (bool) {
        return batches[merkleRoot].timestamp != 0;
    }

    function getRecord(bytes32 merkleRoot) external view returns (BatchRecord memory) {
        require(batches[merkleRoot].timestamp != 0, "NotFound");
        return batches[merkleRoot];
    }

    function getPage(uint256 offset, uint256 limit)
        external
        view
        returns (bytes32[] memory page)
    {
        uint256 total = batchesOrdered.length;
        if (offset >= total) return new bytes32[](0);
        uint256 end = offset + limit > total ? total : offset + limit;
        page = new bytes32[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            page[i - offset] = batchesOrdered[i];
        }
    }
}
