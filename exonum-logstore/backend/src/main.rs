use exonum_cli::{NodeBuilder, Spec};
use exonum_logstore::{BatchService, HashService, LogService};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    exonum::helpers::init_logger()?;
    NodeBuilder::new()
        .with(Spec::new(LogService).with_default_instance())
        .with(Spec::new(HashService).with_default_instance())
        .with(Spec::new(BatchService).with_default_instance())
        .run()
        .await
}
