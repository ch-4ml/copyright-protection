'use strict';

const express = require('express');
const router = express.Router();

const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

const ccpPath = path.resolve(__dirname, '..', '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

/* Reports */
// 신고 내역 전체 조회
router.get('/reports', async (req, res) => {
  const result = await callChaincode1('queryAllReports');
  res.json(JSON.parse(result));
});

// 신고 내역 조회
router.get('/reports/copyrights/:copyrightNo', async (req, res) => {
  const copyrightNo = req.params.copyrightNo;
  try {
    const result = await callChaincode1('queryReportsByCopyrightNo', copyrightNo);
    res.json(JSON.parse(result));
  } catch(err) {
    res.status(400).send(null);
  }
});

// 신고 내역 조회
router.get('/reports/:reportNo', async (req, res) => {
  const reportNo = req.params.reportNo;
  try {
    const result = await callChaincode1('queryReport', reportNo);
    res.json(JSON.parse(result));
  } catch(err) {
    res.status(400).send(null);
  }
});

// 신고 데이터 등록
router.post('/reports', async (req, res) => {
  const { reportNo, url, site, copyrightNo, pirate, email, form } = req.body;
  const date = moment().format('YYYY-MM-DD HH:mm');
  const similarity = (Math.random() * 100).toFixed(2);
  const isPirated = similarity > 70 ? 'True' : 'Pending'
  let args = [reportNo, url, site, copyrightNo, pirate,
              email, date, form, similarity, isPirated];
  console.log(args);
  try {
    await callChaincode1('createReport', ...args);
    if(isPirated === 'True') {
      const copyrightStr = await callChaincode1('queryCopyright', copyrightNo);
      console.log(`copyrightStr: ${copyrightStr}`);
      const copyright = JSON.parse(copyrightStr);
      console.log(copyright);
      args = [reportNo, url, site, copyright.title, copyright.contentType,
              copyright.author, pirate, email, date, form, similarity]
      await callChaincode2('createReport', ...args);
    }
    res.status(200).send({ msg: '신고가 정상적으로 접수되었습니다.' });
  } catch(err) {
    console.log(err);
    res.status(500).send({ msg: '신고가 접수되지 않았습니다.'});
  }
});

// 침해 여부 변경
router.put('/reports', async(req, res) => {
  const { reportID, url, site, copyrightID, pirate, reporterEmail, date, form, similarity, isPirated } = req.body;
  const reportNo = reportID.replace('report', '');
  const copyrightNo = copyrightID.replace('copyright', '');
  try {
    await callChaincode1('changeIsPirated', reportNo, isPirated);
    if(isPirated === 'True') {
      const copyrightStr = await callChaincode1('queryCopyright', copyrightNo);
      console.log(copyrightStr);
      const copyright = JSON.parse(copyrightStr);
      console.log(copyright);
      const args = [reportNo, url, site, copyright.title, copyright.contentType,
              copyright.author, pirate, reporterEmail, date, form, similarity]
      await callChaincode2('createReport', ...args);
    }
    res.status(200).send({ msg: '침해 여부 변경이 완료되었습니다.', data: isPirated });
  } catch(err) {
    console.log(err);
    res.status(400).send(null);
  }
});

function configCallChaincode (channel, ccName) {
  return async function callChaincode(fnName, ...args) {
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
      const network = await gateway.getNetwork(channel);
  
      // Get the contract from the network.
      const contract = network.getContract(ccName);
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
}

const callChaincode1 = configCallChaincode('mychannel', 'cpcc1');
const callChaincode2 = configCallChaincode('mychannel2', 'cpcc2');

module.exports = router;
