use exonum::{
    crypto::Hash,
    merkledb::{
        access::{Access, FromAccess, RawAccessMut},
        Group, ObjectHash, ProofListIndex, RawProofMapIndex,
    },
    runtime::CallerAddress as Address,
};
use exonum_derive::{FromAccess, RequireArtifact};

use super::transactions::HashRecord;

#[derive(Debug, FromAccess, RequireArtifact)]
#[require_artifact(name = "hash-service")]
pub struct Schema<T: Access> {
    pub hashes: RawProofMapIndex<T::Base, Hash, HashRecord>,
}

#[derive(Debug, FromAccess)]
pub(crate) struct SchemaImpl<T: Access> {
    #[from_access(flatten)]
    pub public: Schema<T>,
    pub submitter_history:  Group<T, Address, ProofListIndex<T::Base, Hash>>,
    pub hashes_ordered:     ProofListIndex<T::Base, Hash>,
}

impl<T: Access> SchemaImpl<T> {
    pub fn new(access: T) -> Self { Self::from_root(access).unwrap() }
    pub fn hash_record(&self, content_hash: &Hash) -> Option<HashRecord> {
        self.public.hashes.get(content_hash)
    }
}

impl<T> SchemaImpl<T>
where
    T: Access,
    T::Base: RawAccessMut,
{
    pub fn store_hash(
        &mut self,
        content_hash:    Hash,
        level:           &str,
        message_preview: &str,
        submitter:       Address,
        transaction:     Hash,
    ) {
        let mut history = self.submitter_history.get(&submitter);
        history.push(transaction);
        let history_hash = history.object_hash();
        let record = HashRecord {
            content_hash:    hex::encode(content_hash.as_bytes()),
            level:           level.to_owned(),
            message_preview: message_preview.to_owned(),
            history_len:     history.len(),
            history_hash,
            tx_hash:         hex::encode(transaction.as_bytes()),
        };
        self.public.hashes.put(&content_hash, record);
        self.hashes_ordered.push(content_hash);
    }
}
