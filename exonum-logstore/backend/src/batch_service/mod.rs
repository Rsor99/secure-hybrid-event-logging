use crate::proto;
use exonum::runtime::{ExecutionContext, ExecutionError, InstanceId};
use exonum_derive::{ServiceDispatcher, ServiceFactory};
use exonum_rust_runtime::{api::ServiceApiBuilder, DefaultInstance, Service};

pub mod api;
pub mod schema;
pub mod transactions;

pub use transactions::BatchServiceInterface;

use self::{api::PublicApi, schema::SchemaImpl};

#[derive(Debug, ServiceDispatcher, ServiceFactory)]
#[service_dispatcher(implements("BatchServiceInterface"))]
#[service_factory(artifact_name = "batch-service", proto_sources = "proto")]
pub struct BatchService;

impl Service for BatchService {
    fn initialize(&self, context: ExecutionContext<'_>, _params: Vec<u8>) -> Result<(), ExecutionError> {
        SchemaImpl::new(context.service_data());
        Ok(())
    }
    fn wire_api(&self, builder: &mut ServiceApiBuilder) {
        PublicApi::wire(builder);
    }
}

impl DefaultInstance for BatchService {
    const INSTANCE_ID:   InstanceId = 102;
    const INSTANCE_NAME: &'static str = "batch-service";
}
