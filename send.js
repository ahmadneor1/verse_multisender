const Web3 = require('web3');
const fs = require('fs');
const { toBN, toWei } = require('web3-utils');

// === Setting ===
const RPC_URL = 'https://polygon-rpc.com'; // RPC Polygon Mainnet
const TOKEN_CONTRACT_ADDRESS = '0xc708d6f2153933daa50b2d0758955be0a93a8fec'; // Alamat contract token VERSE
const AMOUNT_TO_SEND = '12000'; // Jumlah token yang dikirim per wallet
const DECIMALS = 18; // Biasanya 18 untuk ERC-20 standar

// === Load Data dari File ===
const privateKeys = fs.readFileSync('privateKeys.txt', 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

const destinationAddress = fs.readFileSync('destination.txt', 'utf8').trim();

// === Web3 Setup ===
const web3 = new Web3(RPC_URL);

// === ABI transfer ERC-20 ===
const minABI = [
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

async function sendTokens() {
    for (let privateKey of privateKeys) {
        const account = web3.eth.accounts.privateKeyToAccount(privateKey);
        web3.eth.accounts.wallet.add(account);

        try {
            const nonce = await web3.eth.getTransactionCount(account.address, 'latest');
            const gasPrice = await web3.eth.getGasPrice();
            const amount = web3.utils.toBN(web3.utils.toWei(AMOUNT_TO_SEND, 'ether'))
                .div(web3.utils.toBN(10).pow(web3.utils.toBN(18 - DECIMALS)));

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
            console.log(`✅ ${account.address} -> ${destinationAddress} | TX: ${receipt.transactionHash}`);
        } catch (err) {
            console.error(`❌ ${account.address} gagal: ${err.message}`);
        }
    }
}

sendTokens();