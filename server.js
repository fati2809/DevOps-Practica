const app = require('./src/app');
const PORT = process.env.PORT || 3000;

// Levanta el servidor Express
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Exporta el server por si quieres usarlo en tests
module.exports = server;
