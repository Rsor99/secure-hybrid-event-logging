#!/usr/bin/env bash
set -e

RUNNER="ts-node src/bench/runner.ts"

echo "======================================================"
echo " Experiment 1/8 — PostgreSQL only"
echo "======================================================"
$RUNNER --db=postgres --strategy=database_only

echo "======================================================"
echo " Experiment 2/8 — MongoDB only"
echo "======================================================"
$RUNNER --db=mongo --strategy=database_only

echo "======================================================"
echo " Experiment 3/8 — Ethereum (Sepolia) only"
echo "======================================================"
$RUNNER --chain=ethereum --strategy=public_chain

echo "======================================================"
echo " Experiment 4/8 — Exonum only"
echo "======================================================"
$RUNNER --chain=exonum --strategy=private_chain

echo "======================================================"
echo " Experiment 5/8 — PostgreSQL + Ethereum hybrid"
echo "======================================================"
$RUNNER --db=postgres --chain=ethereum --strategy=hybrid_public

echo "======================================================"
echo " Experiment 6/8 — PostgreSQL + Exonum hybrid"
echo "======================================================"
$RUNNER --db=postgres --chain=exonum --strategy=hybrid_private

echo "======================================================"
echo " Experiment 7/8 — MongoDB + Ethereum hybrid"
echo "======================================================"
$RUNNER --db=mongo --chain=ethereum --strategy=hybrid_public

echo "======================================================"
echo " Experiment 8/8 — MongoDB + Exonum hybrid"
echo "======================================================"
$RUNNER --db=mongo --chain=exonum --strategy=hybrid_private

echo ""
echo "All 24 experiments complete. Results saved in ./results/"
