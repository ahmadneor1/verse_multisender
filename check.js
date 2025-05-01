const Web3 = require('web3');
const fs = require('fs');

// Setup Web3 dan kontrak
const RPC_URL = 'https://polygon-rpc.com';
const web3 = new Web3(RPC_URL);

const tokenAddress = '0xc708d6f2153933daa50b2d0758955be0a93a8fec';
const tokenABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function"
  },
  {
    constant: true,
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function",
    inputs: [],
    payable: false,
    stateMutability: "view"
  }
];
const contract = new web3.eth.Contract(tokenABI, tokenAddress);

// Logging
const logFile = 'log.txt';
function log(msg) {
  fs.appendFileSync(logFile, msg + '\n');
  console.log(msg);
}

// Fungsi utama
async function checkBalances() {
  // Reset log dan file output
  if (fs.existsSync(logFile)) fs.unlinkSync(logFile);

  const privateKeys = fs.readFileSync('privkey.txt', 'utf-8').split('\n').map(x => x.trim()).filter(Boolean);
  if (privateKeys.length === 0) return log('❌ Tidak ada private key yang valid.');

  const decimals = BigInt(await contract.methods.decimals().call());

  let totalVerse = 0n;
  let totalMatic = 0n;
  const eligAddresses = [];
  const eligPrivateKeys = [];
  let walletNo = 1;

  for (const pk of privateKeys) {
    if (!/^0x[a-fA-F0-9]{64}$/.test(pk)) {
      log(`⚠️ Private key tidak valid: ${pk}`);
      continue;
    }

    try {
      const account = web3.eth.accounts.privateKeyToAccount(pk);
      const address = account.address;

      const [verseRaw, maticRaw] = await Promise.all([
        contract.methods.balanceOf(address).call(),
        web3.eth.getBalance(address)
      ]);

      const verseBig = BigInt(verseRaw);
      const maticBig = BigInt(maticRaw);

      const verseFloat = Number(verseBig) / Number(10n ** decimals);
      const maticFloat = web3.utils.fromWei(maticBig.toString(), 'ether');

      log(`🔑 Wallet ${walletNo} - ${address}`);
      log(`   💰 VERSE: ${verseFloat}`);
      log(`   💎 MATIC: ${maticFloat}`);
      log('--------------------------');

      totalVerse += verseBig;
      totalMatic += maticBig;

      if (verseBig > 0n) {
        eligAddresses.push(address);
        eligPrivateKeys.push(pk);
      }

      walletNo++;
    } catch (e) {
      log(`❌ Error wallet ${walletNo} (${pk.slice(0, 10)}...): ${e.message}`);
    }
  }

  const totalVerseDisplay = Number(totalVerse) / Number(10n ** decimals);
  const totalMaticDisplay = web3.utils.fromWei(totalMatic.toString(), 'ether');

  log(`\n🎯 TOTAL VERSE: ${totalVerseDisplay}`);
  log(`🎯 TOTAL MATIC: ${totalMaticDisplay}`);

  // Tulis ulang file output dengan data terbaru (bersih dari yang saldo 0)
  fs.writeFileSync('elig.txt', eligAddresses.join('\n'), 'utf-8');
  fs.writeFileSync('sender.txt', eligPrivateKeys.join('\n'), 'utf-8');

  log(`📄 ${eligAddresses.length} alamat ditulis ke elig.txt`);
  log(`🔐 ${eligPrivateKeys.length} private key ditulis ke sender.txt`);
}

checkBalances();
