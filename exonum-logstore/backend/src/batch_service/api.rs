use exonum::{
    blockchain::{BlockProof, IndexProof},
    crypto::Hash,
};
use exonum_merkledb::{proof_map::Raw, MapProof};
use exonum_rust_runtime::api::{self, ServiceApiBuilder, ServiceApiState};
use serde::{Deserialize, Serialize};

use super::{schema::SchemaImpl, transactions::BatchRecord};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InfoQuery { pub hash: String }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListQuery {
    #[serde(default)]            pub offset: u64,
    #[serde(default = "default_limit")] pub limit: u64,
}
fn default_limit() -> u64 { 20 }

#[derive(Debug, Serialize, Deserialize)]
pub struct Proof {
    pub to_table:  MapProof<String, Hash>,
    pub to_record: MapProof<Hash, BatchRecord, Raw>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BatchInfo {
    pub block_proof: BlockProof,
    pub proof:       Proof,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub record:      Option<BatchRecord>,
}

#[derive(Debug, Serialize)]
pub struct BatchesList { pub total: u64, pub offset: u64, pub limit: u64, pub items: Vec<BatchRecord> }

fn decode_hash(hex_str: &str) -> api::Result<Hash> {
    let bytes = hex::decode(hex_str).map_err(|_| api::Error::bad_request().title("Invalid hex hash"))?;
    if bytes.len() != 32 { return Err(api::Error::bad_request().title("Hash must be 32 bytes")); }
    let mut arr = [0u8; 32];
    arr.copy_from_slice(&bytes);
    Ok(Hash::new(arr))
}

#[derive(Debug, Clone, Copy)]
pub struct PublicApi;

impl PublicApi {
    pub async fn info(state: ServiceApiState, query: InfoQuery) -> api::Result<BatchInfo> {
        let IndexProof { block_proof, index_proof, .. } =
            state.data().proof_for_service_index("batches").unwrap();
        let content_hash = decode_hash(&query.hash)?;
        let schema    = SchemaImpl::new(state.service_data());
        let to_record = schema.public.batches.get_proof(content_hash);
        let record    = schema.public.batches.get(&content_hash);
        Ok(BatchInfo { block_proof, proof: Proof { to_table: index_proof, to_record }, record })
    }

    pub async fn list(state: ServiceApiState, query: ListQuery) -> api::Result<BatchesList> {
        let limit = query.limit.min(200);
        let schema = SchemaImpl::new(state.service_data());
        let lst   = &schema.batches_ordered;
        let total = lst.len();
        let end   = total.saturating_sub(query.offset);
        let start = end.saturating_sub(limit);
        let items = (start..end).rev()
            .filter_map(|i| lst.get(i))
            .filter_map(|h| schema.public.batches.get(&h))
            .collect();
        Ok(BatchesList { total, offset: query.offset, limit, items })
    }

    pub fn wire(builder: &mut ServiceApiBuilder) {
        builder.public_scope()
            .endpoint("v1/batches/info", Self::info)
            .endpoint("v1/batches/list", Self::list);
    }
}
