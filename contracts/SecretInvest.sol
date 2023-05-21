// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/**
 *
 * ETH CRYPTOCURRENCY DISTRIBUTION PROJECT
 *
 * Web              - https://invest.cryptohoma.com
 * Twitter          - https://twitter.com/cryptohoma
 * Telegram_channel - https://t.me/cryptohoma_channel
 * EN  Telegram_chat: https://t.me/cryptohoma_chateng
 * RU  Telegram_chat: https://t.me/cryptohoma_chat
 * KOR Telegram_chat: https://t.me/cryptohoma_chatkor
 * Email:             mailto:info(at sign)cryptohoma.com
 *
 *  - GAIN PER 24 HOURS:
 *     -- Contract balance < 20 Ether: 3,25 %
 *     -- Contract balance >= 20 Ether: 3.50 %
 *     -- Contract balance >= 40 Ether: 3.75 %
 *     -- Contract balance >= 60 Ether: 4.00 %
 *     -- Contract balance >= 80 Ether: 4.25 %
 *     -- Contract balance >= 100 Ether: 4.50 %
 *  - Life-long payments
 *  - The revolutionary reliability
 *  - Minimal contribution 0.01 eth
 *  - Currency and payment - ETH
 *  - Contribution allocation schemes:
 *    -- 90% payments
 *    -- 10% Marketing + Operating Expenses
 *
 * ---How to use:
 *  1. Send from ETH wallet to the smart contract address
 *     any amount from 0.01 ETH.
 *  2. Verify your transaction in the history of your application or etherscan.io, specifying the address
 *     of your wallet.
 *  3. Claim your profit by sending 0 ether transaction (every day, every week, i don't care unless you're
 *      spending too much on GAS)
 *
 * RECOMMENDED GAS LIMIT: 200000
 * RECOMMENDED GAS PRICE: https://ethgasstation.info/
 * You can check the payments on the etherscan.io site, in the "Internal Txns" tab of your wallet.
 *
 * ---It is not allowed to transfer from exchanges, only from your personal ETH wallet, for which you
 * have private keys.
 *
 * Contracts reviewed and approved by pros!
 *
 */

import "@openzeppelin/contracts/access/Ownable.sol";

contract SecretInvest is Ownable {
    // Constants

    uint256 public FEE_MARKETING_MAIN = 500;
    uint256 public FEE_MARKETING_RESERVE = 500;
    // The marks of the balance on the contract after which the percentage of payments will change
    uint256 public constant MIN_BALANCE_STEP_1 = 0 ether;
    uint256 public constant MIN_BALANCE_STEP_2 = 20 ether;
    uint256 public constant MIN_BALANCE_STEP_3 = 40 ether;
    uint256 public constant MIN_BALANCE_STEP_4 = 60 ether;
    uint256 public constant MIN_BALANCE_STEP_5 = 80 ether;
    uint256 public constant MIN_BALANCE_STEP_6 = 100 ether;
    uint256 public constant PERCENT_STEP_1 = 325;
    uint256 public constant PERCENT_STEP_2 = 350;
    uint256 public constant PERCENT_STEP_3 = 375;
    uint256 public constant PERCENT_STEP_4 = 400;
    uint256 public constant PERCENT_STEP_5 = 425;
    uint256 public constant PERCENT_STEP_6 = 450;
    // The time through which dividends will be paid
    uint256 public constant DIVIDENDS_TIME = 1 days;
    uint256 public constant MIN_INVESTMENT = 0.01 ether;

    // Properties

    // Investors balances
    mapping(address => uint256) public balances;
    // The time of payment
    mapping(address => uint256) public time;
    uint256 public totalValueLocked;
    uint256 public totalPercents;
    uint256 public totalInvestors;
    uint256 public lastPayment;
    bool public isStarted;
    address public immutable marketingMain;
    address public immutable marketingReserve;

    // Constructor
    constructor(address marketingMain_, address marketingReserve_) {
        marketingMain = marketingMain_;
        marketingReserve = marketingReserve_;
    }

    // Events

    event NewInvestor(address indexed investor, uint256 deposit);
    event PayOffDividends(address indexed investor, uint256 value);
    event NewDeposit(address indexed investor, uint256 value);

    // Modifiers

    /// Checking the positive balance of the beneficiary
    modifier isInvestor() {
        require(balances[msg.sender] > 0, "SecretInvest: Deposit not found");
        _;
    }

    /// Checking the next payout time
    modifier timeCheck() {
        require(
            block.timestamp >= (time[msg.sender] + DIVIDENDS_TIME),
            "SecretInvest: Too fast payout request. The time of payment has not yet come"
        );
        _;
    }

    // Checking if contract is started
    modifier started() {
        require(
            isStarted == true,
            "SecretInvest: Contract is not started. Please wait."
        );
        _;
    }

    // Private functions
    function _receivePayment() private isInvestor timeCheck {
        uint256 multiplier = depositMultiplier();
        time[msg.sender] = block.timestamp;
        payable(msg.sender).transfer(multiplier);

        totalPercents += multiplier;
        lastPayment = block.timestamp;
        emit PayOffDividends(msg.sender, multiplier);
    }

    function _calcFeeMarketingMain(
        uint256 value
    ) private view returns (uint256) {
        return value * FEE_MARKETING_MAIN / 10000;
    }

    function _calcFeeMarketingReserve(
        uint256 value
    ) private view returns (uint256) {
        return value * FEE_MARKETING_RESERVE / 10000;
    }

    function _createDeposit() private started {
        if (msg.value > 0) {
            require(
                msg.value >= MIN_INVESTMENT,
                "SecretInvest: msg.value must be >= minInvesment"
            );

            if (balances[msg.sender] == 0) {
                emit NewInvestor(msg.sender, msg.value);
                totalInvestors += 1;
            }

            // Fee
            uint256 mainMarketingFee = _calcFeeMarketingMain(msg.value);
            payable(marketingMain).transfer(mainMarketingFee);
            uint256 reserveMarketingFee = _calcFeeMarketingReserve(msg.value);
            payable(marketingReserve).transfer(reserveMarketingFee);

            if (
                depositMultiplier() > 0 &&
                block.timestamp >= (time[msg.sender] * DIVIDENDS_TIME)
            ) {
                _receivePayment();
            }

            balances[msg.sender] = balances[msg.sender] + msg.value;
            time[msg.sender] = block.timestamp;

            totalValueLocked += msg.value;
            emit NewDeposit(msg.sender, msg.value);
        } else {
            _receivePayment();
        }
    }

    // Public functions
    function depositMultiplier() public view returns (uint256) {
        uint256 percent = currentPercent();
        uint256 rate = (balances[msg.sender] * percent) / 10000;
        uint256 multiplier = (block.timestamp - time[msg.sender]) /
            DIVIDENDS_TIME;

        return (rate * multiplier);
    }

    function isAutorizedPayment() public view returns (bool) {
        bool result;
        if (
            balances[msg.sender] > 0 &&
            block.timestamp >= (time[msg.sender] + DIVIDENDS_TIME)
        ) {
            result = true;
        } else {
            result = false;
        }
        return result;
    }

    function currentLevel() public view returns (uint256) {
        uint256 contractBalance = address(this).balance;
        uint256 level;
        if (
            contractBalance >= MIN_BALANCE_STEP_1 &&
            contractBalance < MIN_BALANCE_STEP_2
        ) {
            level = 1;
        } else if (
            contractBalance >= MIN_BALANCE_STEP_2 &&
            contractBalance < MIN_BALANCE_STEP_3
        ) {
            level = 2;
        } else if (
            contractBalance >= MIN_BALANCE_STEP_3 &&
            contractBalance < MIN_BALANCE_STEP_4
        ) {
            level = 3;
        } else if (
            contractBalance >= MIN_BALANCE_STEP_4 &&
            contractBalance < MIN_BALANCE_STEP_5
        ) {
            level = 4;
        } else if (
            contractBalance >= MIN_BALANCE_STEP_5 &&
            contractBalance < MIN_BALANCE_STEP_6
        ) {
            level = 5;
        } else if (contractBalance >= MIN_BALANCE_STEP_6) {
            level = 6;
        }
        return level;
    }

    function currentPercent() public view returns (uint256) {
        uint256 level = currentLevel();
        uint256 percent;
        if (level == 1) {
            percent = PERCENT_STEP_1;
        } else if (level == 2) {
            percent = PERCENT_STEP_2;
        } else if (level == 3) {
            percent = PERCENT_STEP_3;
        } else if (level == 4) {
            percent = PERCENT_STEP_4;
        } else if (level == 5) {
            percent = PERCENT_STEP_5;
        } else if (level == 6) {
            percent = PERCENT_STEP_6;
        }
        return percent;
    }

    function start() public onlyOwner {
        isStarted = true;
    }

    /// Function that is launched when transferring money to a contract
    receive() external payable {
        _createDeposit();
    }
}
