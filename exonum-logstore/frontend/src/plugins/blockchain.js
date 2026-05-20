import * as Exonum from 'exonum-client'
import axios from 'axios'
import * as proto from '../../proto/stubs.js'

const TX_URL   = '/api/explorer/v1/transactions'
const PER_PAGE = 10

const LogRecord   = Exonum.newType(proto.exonum.examples.logstore.log_service.LogRecord)
const HashRecord  = Exonum.newType(proto.exonum.examples.logstore.hash_service.HashRecord)
const BatchRecord = Exonum.newType(proto.exonum.examples.logstore.batch_service.BatchRecord)

// Exonum API serialises `exonum.crypto.Hash` fields (history_hash) as 64-char
// hex strings, but protobufjs expects { data: Uint8Array }.  Fix before MapProof.
function fixHashFields (record) {
  if (!record) return record
  const r = Object.assign({}, record)
  if (typeof r.history_hash === 'string') {
    r.history_hash = { data: Uint8Array.from(Buffer.from(r.history_hash, 'hex')) }
  }
  return r
}

function fixProofEntries (toMap) {
  return Object.assign({}, toMap, {
    entries: (toMap.entries || []).map(e =>
      e.value !== undefined ? Object.assign({}, e, { value: fixHashFields(e.value) }) : e
    )
  })
}

async function lookupCommitBlock (txHash) {
  if (!txHash) return null
  try {
    const res = await axios.get(`${TX_URL}?hash=${txHash}`)
    return res.data?.location?.block_height ?? null
  } catch { return null }
}

async function getValidators () {
  const res = await axios.get('/api/services/supervisor/consensus-config')
  return res.data.validator_keys.map(v => v.consensus_key)
}

export default {
  install (Vue) {
    Vue.prototype.$blockchain = {

      // ── verify a full log (log-service) ─────────────────────────────────

      async verifyLog (contentHash) {
        let validators
        try {
          validators = await getValidators()
        } catch {
          throw new Error('Cannot fetch validator keys — is the Exonum node running?')
        }

        const res = await axios.get(`/api/services/log-service/v1/logs/info?hash=${contentHash}`)
        const { block_proof, proof, record } = res.data

        if (!record) {
          return { verified: false, block: null, record: null, merkleRoot: null }
        }

        Exonum.verifyBlock(block_proof, validators)

        const tableRootHash = Exonum.verifyTable(
          proof.to_table,
          block_proof.block.state_hash,
          'log-service.logs'
        )

        const mapProof = new Exonum.MapProof(
          fixProofEntries(proof.to_record),
          Exonum.MapProof.rawKey(Exonum.Hash),
          LogRecord
        )
        if (mapProof.merkleRoot !== tableRootHash) {
          throw new Error('Merkle root mismatch — data may be tampered')
        }

        const commitBlockHeight = await lookupCommitBlock(record.tx_hash)

        return {
          block:             block_proof.block,
          commitBlockHeight,
          record,
          recordType:        'log',
          verified:          true,
          merkleRoot:        mapProof.merkleRoot
        }
      },

      // ── verify a hash anchor (hash-service) ─────────────────────────────

      async verifyHash (contentHash) {
        let validators
        try {
          validators = await getValidators()
        } catch {
          throw new Error('Cannot fetch validator keys — is the Exonum node running?')
        }

        const res = await axios.get(`/api/services/hash-service/v1/hashes/info?hash=${contentHash}`)
        const { block_proof, proof, record } = res.data

        if (!record) {
          return { verified: false, block: null, record: null, merkleRoot: null, recordType: 'hash' }
        }

        Exonum.verifyBlock(block_proof, validators)

        const tableRootHash = Exonum.verifyTable(
          proof.to_table,
          block_proof.block.state_hash,
          'hash-service.hashes'
        )

        const mapProof = new Exonum.MapProof(
          fixProofEntries(proof.to_record),
          Exonum.MapProof.rawKey(Exonum.Hash),
          HashRecord
        )
        if (mapProof.merkleRoot !== tableRootHash) {
          throw new Error('Merkle root mismatch — data may be tampered')
        }

        const commitBlockHeight = await lookupCommitBlock(record.tx_hash)

        return {
          block:             block_proof.block,
          commitBlockHeight,
          record,
          recordType:        'hash',
          verified:          true,
          merkleRoot:        mapProof.merkleRoot
        }
      },

      // ── verify a batch anchor (batch-service) ────────────────────────────

      async verifyBatch (batchHash) {
        let validators
        try {
          validators = await getValidators()
        } catch {
          throw new Error('Cannot fetch validator keys — is the Exonum node running?')
        }

        const res = await axios.get(`/api/services/batch-service/v1/batches/info?hash=${batchHash}`)
        const { block_proof, proof, record } = res.data

        if (!record) {
          return { verified: false, block: null, record: null, merkleRoot: null, recordType: 'batch' }
        }

        Exonum.verifyBlock(block_proof, validators)

        const tableRootHash = Exonum.verifyTable(
          proof.to_table,
          block_proof.block.state_hash,
          'batch-service.batches'
        )

        const mapProof = new Exonum.MapProof(
          fixProofEntries(proof.to_record),
          Exonum.MapProof.rawKey(Exonum.Hash),
          BatchRecord
        )
        if (mapProof.merkleRoot !== tableRootHash) {
          throw new Error('Merkle root mismatch — data may be tampered')
        }

        const commitBlockHeight = await lookupCommitBlock(record.tx_hash)

        return {
          block:             block_proof.block,
          commitBlockHeight,
          record,
          recordType:        'batch',
          verified:          true,
          merkleRoot:        mapProof.merkleRoot
        }
      },

      // ── auto-detect: try logs → hashes → batches ────────────────────────

      async verifyAny (contentHash) {
        const logResult = await this.verifyLog(contentHash)
        if (logResult.verified) return logResult
        const hashResult = await this.verifyHash(contentHash)
        if (hashResult.verified) return hashResult
        return this.verifyBatch(contentHash)
      },

      // ── block explorer ───────────────────────────────────────────────────

      getBlocks (latest) {
        const suffix = !isNaN(latest) ? `&latest=${latest}` : ''
        return axios.get(`/api/explorer/v1/blocks?count=${PER_PAGE}${suffix}`).then(r => r.data)
      },

      getBlock (height) {
        return axios.get(`/api/explorer/v1/block?height=${height}`).then(r => r.data)
      },

      getTransaction (hash) {
        return axios.get(`${TX_URL}?hash=${hash}`).then(r => r.data)
      },

      // ── off-chain hash match (hybrid single) ────────────────────────────
      // This frontend only verifies private-chain (Exonum) anchors. Restrict
      // the off-chain lookup to the matching DB table so we don't false-match
      // a hash that was actually anchored on Ethereum.
      verifyOffChainHash (contentHash) {
        return axios.get(`/node-api/verify-offchain/${contentHash}?chain=private`).then(r => r.data)
      },

      getLogs (offset = 0, limit = 20) {
        return axios.get(`/api/services/log-service/v1/logs/list?offset=${offset}&limit=${limit}`).then(r => r.data)
      },

      getHashes (offset = 0, limit = 20) {
        return axios.get(`/api/services/hash-service/v1/hashes/list?offset=${offset}&limit=${limit}`).then(r => r.data)
      },

      getBatches (offset = 0, limit = 20) {
        return axios.get(`/api/services/batch-service/v1/batches/list?offset=${offset}&limit=${limit}`).then(r => r.data)
      }
    }
  }
}
