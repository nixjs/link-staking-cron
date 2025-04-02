import { createWalletClient, http, publicActions, parseEther, formatEther, Address } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { mainnet } from 'viem/chains'
import * as dotenv from 'dotenv'
import { LINK_TOKEN_ABI, STAKING_ABI } from './abi'

dotenv.config()

const CHECK_INTERVAL_MS = Number(process.env.INTERVAL_MS ?? 300)
const PRIVATE_KEY = process.env.PRIVATE_KEY as Address
const STAKING_CONTRACT_ADDRESS = process.env.STAKING_CONTRACT_ADDRESS as Address
const LINK_CONTRACT_ADDRESS = process.env.LINK_CONTRACT_ADDRESS as Address
const RPC_HTTP = process.env.RPC_URL as Address

const account = privateKeyToAccount(PRIVATE_KEY)
const walletClient = createWalletClient({
    account,
    chain: mainnet,
    transport: RPC_HTTP.length > 0 ? http(RPC_HTTP) : http(),
}).extend(publicActions)

async function checkAndStake() {
    try {
        const results = await walletClient.multicall({
            contracts: [
                {
                    address: STAKING_CONTRACT_ADDRESS,
                    abi: STAKING_ABI,
                    functionName: 'isOpen',
                },
                {
                    address: STAKING_CONTRACT_ADDRESS,
                    abi: STAKING_ABI,
                    functionName: 'isActive',
                },
                {
                    address: STAKING_CONTRACT_ADDRESS,
                    abi: STAKING_ABI,
                    functionName: 'getMaxPoolSize',
                },
                {
                    address: STAKING_CONTRACT_ADDRESS,
                    abi: STAKING_ABI,
                    functionName: 'getTotalPrincipal',
                },
                {
                    address: LINK_CONTRACT_ADDRESS,
                    abi: LINK_TOKEN_ABI,
                    functionName: 'balanceOf',
                    args: [account.address],
                },
            ],
        })

        const isOpen = results[0].result as boolean
        const isActive = results[1].result as boolean
        const maxPoolSize = results[2].result as bigint
        const totalPrincipal = results[3].result as bigint
        const linkBalance = results[4].result as bigint

        if (!isOpen || !isActive || maxPoolSize - totalPrincipal <= 0) return

        const availableSpace = maxPoolSize - totalPrincipal
        const amountToStake = Math.min(Number(formatEther(availableSpace)), Number(formatEther(linkBalance)))

        if (amountToStake <= 0) return

        console.log(`Staking ${amountToStake} LINK...`)

        // Boost gas to high priority
        const { maxFeePerGas, maxPriorityFeePerGas } = await walletClient.estimateFeesPerGas()
        const increasedMaxPriorityFeePerGas = (maxPriorityFeePerGas * 20n) / 10n // x2 lần
        const increasedMaxFeePerGas = (maxFeePerGas * 20n) / 10n // x2 lần

        const amountInWei = parseEther(amountToStake.toString())

        const txHash = await walletClient.writeContract({
            account,
            address: LINK_CONTRACT_ADDRESS,
            abi: LINK_TOKEN_ABI,
            functionName: 'transferAndCall',
            args: [STAKING_CONTRACT_ADDRESS, amountInWei, '0x'],
            maxFeePerGas: increasedMaxFeePerGas,
            maxPriorityFeePerGas: increasedMaxPriorityFeePerGas,
        })
        console.log(`Transaction Hash: ${txHash}`)

        const receipt = await walletClient.waitForTransactionReceipt({ hash: txHash })
        console.log(`Transaction Confirmed: ${receipt.status}`)
    } catch (error) {
        console.warn(error)
    }
}

const startCron = () => {
    console.log(`Cronjob started. Checking every ${CHECK_INTERVAL_MS}ms...`)
    const intervalId = setInterval(checkAndStake, CHECK_INTERVAL_MS)

    process.on('SIGINT', () => {
        clearInterval(intervalId)
        console.log('Cronjob stopped.')
        process.exit()
    })
}

startCron()
