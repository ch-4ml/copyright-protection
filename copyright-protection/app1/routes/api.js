'use strict';

const express = require('express');
const router = express.Router();

const { FileSystemWallet, Gateway } = require('fabric-network');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

const ccpPath = path.resolve(__dirname, '..', '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
const ccp = JSON.parse(ccpJSON);

router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});


/* Reports */
router.get('/reports', async (req, res) => {
  const result = await callChaincode1('queryAllReports');
  res.json(JSON.parse(result));
});

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
  const reportNo = req.body.reportNo;
  const url = req.body.url;
  const site = req.body.site;
  const copyrightID = req.body.copyrightID;
  const pirate = req.body.pirate;
  const email = req.body.email;
  const date = moment().format('YYYY-MM-DD HH:mm');
  const form = req.body.form;
  const similarity = (Math.random() * 10000).toFixed(2);
  console.log(similarity);
  const ispirated = similarity > 70 ? 'True' : 'Pending'
  let args = [reportNo, url, site, copyrightID, pirate,
              email, date, form, similarity, ispirated];
  try {
    await callChaincode1('createReport', ...args);
    if(ispirated === 'True') {
      const copyrightStr = await callChaincode1('queryCopyright', copyrightID);  
      const copyright = JSON.stringify(copyrightStr);
      console.log(JSON.stringify(copyrightStr));
      console.log(copyright);
      args = [reportNo, url, site, copyright.title, copyright.contentType,
              copyright.author, pirate, email, date, form, similarity]
      await callChaincode2('createReport', ...args);
    }
    res.status(200).send({ msg: 'Transaction has been submitted.' });
  } catch(err) {
    console.log(err);
    res.status(500).send({ msg: 'Failed to submit transaction'});
  }
});

const configCallChaincode = (identity, channel, ccName) => {
  return async function callChaincode(fnName, ...args) {
    try {
      // Create a new file system based wallet for managing identities.
      const walletPath = path.join(process.cwd(), 'wallet');
      const wallet = new FileSystemWallet(walletPath);
      console.log(`Wallet path: ${walletPath}`);
  
      // Check to see if we've already enrolled the user.
      const userExists = await wallet.exists(identity);
      if (!userExists) {
          console.log('An identity for the user "appUser" does not exist in the wallet');
          console.log('Run the registerUser.js application before retrying');
          return;
      }
  
      // Create a new gateway for connecting to our peer node.
      const gateway = new Gateway();
      await gateway.connect(ccp, { wallet, identity: identity, discovery: { enabled: false } });
  
      // Get the network (channel) our contract is deployed to.
      const network = await gateway.getNetwork(channel);
  
      // Get the contract from the network.
      const contract = network.getContract(ccName);
  
      const isSubmit = fnName.indexOf('query') === -1 ? true : false;
      let result;
      
      if(isSubmit) {
        result = await contract.submitTransaction(fnName, ...args);
        console.log('Transaction has been submitted.');
      } else {
        result = await contract.evaluateTransaction(fnName, ...args);
        console.log(`Transaction has been evaluated. result: ${result.toString()}`);
      }
      return result;
  
    } catch(err) {
      console.error(`Failed to create transaction: ${error}`);
      return 'error occurred!!!';
    }
  }  
}

const callChaincode1 = configCallChaincode('appUser', 'mychannel', 'cpcc1');
const callChaincode2 = configCallChaincode('appUser2', 'mychannel2', 'cpcc2');

module.exports = router;
