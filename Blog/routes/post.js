const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/nuevo', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('nuevo-post');
});

router.post('/nuevo', (req, res) => {
  const { titulo, contenido } = req.body;
  const userId = req.session.user.id;
  db.query('INSERT INTO posts (titulo, contenido, autor_id) VALUES (?, ?, ?)', 
    [titulo, contenido, userId], (err) => {
    if (err) return res.send('Error al publicar');
    res.redirect('/');
  });
});

module.exports = router;
