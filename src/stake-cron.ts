import { createWalletClient, http, publicActions, parseEther, formatEther, Address } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { mainnet } from 'viem/chains'
import * as dotenv from 'dotenv'
import logger from './logger'
import STAKING_ABI from './abi/contract.json'
import LINK_TOKEN_ABI from './abi/erc20.json'

dotenv.config()

const CHECK_INTERVAL_MS = Number(process.env.INTERVAL_MS ?? 300)
const HEX_REGEX = /^0x[0-9a-fA-F]{64}$/

const validateEnv = (): { privateKey: Address; stakingContract: Address } => {
    const privateKeyRaw = process.env.PRIVATE_KEY as Address
    const stakingContractRaw = process.env.STAKING_CONTRACT_ADDRESS as Address

    if (!privateKeyRaw || !stakingContractRaw) {
        throw new Error('Missing PRIVATE_KEY or STAKING_CONTRACT_ADDRESS in .env')
    }

    const privateKey = privateKeyRaw.startsWith('0x') ? privateKeyRaw : (`0x${privateKeyRaw}` as Address)
    const stakingContract = stakingContractRaw.startsWith('0x') ? stakingContractRaw : (`0x${stakingContractRaw}` as Address)

    if (privateKey.length !== 66 || !HEX_REGEX.test(privateKey)) {
        throw new Error('Invalid PRIVATE_KEY format.')
    }

    return { privateKey, stakingContract }
}

const { privateKey, stakingContract } = validateEnv()
const account = privateKeyToAccount(privateKey)
const walletClient = createWalletClient({
    account,
    chain: mainnet,
    transport: http(),
}).extend(publicActions)

let cachedLinkTokenAddress: Address | null = null

const getLinkTokenAddress = async (): Promise<Address> => {
    if (!cachedLinkTokenAddress) {
        cachedLinkTokenAddress = (await walletClient.readContract({
            address: stakingContract,
            abi: STAKING_ABI,
            functionName: 'getChainlinkToken',
        })) as Address
    }
    return cachedLinkTokenAddress
}

const getEssentialData = async (linkTokenAddress: Address) => {
    const results = await walletClient.multicall({
        contracts: [
            { address: stakingContract, abi: STAKING_ABI, functionName: 'isOpen' },
            { address: stakingContract, abi: STAKING_ABI, functionName: 'isActive' },
            { address: stakingContract, abi: STAKING_ABI, functionName: 'getMaxPoolSize' },
            { address: stakingContract, abi: STAKING_ABI, functionName: 'getTotalPrincipal' },
            { address: linkTokenAddress, abi: LINK_TOKEN_ABI, functionName: 'balanceOf', args: [account.address] },
        ],
        allowFailure: false,
    })

    return {
        isOpen: results[0] as boolean,
        isActive: results[1] as boolean,
        maxPoolSize: results[2] as bigint,
        totalPrincipal: results[3] as bigint,
        linkBalance: results[4] as bigint,
    }
}

const checkAndStake = async () => {
    try {
        const linkTokenAddress = await getLinkTokenAddress()
        const { isOpen, isActive, maxPoolSize, totalPrincipal, linkBalance } = await getEssentialData(linkTokenAddress)

        if (!isOpen || !isActive) return

        const availableSpace = maxPoolSize - totalPrincipal
        const availableSpaceInLink = Number(formatEther(availableSpace))
        const linkBalanceInLink = Number(formatEther(linkBalance))

        const status = availableSpace > 0 && linkBalanceInLink > 0 ? 'AVAILABLE' : 'UNAVAILABLE'
        logger.info(
            `Pool: ${formatEther(totalPrincipal)}/${formatEther(
                maxPoolSize
            )}, Available: ${availableSpaceInLink} LINK, Balance: ${linkBalanceInLink} LINK [${status}]`
        )

        const amountToStake = Math.min(availableSpaceInLink, linkBalanceInLink)
        if (amountToStake <= 0) return

        const amountInWei = parseEther(amountToStake.toString())
        const { request } = await walletClient.simulateContract({
            account,
            address: linkTokenAddress,
            abi: LINK_TOKEN_ABI,
            functionName: 'transferAndCall',
            args: [stakingContract, amountInWei, '0x'],
        })

        const txHash = await walletClient.writeContract(request)
        logger.info('Tx Hash:', txHash)

        walletClient
            .waitForTransactionReceipt({ hash: txHash })
            .then((receipt) => {
                logger.info('Tx Confirmed:', receipt.status)
            })
            .catch((err) => logger.error('Receipt Error:', err))
    } catch (error) {
        logger.error('Error:', error instanceof Error ? error.message : String(error))
    }
}

const startCron = () => {
    logger.info(`Cronjob started. Checking every ${CHECK_INTERVAL_MS}ms...`)
    const intervalId = setInterval(checkAndStake, CHECK_INTERVAL_MS)

    process.on('SIGINT', () => {
        clearInterval(intervalId)
        logger.info('Cronjob stopped.')
        process.exit()
    })
}

startCron()
