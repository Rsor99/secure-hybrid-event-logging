use exonum::{
    crypto::Hash,
    merkledb::{
        access::{Access, FromAccess, RawAccessMut},
        Group, ObjectHash, ProofListIndex, RawProofMapIndex,
    },
    runtime::CallerAddress as Address,
};
use exonum_derive::{FromAccess, RequireArtifact};

use super::transactions::BatchRecord;

#[derive(Debug, FromAccess, RequireArtifact)]
#[require_artifact(name = "batch-service")]
pub struct Schema<T: Access> {
    pub batches: RawProofMapIndex<T::Base, Hash, BatchRecord>,
}

#[derive(Debug, FromAccess)]
pub(crate) struct SchemaImpl<T: Access> {
    #[from_access(flatten)]
    pub public: Schema<T>,
    pub submitter_history:  Group<T, Address, ProofListIndex<T::Base, Hash>>,
    pub batches_ordered:    ProofListIndex<T::Base, Hash>,
}

impl<T: Access> SchemaImpl<T> {
    pub fn new(access: T) -> Self { Self::from_root(access).unwrap() }
    pub fn batch_record(&self, content_hash: &Hash) -> Option<BatchRecord> {
        self.public.batches.get(content_hash)
    }
}

impl<T> SchemaImpl<T>
where
    T: Access,
    T::Base: RawAccessMut,
{
    #[allow(clippy::too_many_arguments)]
    pub fn store_batch(
        &mut self,
        content_hash:   Hash,
        start_id:       &str,
        end_id:         &str,
        count:          u32,
        debug_count:    u32,
        info_count:     u32,
        warn_count:     u32,
        error_count:    u32,
        critical_count: u32,
        max_severity:   &str,
        submitter:      Address,
        transaction:    Hash,
    ) {
        let mut history = self.submitter_history.get(&submitter);
        history.push(transaction);
        let history_hash = history.object_hash();
        let record = BatchRecord {
            content_hash:   hex::encode(content_hash.as_bytes()),
            history_len:    history.len(),
            history_hash,
            tx_hash:        hex::encode(transaction.as_bytes()),
            start_id:       start_id.to_owned(),
            end_id:         end_id.to_owned(),
            count,
            debug_count,
            info_count,
            warn_count,
            error_count,
            critical_count,
            max_severity:   max_severity.to_owned(),
        };
        self.public.batches.put(&content_hash, record);
        self.batches_ordered.push(content_hash);
    }
}
