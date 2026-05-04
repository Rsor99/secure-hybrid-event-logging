use exonum::{
    crypto::Hash,
    runtime::{CallerAddress as Address, CommonError, ExecutionContext, ExecutionError},
};
use exonum_derive::{exonum_interface, interface_method, BinaryValue, ExecutionFail, ObjectHash};
use exonum_proto::ProtobufConvert;
use serde::{Deserialize, Serialize};

use crate::proto::log_service as proto;
use super::schema::SchemaImpl;
use crate::log_service::LogService;

#[derive(Debug, ExecutionFail)]
pub enum Error {
    InvalidHash      = 0,
    DuplicateRecord  = 1,
}

#[derive(Clone, Debug, Serialize, Deserialize, ProtobufConvert, BinaryValue, ObjectHash)]
#[protobuf_convert(source = "proto::WriteLog")]
pub struct WriteLog {
    pub content_hash:    String,
    pub level:           String,
    pub source:          String,
    pub message_preview: String,
    pub seed:            u64,
    pub message:         String,
    pub metadata_json:   String,
}

#[derive(Clone, Debug, Serialize, Deserialize, ProtobufConvert, BinaryValue, ObjectHash)]
#[protobuf_convert(source = "proto::LogRecord")]
pub struct LogRecord {
    pub content_hash:    String,
    pub level:           String,
    pub source:          String,
    pub message_preview: String,
    pub history_len:     u64,
    pub history_hash:    Hash,
    pub message:         String,
    pub metadata_json:   String,
    pub tx_hash:         String,
}

#[exonum_interface]
pub trait LogServiceInterface<Ctx> {
    type Output;
    #[interface_method(id = 0)]
    fn write(&self, ctx: Ctx, arg: WriteLog) -> Self::Output;
}

impl LogServiceInterface<ExecutionContext<'_>> for LogService {
    type Output = Result<(), ExecutionError>;

    fn write(&self, context: ExecutionContext<'_>, arg: WriteLog) -> Self::Output {
        let (from, tx_hash) = extract_info(&context)?;
        let content_hash = parse_hash(&arg.content_hash)?;
        let mut schema = SchemaImpl::new(context.service_data());
        if schema.log(&content_hash).is_some() {
            return Err(Error::DuplicateRecord.into());
        }
        let preview: String = arg.message_preview.chars().take(256).collect();
        schema.store_log(content_hash, &arg.level, &arg.source, &preview,
                         &arg.message, &arg.metadata_json, from, tx_hash);
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
