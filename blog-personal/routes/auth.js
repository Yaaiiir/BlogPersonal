const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const router = express.Router();

router.get('/registro', (req, res) => res.render('register'));
router.post('/registro', async (req, res) => {
  const { email, username, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  db.query('INSERT INTO usuarios (email, username, password) VALUES (?, ?, ?)', 
    [email, username, hash], (err) => {
    if (err) return res.send('Error al registrar');
    res.redirect('/login');
  });
});

router.get('/login', (req, res) => res.render('login'));
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  db.query('SELECT * FROM usuarios WHERE email = ?', [email], async (err, results) => {
    if (results.length === 0) return res.send('Usuario no encontrado');
    const valid = await bcrypt.compare(password, results[0].password);
    if (valid) {
      req.session.user = results[0];
      res.redirect('/');
    } else {
      res.send('Contraseña incorrecta');
    }
  });
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;