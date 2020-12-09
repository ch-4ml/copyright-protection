'use strict';

const { resolveSoa } = require('dns');
const express = require('express');
const router = express.Router();

const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

const ccpPath = path.resolve(__dirname, '..', '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org2.example.com', 'connection-org2.json');
const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

/* Copyrights */
router.get('/copyrights', async (req, res) => {
  try {
    const result = await callChaincode('queryAllCopyrights')
    console.log(result);
    res.json(JSON.parse(result));
  } catch(err) {
    res.status(400).send();
  }
});

router.get('/copyrights/:copyrightNo', async (req, res) => {
  try {
    const result = await callChaincode('queryCopyright', req.params.copyrightNo);
    res.json(JSON.parse(result));
  } catch(err) {
    res.status(400).send();
  }
});

router.get('/copyrights/authors/:author', async (req, res) => {
  try {
    const result = await callChaincode('queryCopyrightsByAuthor', req.params.author);
    res.json(JSON.parse(result));
  } catch(err) {
    res.status(400).send();
  }
});

router.post('/copyrights', async (req, res) => {
  const args = [ req.body.copyrightNo, req.body.title, req.body.contentType, req.body.author ];
  await callChaincode('registCopyright', ...args);
  res.json({ msg: '저작권이 성공적으로 등록되었습니다.' });
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
    const network = await gateway.getNetwork('mychannel');

    // Get the contract from the network.
    const contract = network.getContract('cpcc1');
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
    console.error(`Failed to create transaction: ${err}`);
    return { msg: `Error occurred: ${err}`, ok: false };
  }
}

module.exports = router;
