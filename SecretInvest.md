## Sūrya's Description Report

### Files Description Table


|  File Name  |  SHA-1 Hash  |
|-------------|--------------|
| contracts/SecretInvest.sol | ab6de539211f217cdd9064d31203534688a789e7 |


### Contracts Description Table


|  Contract  |         Type        |       Bases      |                  |                 |
|:----------:|:-------------------:|:----------------:|:----------------:|:---------------:|
|     └      |  **Function Name**  |  **Visibility**  |  **Mutability**  |  **Modifiers**  |
||||||
| **SecretInvest** | Implementation | Ownable |||
| └ | <Constructor> | Public ❗️ | 🛑  |NO❗️ |
| └ | _receivePayment | Private 🔐 | 🛑  | isInvestor |
| └ | _calcFeeMarketingMain | Private 🔐 |   | |
| └ | _calcFeeMarketingReserve | Private 🔐 |   | |
| └ | _createDeposit | Private 🔐 | 🛑  | started |
| └ | _numDaysToPay | Private 🔐 |   | |
| └ | claimDividends | Public ❗️ | 🛑  |NO❗️ |
| └ | depositMultiplier | Public ❗️ |   |NO❗️ |
| └ | isAutorizedPayment | Public ❗️ |   |NO❗️ |
| └ | currentLevel | Public ❗️ |   |NO❗️ |
| └ | currentPercent | Public ❗️ |   |NO❗️ |
| └ | start | Public ❗️ | 🛑  | onlyOwner |
| └ | <Receive Ether> | External ❗️ |  💵 |NO❗️ |


### Legend

|  Symbol  |  Meaning  |
|:--------:|-----------|
|    🛑    | Function can modify state |
|    💵    | Function is payable |
