// Importamos el módulo mysql2
const mysql = require('mysql2');

// Creamos la conexión a la base de datos
const db = mysql.createConnection({
  host: 'localhost',     // XAMPP corre MySQL localmente
  user: 'root',          // Usuario por defecto en XAMPP
  password: '',          // Contraseña por defecto es vacía
  database: 'blog'       // Nombre de tu base de datos (asegúrate de que esté en minúsculas)
});

// Nos conectamos y comprobamos errores
db.connect((err) => {
  if (err) {
    console.error('❌ Error al conectar con MySQL:', err.message);
    return;
  }
  console.log('✅ Conectado a la base de datos MySQL (blog)');
});

// Exportamos la conexión para usarla en otras partes del proyecto
module.exports = db;
