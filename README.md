# LINK Staking Script

> Script is not for low coders, this script directly affects the contract from your private key. Still recommended to use https://staking.chain.link/, https://stake.link/

## Project Description
This project is a Node.js script written in TypeScript that automates staking LINK tokens into a Chainlink staking pool. It checks the pool's available space every 1 seconds and stakes the maximum possible amount of LINK from your wallet if space is available.

## Prerequisites
- Node.js (>= 16.x)
- npm (>= 8.x)

## Setup
1. **Clone the repository:**
```bash
git clone git@github.com:nixjs/link-staking-cron.git
cd link-staking-cron
```
2. **Install dependencies:**
```bash
pnpm i
```

3. **Create a .env file in the root directory:**
```env
PRIVATE_KEY=your_private_key_here
STAKING_CONTRACT_ADDRESS=0xBc10f2E862ED4502144c7d632a3459F49DFCDB5e
LINK_CONTRACT_ADDRESS=0x514910771af9ca656af840dff83e8264ecf986ca

# Use http()
INTERVAL_MS=200
RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID

# Use websocket
RPC_WEBSOCKET_URL=wss://mainnet.infura.io/ws/v3/YOUR_INFURA_PROJECT_ID  # Switch to WebSocket to reduce connection time and receive data in near realtime.
```
> Use Alchemy, Infura, QuickNode with premium package, or local node to reduce network latency
- RPC can use: [alchemy](https://www.alchemy.com/) or [infura](https://developer.metamask.io/key/active-endpoints) or [quicknode](https://www.quicknode.com/)
- [Contract address of the Community Pool](https://etherscan.io/address/0xBc10f2E862ED4502144c7d632a3459F49DFCDB5e)
- [How to export an account's private key](https://support.metamask.io/configure/accounts/how-to-export-an-accounts-private-key/)

4. **Run**
```bash
pnpm dev # use RPC
pnpm dev-v2 # use Websocket RPC
```

## Note
- Ensure your wallet has enough ETH for gas and LINK for staking.

- Check the contract's requirements (e.g., approval) if staking fails.

- Running every 200 milliseconds may lead to high RPC usage.

> Some public RPCs may log your data, so be careful when handling sensitive information.

- Allow to config interval time (Recommend: 200ms - 300ms):
```bash
INTERVAL_MS=200
```

## Donate
![Based EVM](based-evm.jpg "QR code address")

- [USDT (Ethereum)](https://link.trustwallet.com/send?address=0x66dF9428a207C54b21716c1a94f835dc7f30FC5A&asset=c20000714_t0x55d398326f99059fF775485246999027B3197955): 0x66dF9428a207C54b21716c1a94f835dc7f30FC5A
- [USDT (BSC)](https://link.trustwallet.com/send?address=0x66dF9428a207C54b21716c1a94f835dc7f30FC5A&asset=c20000714_t0x55d398326f99059fF775485246999027B3197955): 0x66dF9428a207C54b21716c1a94f835dc7f30FC5A

![Tron](usdt-tron.jpg "QR code address")
- [USDT (Tron)](https://link.trustwallet.com/send?asset=c195_tTR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t&address=TJH7ybLiThyN5rQygRLfCxHwDMwwZ7DUHZ): TJH7ybLiThyN5rQygRLfCxHwDMwwZ7DUHZ
