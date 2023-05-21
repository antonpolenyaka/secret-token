import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";
import { TransactionRequest } from "@ethersproject/providers";
import { BigNumber } from "ethers";

describe("SecretInvest", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployGeneral() {
    const ONE_DAY_IN_SECS = 24 * 60 * 60;
    const oneDay = ONE_DAY_IN_SECS;

    const [owner, marketingMain, marketingReserve, investor1] = await ethers.getSigners();
    const SecretInvest = await ethers.getContractFactory("SecretInvest");
    const secretInvest = await SecretInvest.deploy(marketingMain.address, marketingReserve.address);

    return { secretInvest, owner, marketingMain, marketingReserve, investor1, oneDay };
  }

  describe("Deployment", function () {
    describe("Deploy configiguration", function () {
      it("Correct set marketingMain address", async function () {
        const { secretInvest, marketingMain } = await loadFixture(deployGeneral);

        expect(await secretInvest.marketingMain()).to.equal(marketingMain.address);
      });

      it("Correct set marketingReserve address", async function () {
        const { secretInvest, marketingReserve } = await loadFixture(deployGeneral);

        expect(await secretInvest.marketingReserve()).to.equal(marketingReserve.address);
      });

      it("Correct set owner address", async function () {
        const { secretInvest, owner } = await loadFixture(deployGeneral);

        expect(await secretInvest.owner()).to.equal(owner.address);
      });

      it("Not started contract", async function () {
        const { secretInvest } = await loadFixture(deployGeneral);

        expect(await secretInvest.isStarted()).to.equal(false);
      });

      it("Total value locked is 0", async function () {
        const { secretInvest } = await loadFixture(deployGeneral);

        expect(await secretInvest.totalValueLocked()).to.equal(0);
      });

      it("Total percents is 0", async function () {
        const { secretInvest } = await loadFixture(deployGeneral);

        expect(await secretInvest.totalPercents()).to.equal(0);
      });

      it("Total investors is 0", async function () {
        const { secretInvest } = await loadFixture(deployGeneral);

        expect(await secretInvest.totalInvestors()).to.equal(0);
      });

      it("Last payments is never (0)", async function () {
        const { secretInvest } = await loadFixture(deployGeneral);

        expect(await secretInvest.lastPayment()).to.equal(0);
      });

      it("Current level is 1", async function () {
        const { secretInvest } = await loadFixture(deployGeneral);

        expect(await secretInvest.currentLevel()).to.equal(1);
      });

      it("Current percent is 3.25%", async function () {
        const { secretInvest } = await loadFixture(deployGeneral);

        expect(await secretInvest.currentPercent()).to.equal(325);
      });
    });

    describe("Transfers", function () {
      it("Invest 0.01 ETH", async function () {
        const { secretInvest, investor1, marketingMain, marketingReserve } = await loadFixture(deployGeneral);
        await secretInvest.start();

        const balanceMarketingMain = await ethers.provider.getBalance(marketingMain.address);
        const balanceMarketingReserve = await ethers.provider.getBalance(marketingReserve.address);
        const valueToInvest: BigNumber = ethers.utils.parseEther("0.01");

        const tr: TransactionRequest = {
          to: secretInvest.address,
          value: valueToInvest,
          gasLimit: 200000
        };
        await expect(investor1.sendTransaction(tr), "Incorrect events at ETH transfer to the contract")
          .to.emit(secretInvest, "NewInvestor")
          .withArgs(investor1.address, valueToInvest)
          .to.emit(secretInvest, "NewDeposit")
          .withArgs(investor1.address, valueToInvest);

        // Check user data

        const expectedInvestors = BigNumber.from("1");
        const resultInvestors = await secretInvest.totalInvestors();
        await expect(resultInvestors).to.equal(expectedInvestors, "Number of investors is not correct after invest");

        const expectedBalance = valueToInvest;
        const resultBalance = await secretInvest.balances(investor1.address);
        await expect(resultBalance).to.equal(expectedBalance, "Balance of investor is not correct after invest");

        const expectedTVL = valueToInvest;
        const resultTVL = await secretInvest.totalValueLocked();
        await expect(resultTVL).to.equal(expectedTVL, "TVL is not correct after invest");

        // Check fee
        let expectedBalanceMarketingMain = ethers.utils.parseEther("0.0005");
        expectedBalanceMarketingMain = expectedBalanceMarketingMain.add(balanceMarketingMain);
        const resultBalanceMarketingMain = await ethers.provider.getBalance(marketingMain.address);
        await expect(resultBalanceMarketingMain).to.equal(expectedBalanceMarketingMain, "Incorrect marketing main balance ETH");

        let expectedBalanceMarketingReserve = ethers.utils.parseEther("0.0005");
        expectedBalanceMarketingReserve = expectedBalanceMarketingReserve.add(balanceMarketingReserve);
        const resultBalanceMarketingReserve = await ethers.provider.getBalance(marketingReserve.address);
        await expect(resultBalanceMarketingReserve).to.equal(expectedBalanceMarketingReserve, "Incorrect marketing reserve balance ETH");
      });

      it("Reverted invest 0.009 ETH (<0.01 ETH)", async function () {
        const { secretInvest, investor1 } = await loadFixture(deployGeneral);
        await secretInvest.start();

        const valueToInvest: BigNumber = ethers.utils.parseEther("0.009");

        const tr: TransactionRequest = {
          to: secretInvest.address,
          value: valueToInvest,
          gasLimit: 200000
        };
        await expect(investor1.sendTransaction(tr), "Incorrect event check at ETH transfer to contract")
        .to.be.revertedWith(
          "SecretInvest: msg.value must be >= minInvesment"
        );
      });

      it("Reverted invest if not started the contract", async function () {
        const { secretInvest, investor1 } = await loadFixture(deployGeneral);

        const valueToInvest: BigNumber = ethers.utils.parseEther("0.01");

        const tr: TransactionRequest = {
          to: secretInvest.address,
          value: valueToInvest,
          gasLimit: 200000
        };
        await expect(investor1.sendTransaction(tr), "Incorrect events at ETH transfer to the contract")
        .to.be.revertedWith(
          "SecretInvest: Contract is not started. Please wait."
        );
      });
    });
  });
});
