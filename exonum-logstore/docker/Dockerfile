# ── Stage 1: build Rust backend ──────────────────────────────────────────────
FROM --platform=linux/amd64 ubuntu:22.04 AS backend-builder

ENV DEBIAN_FRONTEND=noninteractive

# cmake + lld + compression libs needed when rocksdb crate compiles RocksDB from
# its bundled source (i.e. no ROCKSDB_LIB_DIR set → static link, no runtime dep).
# clang-12 + libclang-12-dev: bindgen 0.59.2 panics on anonymous enums with
# clang-14 (Ubuntu 22.04 default). clang-12 parses them correctly.
RUN apt-get update && apt-get install -y \
    curl git build-essential pkg-config cmake \
    clang-12 libclang-12-dev lld \
    libsodium-dev libsnappy-dev liblz4-dev libzstd-dev \
    libssl-dev libprotobuf-dev protobuf-compiler \
    && rm -rf /var/lib/apt/lists/*

# Point bindgen at clang-12's libclang so it doesn't see clang-14's anonymous
# enum names, and use clang-12 + lld as the Rust linker.
ENV LIBCLANG_PATH=/usr/lib/llvm-12/lib
ENV RUSTFLAGS="-C linker=clang-12 -C link-arg=-fuse-ld=lld"

# Install Rust
RUN curl https://sh.rustup.rs -sSf | sh -s -- -y --default-toolchain stable
ENV PATH="/root/.cargo/bin:${PATH}"

WORKDIR /build/backend
COPY backend/Cargo.toml backend/Cargo.lock* ./
COPY backend/build.rs ./
COPY backend/src ./src
COPY backend/patches ./patches

# No ROCKSDB_LIB_DIR → rocksdb crate compiles from bundled source (static link).
# Compression codec libs (snappy/lz4/zstd) are linked dynamically.
RUN cargo build --release

# ── Stage 2: build Vue frontend ──────────────────────────────────────────────
FROM --platform=linux/amd64 node:18-slim AS frontend-builder

WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci

# Generate protobuf JS stubs from all 3 service proto files
COPY backend/src/proto/log_service.proto   /build/proto/log_service.proto
COPY backend/src/proto/hash_service.proto  /build/proto/hash_service.proto
COPY backend/src/proto/batch_service.proto /build/proto/batch_service.proto
COPY frontend/ ./

RUN npx pbjs --keep-case -t static-module --root logstore \
      --path node_modules/exonum-client/proto \
      /build/proto/log_service.proto \
      /build/proto/hash_service.proto \
      /build/proto/batch_service.proto \
      -o ./proto/stubs.js \
    && npm run compile

# ── Stage 3: runtime image ───────────────────────────────────────────────────
FROM --platform=linux/amd64 ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# RocksDB is statically linked — only the compression codec .so files are needed
# at runtime. Package names for these are stable across amd64 and arm64.
RUN apt-get update && apt-get install -y \
    libsodium23 libsnappy1v5 liblz4-1 libzstd1 nodejs npm \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the compiled binary
COPY --from=backend-builder /build/backend/target/release/exonum-logstore /usr/local/bin/exonum-logstore

# Copy the built frontend
COPY --from=frontend-builder /build/frontend /app/frontend
COPY frontend/package*.json /app/frontend/

WORKDIR /app/frontend
RUN npm ci --only=production

WORKDIR /app
COPY docker/launch.sh ./launch.sh
RUN chmod +x launch.sh

# Ports: 8200 = Exonum public API, 8080 = frontend
EXPOSE 8200 8080

ENTRYPOINT ["./launch.sh"]
