import { Wallet } from '@coral-xyz/anchor';
import { TokenInfo } from '@solana/spl-token-registry';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import fs from 'fs';
import AmmImpl from '../amm';

function loadKeypairFromFile(filename: string): Keypair {
  const secret = JSON.parse(fs.readFileSync(filename).toString()) as number[];
  const secretKey = Uint8Array.from(secret);
  return Keypair.fromSecretKey(secretKey);
}

const connection = new Connection('https://api.devnet.solana.com');
const payerKP = loadKeypairFromFile('~/.config/solana/id.json');
const payerWallet = new Wallet(payerKP);
console.log('payer %s', payerKP.publicKey);

async function createPool(
  tokenAInfo: TokenInfo,
  tokenBInfo: TokenInfo,
  tokenAAmount: BN,
  tokenBAmount: BN,
  config: PublicKey,
  payer: Keypair,
) {
  const transactions = await AmmImpl.createPermissionlessConstantProductPoolWithConfig(
    connection,
    payer.publicKey,
    tokenAInfo,
    tokenBInfo,
    tokenAAmount,
    tokenBAmount,
    config,
  );

  for (const transaction of transactions) {
    transaction.sign(payer);
    const txHash = await connection.sendRawTransaction(transaction.serialize());
    await connection.confirmTransaction(txHash, 'finalized');
    console.log('Transaction %s', txHash);
  }
}

async function main() {
  let tokenAInfo = {
    chainId: 101,
    address: 'BjhBG7jkHYMBMos2HtRdFrw8rvSguBe5c3a3EJYXhyUf',
    symbol: 'TA',
    decimals: 6,
    name: 'TokenATest',
    logoURI: '',
  };
  let tokenBInfo = {
    chainId: 101,
    address: '9KMeJp868Pdk8PrJEkwoAHMA1ctdxfVhe2TjeS4BcWjs',
    symbol: 'TB',
    decimals: 6,
    name: 'TokenBTest',
    logoURI: '',
  };

  // Retrieve config accounts where authorized pool creator key is the payerKP
  const configs = await AmmImpl.getPoolConfigsWithPoolCreatorAuthority(connection, payerWallet.publicKey);

  // Select config which the fees fit your requirement. Please contact meteora team if you're not whitelisted.
  const config = configs[0];

  // Create pool and deposit
  const tokenADepositAmount = new BN(1000000);
  const tokenBDepositAmount = new BN(1000000);

  // Create pool
  await createPool(
    tokenAInfo,
    tokenBInfo,
    tokenADepositAmount,
    tokenBDepositAmount,
    config.publicKey,
    payerWallet.payer,
  );
}

main();
