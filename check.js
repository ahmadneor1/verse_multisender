const Web3 = require('web3');
const fs = require('fs');

// Baca private keys dari file
const privateKeys = fs.readFileSync('sender.txt', 'utf-8').split('\n').filter(Boolean);

// RPC URL Polygon
const RPC_URL = 'https://polygon-rpc.com';
const web3 = new Web3(RPC_URL);

// Alamat smart contract VERSE
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
    stateMutability: "view",
    type: "function"
  }
];

const contract = new web3.eth.Contract(tokenABI, tokenAddress);

async function checkBalances() {
  const decimals = BigInt(await contract.methods.decimals().call());

  let totalVerseBalance = BigInt(0);
  let totalMaticBalance = BigInt(0);

  let accountNumber = 1;  // Penanda untuk nomor urut

  const addressesWithBalance = []; // Array untuk menyimpan alamat dengan saldo VERSE > 0

  for (const pk of privateKeys) {
    try {
      const account = web3.eth.accounts.privateKeyToAccount(pk.trim());
      const address = account.address;

      // Balance token VERSE
      const verseBalanceRaw = await contract.methods.balanceOf(address).call();
      const verseBalanceBigInt = BigInt(verseBalanceRaw);

      // Balance native MATIC
      const maticBalanceRaw = await web3.eth.getBalance(address);
      const maticBalanceBigInt = BigInt(maticBalanceRaw);

      console.log(`🔑 Wallet ${accountNumber} dari Alamat: ${address}`);
      console.log(`💰 VERSE (raw): ${verseBalanceBigInt.toString()} (smallest unit)`);
      console.log(`💎 MATIC (raw): ${maticBalanceBigInt.toString()} (wei)`);

      // Normalisasi ke jumlah yang lebih terbaca (menggunakan BigInt untuk pembagian)
      const verseBalanceNormal = Number(verseBalanceBigInt) / Number(10n ** decimals);
      const maticBalanceNormal = web3.utils.fromWei(maticBalanceBigInt.toString(), 'ether');

      console.log(`💰 Balance VERSE: ${verseBalanceNormal} VERSE`);
      console.log(`💎 Balance MATIC: ${maticBalanceNormal} MATIC`);
      console.log('------------------------');

      // Menambahkan total balance
      totalVerseBalance += verseBalanceBigInt;
      totalMaticBalance += maticBalanceBigInt;

      // Menyimpan alamat dengan saldo VERSE lebih dari 0
      if (verseBalanceBigInt > 0) {
        addressesWithBalance.push(address);
      }

      // Increment penanda nomor akun
      accountNumber++;
    } catch (error) {
      console.error(`❌ Error untuk private key ${pk.slice(0, 10)}...:`, error.message);
    }
  }

  // Menghitung total balance (menggunakan BigInt untuk pembagian)
  const totalVerseNormal = totalVerseBalance / (10n ** decimals);
  const totalMaticNormal = web3.utils.fromWei(totalMaticBalance.toString(), 'ether');

  console.log(`\n🎯 Total VERSE dari semua wallet: ${totalVerseNormal.toString()} VERSE`);
  console.log(`🎯 Total MATIC dari semua wallet: ${totalMaticNormal.toString()} MATIC`);

  // Menyimpan alamat yang memiliki saldo VERSE > 0 ke file baru
  if (addressesWithBalance.length > 0) {
    fs.writeFileSync('elig.txt', addressesWithBalance.join('\n'), 'utf-8');
    console.log('📄 Alamat dengan saldo VERSE lebih dari 0 telah disimpan di file elig.txt');
  } else {
    console.log('📄 Tidak ada alamat dengan saldo VERSE lebih dari 0.');
  }
}

checkBalances();
