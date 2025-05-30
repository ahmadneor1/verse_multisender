const { ethers } = require('ethers');
const fs = require('fs');
const readline = require('readline');

// === Setting ===
const RPC_URL = 'https://polygon-rpc.com';
const TOKEN_CONTRACT_ADDRESS = '0xc708d6f2153933daa50b2d0758955be0a93a8fec'; // VERSE Contract Address
const DECIMALS = 18; // Token Decimals
const DELAY_MS = 2000; // Delay antar pengiriman

// Baca mnemonic dari file
const mnemonics = fs.readFileSync('sender.txt', 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

const destinationAddress = fs.readFileSync('destination.txt', 'utf8').trim();
const provider = new ethers.JsonRpcProvider(RPC_URL);

// === ABI transfer ERC-20 ===
const minABI = [
    {
        "constant": true,
        "inputs": [{ "name": "_owner", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "name": "balance", "type": "uint256" }],
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            { "name": "_to", "type": "address" },
            { "name": "_value", "type": "uint256" }
        ],
        "name": "transfer",
        "outputs": [{ "name": "", "type": "bool" }],
        "type": "function"
    }
];

const tokenContract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, minABI, provider);

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendMatic(wallet) {
    try {
        const balance = await provider.getBalance(wallet.address);
        const feeData = await provider.getFeeData();
        const gasPrice = feeData.gasPrice || feeData.maxFeePerGas;
        const gasLimit = 21000;
        const gasCost = gasPrice * BigInt(gasLimit);
        const maxSendable = balance - gasCost;

        if (maxSendable <= 0n) {
            console.error(`❌ ${wallet.address} | MATIC balance insufficient for gas.`);
            return;
        }

        const tx = {
            to: destinationAddress,
            value: maxSendable,
            gasLimit,
            gasPrice
        };

        const txResponse = await wallet.sendTransaction(tx);
        console.log(`✅ [MATIC] ${wallet.address} -> ${destinationAddress} | TX: ${txResponse.hash}`);
    } catch (err) {
        console.error(`❌ [MATIC] ${wallet.address} failed: ${err.message}`);
    }
}

async function sendVerse(wallet, sendFullBalance, fixedAmountInVerse = null) {
    try {
        const tokenBalance = await tokenContract.balanceOf(wallet.address);
        const amountBalance = tokenBalance;

        if (amountBalance <= 0n) {
            console.error(`❌ ${wallet.address} | VERSE balance is zero.`);
            return;
        }

        // Dapatkan data gas fee yang benar
        const feeData = await provider.getFeeData();
        const gasPrice = feeData.gasPrice || feeData.maxFeePerGas;

        if (!gasPrice) {
            throw new Error("Failed to get gas price");
        }

        const estimatedGas = 70000;
        const requiredGasFee = gasPrice * BigInt(estimatedGas);

        const nativeBalance = await provider.getBalance(wallet.address);
        if (nativeBalance < requiredGasFee) {
            console.error(`❌ ${wallet.address} | MATIC balance insufficient for VERSE transfer gas.`);
            return;
        }

        let transferAmount = sendFullBalance
            ? amountBalance
            : ethers.parseUnits(fixedAmountInVerse.toString(), DECIMALS);

        if (transferAmount > amountBalance) {
            console.error(`❌ ${wallet.address} | Not enough VERSE to send.`);
            return;
        }

        const tokenContractWithSigner = tokenContract.connect(wallet);
        const txResponse = await tokenContractWithSigner.transfer(destinationAddress, transferAmount);
        console.log(`✅ [VERSE] ${wallet.address} -> ${destinationAddress} | TX: ${txResponse.hash}`);
    } catch (err) {
        console.error(`❌ [VERSE] ${wallet.address} failed: ${err.message}`);
    }
}

async function start() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question('Want to send (1) MATIC or (2) VERSE? Choose 1 or 2: ', async (answer) => {
        if (answer !== '1' && answer !== '2') {
            console.error('Invalid choice!');
            rl.close();
            process.exit(1);
        }

        let sendFullBalance = true;
        let fixedAmount = null;

        if (answer === '2') {
            await new Promise(resolve => {
                rl.question('Send (1) full balance or (2) fixed amount? Choose 1 or 2: ', async (option) => {
                    if (option === '1') {
                        sendFullBalance = true;
                    } else if (option === '2') {
                        sendFullBalance = false;
                        rl.question('Enter fixed amount of VERSE to send (example 10): ', (amount) => {
                            fixedAmount = parseFloat(amount);
                            if (isNaN(fixedAmount) || fixedAmount <= 0) {
                                console.error('Invalid amount!');
                                process.exit(1);
                            }
                            resolve();
                        });
                        return;
                    } else {
                        console.error('Invalid option!');
                        process.exit(1);
                    }
                    resolve();
                });
            });
        }

        rl.close();
        fs.writeFileSync('tx_hashes.txt', '');

        for (const mnemonic of mnemonics) {
            try {
                const wallet = ethers.Wallet.fromPhrase(mnemonic, provider);

                try {
                    if (answer === '1') {
                        await sendMatic(wallet);
                    } else {
                        await sendVerse(wallet, sendFullBalance, fixedAmount);
                    }
                } catch (e) {
                    console.error(`❌ Critical error at ${wallet.address}: ${e.message}`);
                }

                await sleep(DELAY_MS);
            } catch (e) {
                console.error(`❌ Invalid mnemonic: ${e.message}`);
            }
        }
    });
}

start();