const fs = require('fs');
const Web3 = require('web3');
const bip39 = require('bip39');
const hdkey = require('ethereumjs-wallet').hdkey;

// === Konfigurasi ===
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

async function checkBalances() {
  if (fs.existsSync(logFile)) fs.unlinkSync(logFile);

  const mnemonicList = fs.readFileSync('mnemonic.txt', 'utf-8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const decimals = BigInt(await contract.methods.decimals().call());

  let totalVerse = 0n;
  let totalMatic = 0n;
  const eligAddresses = [];
  const eligMnemonics = []; // Ubah dari privateKeys ke mnemonics

  for (const [index, mnemonic] of mnemonicList.entries()) {
    if (!bip39.validateMnemonic(mnemonic)) {
      console.error(`❌ Mnemonic ke-${index + 1} tidak valid.`);
      continue;
    }

    console.log(`✅ Mnemonic ke-${index + 1} valid.`);

    try {
      const seed = await bip39.mnemonicToSeed(mnemonic);
      const hdWallet = hdkey.fromMasterSeed(seed);
      const path = `m/44'/60'/0'/0/0`;  // hanya 1 wallet per mnemonic
      const wallet = hdWallet.derivePath(path).getWallet();
      const address = '0x' + wallet.getAddress().toString('hex');

      const [verseRaw, maticRaw] = await Promise.all([
        contract.methods.balanceOf(address).call(),
        web3.eth.getBalance(address)
      ]);

      const verseBig = BigInt(verseRaw);
      const maticBig = BigInt(maticRaw);

      const verseFloat = Number(verseBig) / Number(10n ** decimals);
      const maticFloat = web3.utils.fromWei(maticBig.toString(), 'ether');

      log(`🔑 Wallet Mnemonic #${index + 1} - ${address}`);
      log(`   💰 VERSE: ${verseFloat}`);
      log(`   💎 MATIC: ${maticFloat}`);
      log('--------------------------');

      totalVerse += verseBig;
      totalMatic += maticBig;

      if (verseBig > 0n) {
        eligAddresses.push(address);
        eligMnemonics.push(mnemonic); // Simpan mnemonic bukan private key
      }

    } catch (err) {
      log(`❌ Error di mnemonic ke-${index + 1}: ${err.message}`);
    }
  }

  const totalVerseDisplay = Number(totalVerse) / Number(10n ** decimals);
  const totalMaticDisplay = web3.utils.fromWei(totalMatic.toString(), 'ether');

  log(`\n🎯 TOTAL VERSE: ${totalVerseDisplay}`);
  log(`🎯 TOTAL MATIC: ${totalMaticDisplay}`);

  fs.writeFileSync('elig.txt', eligAddresses.join('\n'), 'utf-8');
  fs.writeFileSync('sender.txt', eligMnemonics.join('\n'), 'utf-8'); // Simpan mnemonics

  log(`📄 ${eligAddresses.length} alamat ditulis ke elig.txt`);
  log(`🔐 ${eligMnemonics.length} mnemonic ditulis ke sender.txt`); // Update log message
}

checkBalances();