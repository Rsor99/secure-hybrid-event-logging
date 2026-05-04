const hre = require("hardhat");

async function main() {
  const logStore = await hre.ethers.deployContract("LogStore");
  await logStore.waitForDeployment();
  console.log(`LogStore   deployed to: ${await logStore.getAddress()}`);

  const hashStore = await hre.ethers.deployContract("HashStore");
  await hashStore.waitForDeployment();
  console.log(`HashStore  deployed to: ${await hashStore.getAddress()}`);

  const batchStore = await hre.ethers.deployContract("BatchStore");
  await batchStore.waitForDeployment();
  console.log(`BatchStore deployed to: ${await batchStore.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
