const mongoose = require("mongoose");
const Product = require("./models/Product");

mongoose.connect("mongodb://localhost:27017")
  .then(() => {
    console.log("Connected to MongoDB");
    return Product.insertMany([
      {
        name: "Wireless Headphones",
        price: 1499,
        description: "High-quality over-ear wireless headphones.",
        stock: 25
      },
      {
        name: "Bluetooth Speaker",
        price: 999,
        description: "Portable speaker with powerful bass.",
        stock: 15
      },
      {
        name: "Smart Watch",
        price: 2499,
        description: "Track your fitness with this stylish smart watch.",
        stock: 30
      },
      {
        name: "Gaming Mouse",
        price: 699,
        description: "Precision mouse for smooth gaming performance.",
        stock: 40
      }
    ]);
  })
  .then(() => {
    console.log("Sample products inserted!");
    mongoose.disconnect();
  })
  .catch((err) => {
    console.error("Error seeding products:", err);
    mongoose.disconnect();
  });
