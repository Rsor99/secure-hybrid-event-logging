use exonum::{
    crypto::Hash,
    merkledb::{
        access::{Access, FromAccess, RawAccessMut},
        Group, ObjectHash, ProofListIndex, RawProofMapIndex,
    },
    runtime::CallerAddress as Address,
};
use exonum_derive::{FromAccess, RequireArtifact};

use super::transactions::LogRecord;

#[derive(Debug, FromAccess, RequireArtifact)]
#[require_artifact(name = "log-service")]
pub struct Schema<T: Access> {
    pub logs: RawProofMapIndex<T::Base, Hash, LogRecord>,
}

#[derive(Debug, FromAccess)]
pub(crate) struct SchemaImpl<T: Access> {
    #[from_access(flatten)]
    pub public: Schema<T>,
    pub submitter_history: Group<T, Address, ProofListIndex<T::Base, Hash>>,
    pub logs_ordered:      ProofListIndex<T::Base, Hash>,
}

impl<T: Access> SchemaImpl<T> {
    pub fn new(access: T) -> Self {
        Self::from_root(access).unwrap()
    }
    pub fn log(&self, content_hash: &Hash) -> Option<LogRecord> {
        self.public.logs.get(content_hash)
    }
}

impl<T> SchemaImpl<T>
where
    T: Access,
    T::Base: RawAccessMut,
{
    pub fn store_log(
        &mut self,
        content_hash:    Hash,
        level:           &str,
        source:          &str,
        message_preview: &str,
        message:         &str,
        metadata_json:   &str,
        submitter:       Address,
        transaction:     Hash,
    ) {
        let mut history = self.submitter_history.get(&submitter);
        history.push(transaction);
        let history_hash = history.object_hash();

        let record = LogRecord {
            content_hash:    hex::encode(content_hash.as_bytes()),
            level:           level.to_owned(),
            source:          source.to_owned(),
            message_preview: message_preview.to_owned(),
            history_len:     history.len(),
            history_hash,
            message:         message.to_owned(),
            metadata_json:   metadata_json.to_owned(),
            tx_hash:         hex::encode(transaction.as_bytes()),
        };
        self.public.logs.put(&content_hash, record);
        self.logs_ordered.push(content_hash);
    }
}
