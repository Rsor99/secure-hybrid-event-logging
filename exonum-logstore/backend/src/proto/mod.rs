#![allow(clippy::all, bare_trait_objects)]
include!(concat!(env!("OUT_DIR"), "/protobuf_mod.rs"));

// Bring `types` (from exonum-crypto) into scope so generated code can resolve
// `super::types::Hash` cross-file references.
use exonum_crypto::proto::types;
