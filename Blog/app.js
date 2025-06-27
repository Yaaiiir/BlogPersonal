// ===============================
// 🛡️ Seguridad y dependencias
// ===============================
const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const db = require('./models/db'); // Conexión a MySQL

const app = express();

// Middleware de Content Security Policy (CSP)
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "script-src 'self';"
  );
  next();
});

// ===============================
// ⚙️ Configuración del servidor
// ===============================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    secret: 'secreto123', // cambia en producción
    resave: false,
    saveUninitialized: true,
  })
);

// ===============================
// 🌐 Rutas principales
// ===============================

// Página principal - lista posts
app.get('/', (req, res) => {
  const query = `
    SELECT posts.id, posts.titulo, posts.contenido, posts.creado_en AS fecha,
           usuarios.username AS autor_nombre
    FROM posts
    INNER JOIN usuarios ON posts.autor_id = usuarios.id
    ORDER BY posts.creado_en DESC
  `;
  db.query(query, (err, results) => {
    if (err) {
      console.error('❌ Error al obtener publicaciones:', err);
      return res.status(500).send('Error interno del servidor');
    }
    const posts = results;
    const user = req.session.user || null;
    res.render('index', { posts, user });
  });
});

// Mostrar todos los posts
app.get('/posts', (req, res) => {
  const query = `
    SELECT posts.id, posts.titulo, posts.contenido, posts.creado_en AS fecha,
           usuarios.username AS autor_nombre
    FROM posts
    INNER JOIN usuarios ON posts.autor_id = usuarios.id
    ORDER BY posts.creado_en DESC
  `;
  db.query(query, (err, results) => {
    if (err) {
      console.error('❌ Error al obtener publicaciones:', err);
      return res.status(500).send('Error interno del servidor');
    }
    const posts = results;
    const user = req.session.user || null;
    res.render('posts', { posts, user });
  });
});

// ===============================
// 🆕 Nuevo post - Mostrar formulario
// ===============================
app.get('/posts/nuevo', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  res.render('posts/nuevo', { error: null, titulo: '', contenido: '', user: req.session.user });
});

// ===============================
// 🆕 Nuevo post - Procesar formulario
// ===============================
app.post('/posts/nuevo', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  const { titulo, contenido } = req.body;

  if (!titulo || !contenido) {
    return res.render('posts/nuevo', {
      error: 'Por favor completa todos los campos.',
      titulo,
      contenido,
      user: req.session.user,
    });
  }

  const insertQuery = `
    INSERT INTO posts (titulo, contenido, autor_id, creado_en)
    VALUES (?, ?, ?, NOW())
  `;
  db.query(insertQuery, [titulo, contenido, req.session.user.id], (err) => {
    if (err) {
      console.error('Error al insertar post:', err);
      return res.render('posts/nuevo', {
        error: 'Error al publicar. Intenta más tarde.',
        titulo,
        contenido,
        user: req.session.user,
      });
    }
    res.redirect('/posts');
  });
});

// ===============================
// 🔎 Ver post individual con comentarios y botones editar/borrar
// ===============================
app.get('/posts/:id', (req, res) => {
  const postId = req.params.id;

  const postQuery = `
    SELECT posts.id, posts.titulo, posts.contenido, posts.creado_en AS fecha,
           usuarios.username AS autor_nombre, posts.autor_id
    FROM posts
    INNER JOIN usuarios ON posts.autor_id = usuarios.id
    WHERE posts.id = ?
  `;

  const commentsQuery = `
    SELECT comentarios.id, comentarios.contenido, comentarios.creado_en AS fecha,
           usuarios.username AS autor_nombre
    FROM comentarios
    INNER JOIN usuarios ON comentarios.autor_id = usuarios.id
    WHERE comentarios.post_id = ?
    ORDER BY comentarios.creado_en ASC
  `;

  db.query(postQuery, [postId], (err, postResults) => {
    if (err) {
      console.error('Error al obtener el post:', err);
      return res.status(500).send('Error interno del servidor');
    }
    if (postResults.length === 0) {
      return res.status(404).send('Post no encontrado');
    }
    const post = postResults[0];

    db.query(commentsQuery, [postId], (err2, commentsResults) => {
      if (err2) {
        console.error('Error al obtener comentarios:', err2);
        return res.status(500).send('Error interno del servidor');
      }
      const user = req.session.user || null;
      res.render('post', {
        post,
        comments: commentsResults,
        user,
        error: null,
      });
    });
  });
});

// ===============================
// 📝 Agregar comentario a post
// ===============================
app.post('/posts/:id/comentarios', (req, res) => {
  if (!req.session.user) {
    return res.status(401).send('Debes estar autenticado para comentar');
  }

  const postId = req.params.id;
  const { contenido } = req.body;
  const autorId = req.session.user.id;

  if (!contenido || contenido.trim() === '') {
    return res.redirect(`/posts/${postId}`);
  }

  const insertCommentQuery = `
    INSERT INTO comentarios (post_id, autor_id, contenido, creado_en)
    VALUES (?, ?, ?, NOW())
  `;

  db.query(insertCommentQuery, [postId, autorId, contenido], (err) => {
    if (err) {
      console.error('Error al insertar comentario:', err);
      return res.status(500).send('Error interno del servidor');
    }
    res.redirect(`/posts/${postId}`);
  });
});

// ===============================
// ✏️ Editar post - mostrar formulario
// ===============================
app.get('/posts/:id/editar', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  const postId = req.params.id;

  const query = `SELECT * FROM posts WHERE id = ? AND autor_id = ?`;

  db.query(query, [postId, req.session.user.id], (err, results) => {
    if (err) {
      console.error('Error al buscar post:', err);
      return res.status(500).send('Error interno del servidor');
    }
    if (results.length === 0) {
      return res.status(403).send('No autorizado para editar este post');
    }
    const post = results[0];
    res.render('posts/editar', {
      post,
      error: null,
      user: req.session.user,
    });
  });
});

// ===============================
// ✏️ Editar post - procesar formulario
// ===============================
app.post('/posts/:id/editar', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  const postId = req.params.id;
  const { titulo, contenido } = req.body;

  if (!titulo || !contenido) {
    return res.render('posts/editar', {
      error: 'Por favor completa todos los campos.',
      post: { id: postId, titulo, contenido },
      user: req.session.user,
    });
  }

  const updateQuery = `
    UPDATE posts SET titulo = ?, contenido = ? WHERE id = ? AND autor_id = ?
  `;
  db.query(updateQuery, [titulo, contenido, postId, req.session.user.id], (err, results) => {
    if (err) {
      console.error('Error al actualizar post:', err);
      return res.render('posts/editar', {
        error: 'Error al actualizar el post. Intenta más tarde.',
        post: { id: postId, titulo, contenido },
        user: req.session.user,
      });
    }
    if (results.affectedRows === 0) {
      return res.status(403).send('No autorizado para editar este post');
    }
    res.redirect(`/posts/${postId}`);
  });
});

// ===============================
// 🗑️ Eliminar post
// ===============================
app.post('/posts/:id/eliminar', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  const postId = req.params.id;

  const deleteQuery = `DELETE FROM posts WHERE id = ? AND autor_id = ?`;

  db.query(deleteQuery, [postId, req.session.user.id], (err, results) => {
    if (err) {
      console.error('Error al eliminar post:', err);
      return res.status(500).send('Error interno del servidor');
    }
    if (results.affectedRows === 0) {
      return res.status(403).send('No autorizado para eliminar este post');
    }
    res.redirect('/posts');
  });
});

// ===============================
// 🔐 Login
// ===============================
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const query = 'SELECT * FROM usuarios WHERE email = ?';
  db.query(query, [email], async (err, results) => {
    if (err) {
      console.error('Error en login:', err);
      return res.render('login', { error: 'Error en el servidor. Intenta más tarde.' });
    }
    if (results.length === 0) {
      return res.render('login', { error: 'Correo no registrado.' });
    }
    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render('login', { error: 'Contraseña incorrecta.' });
    }
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
    };
    res.redirect('/');
  });
});

// ===============================
// 📝 Registro
// ===============================
app.get('/register', (req, res) => {
  res.render('register', { error: null, username: '', email: '' });
});

app.post('/register', async (req, res) => {
  const { username, email, password, confirmPassword } = req.body;
  if (!username || !email || !password || !confirmPassword) {
    return res.render('register', {
      error: 'Por favor completa todos los campos.',
      username,
      email,
    });
  }
  if (password !== confirmPassword) {
    return res.render('register', {
      error: 'Las contraseñas no coinciden.',
      username,
      email,
    });
  }
  const checkEmailQuery = 'SELECT * FROM usuarios WHERE email = ?';
  db.query(checkEmailQuery, [email], async (err, results) => {
    if (err) {
      console.error('Error en registro:', err);
      return res.render('register', { error: 'Error en el servidor. Intenta más tarde.', username, email });
    }
    if (results.length > 0) {
      return res.render('register', { error: 'El correo ya está registrado.', username, email });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const insertUserQuery = 'INSERT INTO usuarios (username, email, password) VALUES (?, ?, ?)';
    db.query(insertUserQuery, [username, email, hashedPassword], (err2) => {
      if (err2) {
        console.error('Error al insertar usuario:', err2);
        return res.render('register', { error: 'Error al registrar usuario. Intenta más tarde.', username, email });
      }
      res.redirect('/login');
    });
  });
});

// ===============================
// 🔍 Búsqueda de posts
// ===============================
app.get('/buscar', (req, res) => {
  const q = req.query.q;
  if (!q || q.trim() === '') {
    // Si no hay término de búsqueda, redirige a posts o muestra vacío
    return res.render('buscar', { posts: [], user: req.session.user || null, q: '' });
  }

  const sql = `
    SELECT posts.id, posts.titulo, posts.contenido, posts.creado_en AS fecha,
           usuarios.username AS autor_nombre
    FROM posts
    INNER JOIN usuarios ON posts.autor_id = usuarios.id
    WHERE posts.titulo LIKE ? OR posts.contenido LIKE ?
    ORDER BY posts.creado_en DESC
  `;
  const values = [`%${q}%`, `%${q}%`];
  db.query(sql, values, (err, results) => {
    if (err) {
      console.error('Error en la búsqueda:', err);
      return res.status(500).send('Error interno del servidor');
    }
    const user = req.session.user || null;
    res.render('buscar', { posts: results, user, q });
  });
});

// ===============================
// 🔓 Logout
// ===============================
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// ===============================
// 🚀 Iniciar servidor
// ===============================
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor funcionando en: http://localhost:${PORT}`);
});
