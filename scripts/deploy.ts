import { ethers } from "hardhat";

async function main() {
  const marketingMain: string = '0x4fed9d1ed02D51BF99505F1DED7CbF4c474BaE9b';
  const marketingReserve: string = '0x9F94fF7E6Fd7F7637862D8aCc32101fbf4896130';
  const SecretInvest = await ethers.getContractFactory("SecretInvest");
  const secretInvest = await SecretInvest.deploy(marketingMain, marketingReserve);
  await secretInvest.deployed();

  await secretInvest.start();
  console.log(`SecretToken deployed to ${secretInvest.address} and started`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
