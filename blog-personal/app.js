const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const app = express();

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: 'blog_secreto',
  resave: false,
  saveUninitialized: true
}));

app.use('/', authRoutes);
app.use('/posts', postRoutes);

app.get('/', (req, res) => {
  res.render('index', { user: req.session.user });
});

app.listen(3000, () => {
  console.log('🌐 Servidor en http://localhost:3000');
});