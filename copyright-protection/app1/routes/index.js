const express = require('express');
const router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Fabcar tutorials!', account: req.session.account });
});

// Log in
router.post('/login', async (req, res) => {
  try {
    if(req.body.id !== 'admin' || req.body.pw !== '1234') {
      res.status(400).send({ 
        msg: 'Invalid login information. Please check your accounts.',
        ok: false,
      });
      return;
    }
      
    req.session.account = 'admin';

    req.session.save(err => {  // 세션 저장
      res.status(200).send({ msg: 'Login successful.', ok: true });
    });
  } catch(err) {
    console.log(err);
    res.status(500).send();
  }
});

router.get('/logout', (req, res) => {
  delete req.session.account;
  req.session.save(() => {
    res.redirect('/');
  });
});

module.exports = router;
