import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { TransactionRequest, TransactionResponse } from "@ethersproject/providers";
import { BigNumber } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { SecretInvest } from "../typechain-types";

const ONE_DAY_IN_SECS = 24 * 60 * 60;
const ONE_HOUR = 1 * 60 * 60;

describe("SecretInvest", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployGeneral() {

    const [owner, marketingMain, marketingReserve, investor1] = await ethers.getSigners();
    const SecretInvest = await ethers.getContractFactory("SecretInvest");
    const secretInvest = await SecretInvest.deploy(marketingMain.address, marketingReserve.address);

    return { secretInvest, owner, marketingMain, marketingReserve, investor1, ONE_DAY_IN_SECS };
  }

  async function deployStartInvest10ETH() {

    const [owner, marketingMain, marketingReserve, investor1] = await ethers.getSigners();
    const SecretInvest = await ethers.getContractFactory("SecretInvest");
    const secretInvest = await SecretInvest.deploy(marketingMain.address, marketingReserve.address);

    await secretInvest.start();

    // Day 1: Investment
    await invest(secretInvest, investor1, 10);

    return { secretInvest, owner, marketingMain, marketingReserve, investor1, ONE_DAY_IN_SECS };
  }

  async function blockTimestamp() : Promise<BigNumber> {
    const blockNumber = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNumber);
    const timestamp = BigNumber.from(block.timestamp);
    return timestamp;
  }

  async function calculateDividendsToReceive(
    secretInvest: SecretInvest, investor1: SignerWithAddress
  ): Promise<BigNumber> {
    const percent = await secretInvest.currentPercent();
    const balance: BigNumber = await secretInvest.balances(investor1.address);
    const dividendPerDay: BigNumber = balance.mul(percent).div(10000);
    const timestamp = await blockTimestamp();
    const timeInvestor = await secretInvest.time(investor1.address);
    const dividendsTime = await secretInvest.DIVIDENDS_TIME();
    const multiplier = timestamp.sub(timeInvestor).div(dividendsTime);

    const dividendsToReceive = dividendPerDay.mul(multiplier);

    return dividendsToReceive;
  }

  async function getDividends(
    secretInvest: SecretInvest, investor1: SignerWithAddress, dividendsToReceive: BigNumber, day: string
  ) {
    const balanceBefore = await ethers.provider.getBalance(investor1.address);

    const trGetDividends: TransactionRequest = {
      to: secretInvest.address,
      value: 0,
      gasLimit: 200000
    };

    await expect(investor1.sendTransaction(trGetDividends))
      .to.emit(secretInvest, "PayOffDividends")
      .withArgs(investor1.address, dividendsToReceive);

    const resultBalance: BigNumber = await ethers.provider.getBalance(investor1.address);
    const expectedBalance = balanceBefore.add(dividendsToReceive);

    // await expect(lock.withdraw()).to.changeEtherBalances(
    //   [owner, lock],
    //   [lockedAmount, -lockedAmount]
    // );

    // we need closeTo, because we spend gas (ETH) when execute transaction
    await expect(expectedBalance, "Incorrect dividends received after " + day)
      .to.closeTo(resultBalance, ethers.utils.parseEther("0.001"));
  }

  async function invest(
    secretInvest: SecretInvest, investor1: SignerWithAddress, amount: number
  ): Promise<TransactionResponse> {

    const valueToInvest: BigNumber = ethers.utils.parseEther(amount.toString());

    const trInvest: TransactionRequest = {
      to: secretInvest.address,
      value: valueToInvest,
      gasLimit: 200000
    };

    return investor1.sendTransaction(trInvest);
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

      it("Total dividends paid is 0", async function () {
        const { secretInvest } = await loadFixture(deployGeneral);

        expect(await secretInvest.totalDividendsPaid()).to.equal(0);
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

    describe("Transfers. Check properties and events", function () {
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

      it("Change % when increase TVL", async function () {
        const { secretInvest, investor1 } = await loadFixture(deployGeneral);
        await secretInvest.start();

        let resultLevel: BigNumber = await secretInvest.currentLevel();
        let expectLevel: BigNumber = BigNumber.from(1);
        await expect(resultLevel, "Incorrect current level").to.equal(expectLevel);

        // 20 Min balance to next level and fee 10% to marketing
        const valueToInvest: BigNumber = ethers.utils.parseEther("23");

        const tr: TransactionRequest = {
          to: secretInvest.address,
          value: valueToInvest,
          gasLimit: 200000
        };

        await investor1.sendTransaction(tr);
        const contractBalanceWei: BigNumber = await ethers.provider.getBalance(secretInvest.address);
        const contractBalanceStr: string = ethers.utils.formatEther(contractBalanceWei);

        resultLevel = await secretInvest.currentLevel();
        expectLevel = BigNumber.from(2);
        await expect(resultLevel, "Incorrect level after ETH send. Current balance: " + contractBalanceStr)
          .to.equal(expectLevel);
      });

      it("Get multiple days dividend", async function () {
        const { secretInvest, investor1 } = await loadFixture(deployStartInvest10ETH);

        // Day 2: Get dividends (rewards)
        await time.increase(ONE_DAY_IN_SECS);
        let dividendsToReceive: BigNumber = await calculateDividendsToReceive(secretInvest, investor1);
        await getDividends(secretInvest, investor1, dividendsToReceive, "1t day investment");

        // Day 3: Get dividends (rewards)
        await time.increase(ONE_DAY_IN_SECS);
        dividendsToReceive = await calculateDividendsToReceive(secretInvest, investor1);
        await getDividends(secretInvest, investor1, dividendsToReceive, "2d day investment");

        // Day 4-5: Get dividends (rewards)
        await time.increase(ONE_DAY_IN_SECS * 2);
        dividendsToReceive = await calculateDividendsToReceive(secretInvest, investor1);
        await getDividends(secretInvest, investor1, dividendsToReceive, "4d day investment");
      });

      it("Get dividends when send new value (after 1 day o more days)", async function () {
        const { secretInvest, investor1 } = await loadFixture(deployStartInvest10ETH);

        // Day 2-3: New invest and automatic get dividends (rewards)
        await time.increase(ONE_DAY_IN_SECS * 3);

        const dividendsToReceive = await calculateDividendsToReceive(secretInvest, investor1);
        const trSendAndGet = invest(secretInvest, investor1, 5);
        await expect(trSendAndGet)
          .to.emit(secretInvest, "PayOffDividends")
          .withArgs(investor1.address, dividendsToReceive);
      });

      it("Check double claim: past 47 hours and then 1 hour, and next 25 hours. 3 claim dividends", async function () {
        const { secretInvest, investor1 } = await loadFixture(deployStartInvest10ETH);

        // 47 hours: Get dividends (rewards)
        await time.increase(ONE_DAY_IN_SECS * 2 - ONE_HOUR);
        let dividendsToReceive: BigNumber = await calculateDividendsToReceive(secretInvest, investor1);
        await getDividends(secretInvest, investor1, dividendsToReceive, "1t day investment");

        // + 1 hour (48 hours): Get dividends (rewards)
        await time.increase(ONE_HOUR);
        dividendsToReceive = await calculateDividendsToReceive(secretInvest, investor1);
        await getDividends(secretInvest, investor1, dividendsToReceive, "2d day investment");

        // + 25 hours (73 hours): Get dividends (rewards)
        await time.increase(ONE_DAY_IN_SECS + ONE_HOUR);
        dividendsToReceive = await calculateDividendsToReceive(secretInvest, investor1);
        await getDividends(secretInvest, investor1, dividendsToReceive, "3d day investment");
      });

      it("Check claim 1 day after last investment", async function () {
        const { secretInvest, investor1 } = await loadFixture(deployStartInvest10ETH);

        // After 1 day: Get dividends (rewards)
        await time.increase(ONE_DAY_IN_SECS);
        let dividendsToReceive: BigNumber = await calculateDividendsToReceive(secretInvest, investor1);
        await getDividends(secretInvest, investor1, dividendsToReceive, "1 day investment");
      });

      it("Next claim = last investment + 1 day. Check 2 investment and 2 claims", async function () {
        const { secretInvest, investor1 } = await loadFixture(deployStartInvest10ETH);

        // After 1 day: Get dividends (rewards)
        await time.increase(ONE_DAY_IN_SECS + ONE_HOUR * 2);
        let dividendsToReceive1: BigNumber = await calculateDividendsToReceive(secretInvest, investor1);
        await getDividends(secretInvest, investor1, dividendsToReceive1, "1 day investment");

        // Second investment
        await invest(secretInvest, investor1, 5);

        // Second claim
        await time.increase(ONE_DAY_IN_SECS);
        let dividendsToReceive2: BigNumber = await calculateDividendsToReceive(secretInvest, investor1);
        await getDividends(secretInvest, investor1, dividendsToReceive2, "2 day investment");

        // Check first day dividend is lower second day after second investment
        expect(dividendsToReceive1).to.lt(dividendsToReceive2, "Dividends of first day is not lower of second day");
      });
    });

    describe("Coverage increase", function () {
      it("Check start. Not owner start", async function () {
        const { secretInvest, investor1 } = await loadFixture(deployGeneral);

        let isStarted = await secretInvest.isStarted();
        expect(isStarted).to.equal(false);
        await expect(secretInvest.connect(investor1).start())
          .to.be.revertedWith("Ownable: caller is not the owner");
        isStarted = await secretInvest.isStarted();
        expect(isStarted).to.equal(false);
      });

      it("Check currentLevel", async function () {
        const { secretInvest, investor1 } = await loadFixture(deployStartInvest10ETH);

        // Level 1
        let expectedLevel = BigNumber.from(1);
        let resultLevel: BigNumber = await secretInvest.currentLevel();
        expect(expectedLevel, "Error in 1 level is incorrect").to.be.equal(resultLevel);

        // Level 2
        await invest(secretInvest, investor1, 13);
        expectedLevel = BigNumber.from(2);
        resultLevel = await secretInvest.currentLevel();
        expect(expectedLevel, "Error in 2 level is incorrect").to.be.equal(resultLevel);

        // Level 3
        await invest(secretInvest, investor1, 22);
        expectedLevel = BigNumber.from(3);
        resultLevel = await secretInvest.currentLevel();
        expect(expectedLevel, "Error in 3 level is incorrect").to.be.equal(resultLevel);

        // Level 4
        await invest(secretInvest, investor1, 22);
        expectedLevel = BigNumber.from(4);
        resultLevel = await secretInvest.currentLevel();
        expect(expectedLevel, "Error in 4 level is incorrect").to.be.equal(resultLevel);

        // Level 5
        await invest(secretInvest, investor1, 22);
        expectedLevel = BigNumber.from(5);
        resultLevel = await secretInvest.currentLevel();
        expect(expectedLevel, "Error in 5 level is incorrect").to.be.equal(resultLevel);

        // Level 6
        await invest(secretInvest, investor1, 23);
        expectedLevel = BigNumber.from(6);
        resultLevel = await secretInvest.currentLevel();
        expect(expectedLevel, "Error in 6 level is incorrect").to.be.equal(resultLevel);        
      });

      it("Check currentPercent", async function () {
        const { secretInvest, investor1 } = await loadFixture(deployStartInvest10ETH);

        // Level 1
        let expectedPercentage: BigNumber = await secretInvest.PERCENT_STEP_1();
        let resultPercentage: BigNumber = await secretInvest.currentPercent();
        expect(expectedPercentage, "Percentage for 1 level is incorrect").to.be.equal(resultPercentage);

        // Level 2
        await invest(secretInvest, investor1, 13);
        expectedPercentage = await secretInvest.PERCENT_STEP_2();
        resultPercentage = await secretInvest.currentPercent();
        expect(expectedPercentage, "Percentage for 2 level is incorrect").to.be.equal(resultPercentage);

        // Level 3
        await invest(secretInvest, investor1, 22);
        expectedPercentage = await secretInvest.PERCENT_STEP_3();
        resultPercentage = await secretInvest.currentPercent();
        expect(expectedPercentage, "Percentage for 3 level is incorrect").to.be.equal(resultPercentage);

        // Level 4
        await invest(secretInvest, investor1, 22);
        expectedPercentage = await secretInvest.PERCENT_STEP_4();
        resultPercentage = await secretInvest.currentPercent();
        expect(expectedPercentage, "Percentage for 4 level is incorrect").to.be.equal(resultPercentage);

        // Level 5
        await invest(secretInvest, investor1, 22);
        expectedPercentage = await secretInvest.PERCENT_STEP_5();
        resultPercentage = await secretInvest.currentPercent();
        expect(expectedPercentage, "Percentage for 5 level is incorrect").to.be.equal(resultPercentage);

        // Level 6
        await invest(secretInvest, investor1, 23);
        expectedPercentage = await secretInvest.PERCENT_STEP_6();
        resultPercentage = await secretInvest.currentPercent();
        expect(expectedPercentage, "Percentage for 6 level is incorrect").to.be.equal(resultPercentage);
      });

      it("Check claimDividends", async function () {
        const { secretInvest, investor1 } = await loadFixture(deployGeneral);
  
        await secretInvest.start();
        await expect(secretInvest.connect(investor1).claimDividends())
          .to.be.revertedWith("SecretInvest: Deposit not found");
  
        await invest(secretInvest, investor1, 10);
        await expect(secretInvest.connect(investor1).claimDividends())
          .to.be.revertedWith("SecretInvest: Too fast payout request. The time of payment has not yet come");
  
        await time.increase(ONE_DAY_IN_SECS);
        const dividendsToReceive = await calculateDividendsToReceive(secretInvest, investor1);
        await expect(secretInvest.connect(investor1).claimDividends())
          .to.emit(secretInvest, "PayOffDividends")
          .withArgs(investor1.address, dividendsToReceive);
      });

      it("Check isAutorizedPayment", async function () {
        const { secretInvest, investor1 } = await loadFixture(deployGeneral);
  
        await secretInvest.start();
        let isAutorizedPayment = await secretInvest.connect(investor1).isAutorizedPayment();
        await expect(isAutorizedPayment, "isAutorizedPayment need to be false 1").to.be.equal(false);
  
        await invest(secretInvest, investor1, 10);
        isAutorizedPayment = await secretInvest.connect(investor1).isAutorizedPayment();
        await expect(isAutorizedPayment, "isAutorizedPayment need to be false 2").to.be.equal(false);

        await time.increase(ONE_DAY_IN_SECS);
        isAutorizedPayment = await secretInvest.connect(investor1).isAutorizedPayment();
        await expect(isAutorizedPayment, "isAutorizedPayment need to be true").to.be.equal(true);
      });
    });
  });
});