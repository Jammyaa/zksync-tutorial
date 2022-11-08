// 1. Create a provider that allows your application to communicate with zkSync
async function getZkSyncProvider (zksync, networkName) {
    let zkSyncProvider
    try {
      zkSyncProvider = await zksync.getDefaultProvider(networkName)
    } catch (error) {
      console.log('Unable to connect to zkSync.')
      console.log(error)
    }
    return zkSyncProvider
}

// 2. Create a provider that allows your application to communicate with Ethereum
async function getEthereumProvider (ethers,networkName) {
    let ethersProvider
    try {
        // eslint-disavle-next-line new-cap
        ethersProvider = new ethers.getDefaultProvider(networkName)
    } catch (error) {
        console.log('Could not connect to Goerli')
        console.log(error)
    }
    return ethersProvider
}

// 3. Create a new zkSync account
async function initAccount (goerliWallet, zkSyncProvider, zksync) {
  const zkSyncWallet = await zksync.Wallet.fromEthSigner(goerliWallet, zkSyncProvider)
  return zkSyncWallet
}

// 4. Authorize your zkSync signing key
async function registerAccount (wallet) {
  console.log(`Registering the ${wallet.address()} account on zkSync`)
  if (!await wallet.isSigningKeySet()) {
    if (await wallet.getAccountId() === undefined) {
      throw new Error('Unknown account')
    }
    const changePubkey = await wallet.setSigningKey()
    await changePubkey.awaitReceipt()
  }
}

// 5. Deposit assets to zkSync
async function depositToZkSync (zkSyncWallet, token, amountToDeposit, ethers) {
  const deposit = await zkSyncWallet.depositToSyncFromEthereum({
    depositTo: zkSyncWallet.address(),
    token: token,
    amount: ethers.utils.parseEther(amountToDeposit)
  })
  try {
    await deposit.awaitReceipt()
  } catch (error) {
    console.log('Error while awaiting confirmation from the zkSync operators.')
    console.log(error)
  }
}

// 6. Transfer assets on zkSync
async function transfer (from, toAddress, amountToTransfer, transferFee, token, zksync, ethers) {
  const closestPackableAmount = zksync.utils.closestPackableTransactionAmount(ethers.utils.parseEther(amountToTransfer))
  const closestPackableFee = zksync.utils.closestPackableTransactionFee(ethers.utils.parseEther(transferFee))
  const transfer = await from.syncTransfer({
    to: toAddress,
    token: token,
    amount: closestPackableAmount,
    fee: closestPackableFee
  })
  const transferReceipt = await transfer.awaitReceipt()
  console.log('Got transfer receipt.')
  console.log(transferReceipt)
}

// 7. Calculate the fee for a specific transaction
async function getFee (transactionType, address, token, zkSyncProvider, ethers) {
  const feeInWei = await zkSyncProvider.getTransactionFee(transactionType, address, token)
  return ethers.utils.formatEther(feeInWei.totalFee.toString())
}

// 8. Withdraw assets to Ethereum
async function withdrawToEthereum (wallet, amountToWithdraw, withdrawalFee, token, zksync, ethers) {
  const closestPackableAmount = zksync.utils.closestPackableTransactionAmount(ethers.utils.parseEther(amountToWithdraw))
  const closestPackableFee = zksync.utils.closestPackableTransactionFee(ethers.utils.parseEther(withdrawalFee))
  const withdraw = await wallet.withdrawFromSyncToEthereum({
    ethAddress: wallet.address(),
    token: token,
    amount: closestPackableAmount,
    fee: closestPackableFee
  })
  await withdraw.awaitVerifyReceipt()
  console.log('ZKP verification is complete')
}

// 9. See our balance on zkSync
async function displayZkSyncBalance (wallet, ethers) {
  const state = await wallet.getAccountState()
  if (state.committed.balances.ETH) {
    console.log(`Committed ETH balance for ${wallet.address()}: ${ethers.utils.formatEther(state.committed.balances.ETH)}`)
  } else {
    console.log(`Committed ETH balance for ${wallet.address()}: 0`)
  }
  if (state.verified.balances.ETH) {
    console.log(`Verified ETH balance for ${wallet.address()}: ${ethers.utils.formatEther(state.verified.balances.ETH)}`)
  } else {
    console.log(`Verified ETH balance for ${wallet.address()}: 0`)
  }
}

module.exports = {
  getZkSyncProvider,
  getEthereumProvider,
  depositToZkSync,
  registerAccount,
  displayZkSyncBalance,
  transfer,
  withdrawToEthereum,
  getFee,
  initAccount
}