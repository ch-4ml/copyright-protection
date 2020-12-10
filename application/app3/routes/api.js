'use strict';

const express = require('express');
const router = express.Router();

const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

const ccpPath = path.resolve(__dirname, '..', '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

/* Reports */
// 신고 내역 전체 조회
router.get('/reports', async (req, res) => {
  const result = await callChaincode('queryAllReports');
  res.json(JSON.parse(result));
});

// 신고 내역 조회
router.get('/reports/:reportNo', async (req, res) => {
  const reportNo = req.params.reportNo;
  try {
    const result = await callChaincode('queryReport', reportNo);
    res.json(JSON.parse(result));
  } catch(err) {
    res.status(400).send(null);
  }
});

// 수사 상태 변경
router.put('/reports', async(req, res) => {
  const { reportID, status } = req.body;
  const reportNo = reportID.replace('report', '');
  try {
    await callChaincode('changeReportStatus', reportNo, status);
    res.status(200).send({ msg: '수사 상태 변경이 완료되었습니다.', data: status });
  } catch(err) {
    console.log(err);
    res.status(400).send(null);
  }
});

async function callChaincode(fnName, ...args) {
  try {
    // Create a new file system based wallet for managing identities.
    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);

    // Check to see if we've already enrolled the user.
    const identity = await wallet.get('appUser');
    if (!identity) {
        console.log('An identity for the user "appUser" does not exist in the wallet');
        console.log('Run the registerUser.js application before retrying');
        return;
    }

    // Create a new gateway for connecting to our peer node.
    const gateway = new Gateway();
    await gateway.connect(ccp, { wallet, identity: 'appUser', discovery: {enabled: true, asLocalhost: true } });

    // Get the network (channel) our contract is deployed to.
    const network = await gateway.getNetwork('mychannel2');

    // Get the contract from the network.
    const contract = network.getContract('cpcc2');
    const isSubmit = fnName.indexOf('query') === -1 ? true : false;
    let result;
    if(isSubmit) {
      await contract.submitTransaction(fnName, ...args);
      result = 'Transaction has been submitted.';
      console.log('Transaction has been submitted.');
    } else {
      result = await contract.evaluateTransaction(fnName, ...args);
      console.log(`Transaction has been evaluated. result: ${result.toString()}`);
    }
    return result;
  } catch(err) {
    console.error(`Failed to create transaction: ${err}`);
    return { msg: `Error occurred: ${err}`};
  }
}



module.exports = router;
