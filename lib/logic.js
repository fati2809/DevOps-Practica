const calculateValue = (price, stock) => {
  if (price < 0 || stock < 0) return 0;
  return price * stock;
};

module.exports = { calculateValue };
