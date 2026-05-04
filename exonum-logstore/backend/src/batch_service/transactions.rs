use exonum::{
    crypto::Hash,
    runtime::{CallerAddress as Address, CommonError, ExecutionContext, ExecutionError},
};
use exonum_derive::{exonum_interface, interface_method, BinaryValue, ExecutionFail, ObjectHash};
use exonum_proto::ProtobufConvert;
use serde::{Deserialize, Serialize};

use crate::proto::batch_service as proto;
use super::schema::SchemaImpl;
use crate::batch_service::BatchService;

#[derive(Debug, ExecutionFail)]
pub enum Error {
    InvalidHash      = 0,
    DuplicateRecord  = 1,
}

#[derive(Clone, Debug, Serialize, Deserialize, ProtobufConvert, BinaryValue, ObjectHash)]
#[protobuf_convert(source = "proto::WriteBatch")]
pub struct WriteBatch {
    pub content_hash:   String,
    pub seed:           u64,
    pub start_id:       String,
    pub end_id:         String,
    pub count:          u32,
    pub debug_count:    u32,
    pub info_count:     u32,
    pub warn_count:     u32,
    pub error_count:    u32,
    pub critical_count: u32,
    pub max_severity:   String,
}

#[derive(Clone, Debug, Serialize, Deserialize, ProtobufConvert, BinaryValue, ObjectHash)]
#[protobuf_convert(source = "proto::BatchRecord")]
pub struct BatchRecord {
    pub content_hash:   String,
    pub history_len:    u64,
    pub history_hash:   Hash,
    pub tx_hash:        String,
    pub start_id:       String,
    pub end_id:         String,
    pub count:          u32,
    pub debug_count:    u32,
    pub info_count:     u32,
    pub warn_count:     u32,
    pub error_count:    u32,
    pub critical_count: u32,
    pub max_severity:   String,
}

#[exonum_interface]
pub trait BatchServiceInterface<Ctx> {
    type Output;
    #[interface_method(id = 0)]
    fn write(&self, ctx: Ctx, arg: WriteBatch) -> Self::Output;
}

impl BatchServiceInterface<ExecutionContext<'_>> for BatchService {
    type Output = Result<(), ExecutionError>;

    fn write(&self, context: ExecutionContext<'_>, arg: WriteBatch) -> Self::Output {
        let (from, tx_hash) = extract_info(&context)?;
        let content_hash = parse_hash(&arg.content_hash)?;
        let mut schema = SchemaImpl::new(context.service_data());
        if schema.batch_record(&content_hash).is_some() {
            return Err(Error::DuplicateRecord.into());
        }
        schema.store_batch(
            content_hash,
            &arg.start_id, &arg.end_id, arg.count,
            arg.debug_count, arg.info_count, arg.warn_count, arg.error_count, arg.critical_count,
            &arg.max_severity,
            from, tx_hash,
        );
        Ok(())
    }
}

fn parse_hash(hex_str: &str) -> Result<Hash, ExecutionError> {
    let bytes = hex::decode(hex_str).map_err(|_| Error::InvalidHash)?;
    if bytes.len() != 32 { return Err(Error::InvalidHash.into()); }
    let mut arr = [0u8; 32];
    arr.copy_from_slice(&bytes);
    Ok(Hash::new(arr))
}

fn extract_info(context: &ExecutionContext<'_>) -> Result<(Address, Hash), ExecutionError> {
    let tx_hash = context.transaction_hash().ok_or(CommonError::UnauthorizedCaller)?;
    Ok((context.caller().address(), tx_hash))
}
