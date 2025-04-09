const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const authenticateUser = require("./middleware/authMiddleware");
const Product = require("./models/Product");
const User = require("./models/User");
const Cart = require("./models/Cart");

const app = express();
app.use(express.json());

// MongoDB connection
mongoose.connect("mongodb://localhost:27017")
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// JWT Secret
const SECRET_KEY = "shoppyglobe_secret_key";
// --- API ROUTES --- //

// Home
app.get("/", (req, res) => {
  res.send("ShoppyGlobe API running");
});

// ===============================
//        Product Routes
// ===============================

// Get all products
app.get("/products", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// Get single product by ID
app.get("/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

app.get("/cart", authenticateUser, async (req, res) => {
  const userId = req.user.userId;

  try {
    const cart = await Cart.findOne({ userId }).populate("items.productId", "name price");

    if (!cart) {
      return res.status(404).json({ error: "Cart is empty or not found" });
    }

    res.json({ cart });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch cart" });
  }
});



// ===============================
//        User Auth Routes
// ===============================

// Register
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ error: "Username and password are required" });

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ error: "Username already exists" });

    const user = new User({ username, password }); // not hashing because we're avoiding bcryptjs
    await user.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ error: "Registration failed" });
  }
});

// Login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ error: "Username and password are required" });

  try {
    const user = await User.findOne({ username });
    if (!user || user.password !== password)
      return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ userId: user._id }, SECRET_KEY, { expiresIn: "1h" });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

// Middleware to protect routes
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Token missing" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};


// ===============================
//          Cart Routes
// ===============================

// Add to cart
app.post("/cart", authenticateUser, async (req, res) => {
  const { productId, quantity } = req.body;
  const userId = req.user.userId;

  try {
    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({ userId, items: [{ productId, quantity }] });
    } else {
      const existingItem = cart.items.find(item => item.productId.toString() === productId);
      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        cart.items.push({ productId, quantity });
      }
    }

    await cart.save();
    res.json({ message: "Product added to cart", cart });
  } catch (err) {
    res.status(500).json({ error: "Failed to add to cart" });
  }
});


// Update cart quantity
app.put("/cart/:productId", authenticateUser, async (req, res) => {
  const userId = req.user.userId;
  const { productId } = req.params;
  const { quantity } = req.body;

  try {
    const cart = await Cart.findOne({ userId });

    if (!cart) return res.status(404).json({ error: "Cart not found" });

    const item = cart.items.find(item => item.productId.toString() === productId);
    if (!item) return res.status(404).json({ error: "Product not in cart" });

    item.quantity = quantity;
    await cart.save();
    res.json({ message: "Cart updated", cart });
  } catch (err) {
    res.status(500).json({ error: "Update failed" });
  }
});


// Delete cart item
app.delete("/cart/:productId", authenticateUser, async (req, res) => {
  const userId = req.user.userId;
  const { productId } = req.params;

  try {
    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ error: "Cart not found" });

    cart.items = cart.items.filter(item => item.productId.toString() !== productId);
    await cart.save();

    res.json({ message: "Item removed", cart });
  } catch (err) {
    res.status(500).json({ error: "Remove failed" });
  }
});


// ===============================

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
