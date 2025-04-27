const Web3 = require('web3');
const fs = require('fs');
const readline = require('readline');

// === Setting ===
const RPC_URL = 'https://polygon-rpc.com'; // RPC Polygon Mainnet
const TOKEN_CONTRACT_ADDRESS = '0xc708d6f2153933daa50b2d0758955be0a93a8fec'; // VERSE Contact address 
const DECIMALS = 18; // Polygon Decimal
const DELAY_MS = 2000; // Delay between deliveries 2 seconds

const privateKeys = fs.readFileSync('sender.txt', 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

const destinationAddress = fs.readFileSync('destination.txt', 'utf8').trim();

const web3 = new Web3(RPC_URL);

// === ABI transfer ERC-20 ===
const minABI = [
    // balanceOf
    {
        "constant": true,
        "inputs": [
            { "name": "_owner", "type": "address" }
        ],
        "name": "balanceOf",
        "outputs": [
            { "name": "balance", "type": "uint256" }
        ],
        "type": "function"
    },
    // transfer
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

const tokenContract = new web3.eth.Contract(minABI, TOKEN_CONTRACT_ADDRESS);

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendMatic(account, privateKey) {
    try {
        const balance = await web3.eth.getBalance(account.address);
        const gasPrice = await web3.eth.getGasPrice();
        const gasLimit = 21000;

        const gasCost = web3.utils.toBN(gasPrice).mul(web3.utils.toBN(gasLimit));
        const maxSendable = web3.utils.toBN(balance).sub(gasCost);

        if (maxSendable.lte(web3.utils.toBN(0))) {
            console.error(`❌ ${account.address} MATIC balance is insufficient!`);
            return;
        }

        const nonce = await web3.eth.getTransactionCount(account.address, 'latest');
        const tx = {
            from: account.address,
            to: destinationAddress,
            value: maxSendable.toString(),
            gas: gasLimit,
            gasPrice,
            nonce
        };

        const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        console.log(`✅ [MATIC] ${account.address} -> ${destinationAddress} | TX: ${receipt.transactionHash}`);
        fs.appendFileSync('tx_hashes.txt', `${account.address} -> ${destinationAddress} | TX: ${receipt.transactionHash}\n`);
    } catch (err) {
        console.error(`❌ [MATIC] ${account.address} failed: ${err.message}`);
    }
}

async function sendVerse(account, privateKey) {
    try {
        const balance = await tokenContract.methods.balanceOf(account.address).call();
        const amount = web3.utils.toBN(balance);

        if (amount.lte(web3.utils.toBN(0))) {
            console.error(`❌ ${account.address} VERSE balance is empty!`);
            return;
        }

        const gasPrice = await web3.eth.getGasPrice();
        const nonce = await web3.eth.getTransactionCount(account.address, 'latest');

        const tx = {
            from: account.address,
            to: TOKEN_CONTRACT_ADDRESS,
            data: tokenContract.methods.transfer(destinationAddress, amount).encodeABI(),
            gas: 100000,
            gasPrice,
            nonce
        };

        const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        console.log(`✅ [VERSE] ${account.address} -> ${destinationAddress} | TX: ${receipt.transactionHash}`);
        fs.appendFileSync('tx_hashes.txt', `${account.address} -> ${destinationAddress} | TX: ${receipt.transactionHash}\n`);
    } catch (err) {
        console.error(`❌ [VERSE] ${account.address} failed: ${err.message}`);
    }
}

async function start() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question('Want to send (1) MATIC or (2) VERSE? Choose 1 or 2:', async (answer) => {
        rl.close();

        if (answer !== '1' && answer !== '2') {
            console.error('Invalid choice!');
            process.exit(1);
        }

        // Empty the tx_hashes.txt file
        fs.writeFileSync('tx_hashes.txt', '');

        for (const privateKey of privateKeys) {
            const account = web3.eth.accounts.privateKeyToAccount(privateKey);
            web3.eth.accounts.wallet.add(account);

            if (answer === '1') {
                await sendMatic(account, privateKey);
            } else {
                await sendVerse(account, privateKey);
            }

            await sleep(DELAY_MS);
        }
    });
}

start();
