const express = require('express');

const app = express();
app.use(express.json());

// Endpoint health
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Endpoint items
app.get('/items', (req, res) => {
  const inventory = [
    { id: 1, name: 'Laptop', stock: 5 },
    { id: 2, name: 'Mouse', stock: 10 }
  ];

  res.status(200).json(inventory);
});

module.exports = app;
