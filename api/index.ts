import express from "express";
import cors from "cors";

const app = express();

app.use(express.json());
app.use(cors());

// Mock Database (In-Memory)
// Note: On Vercel (serverless), this in-memory database will reset frequently.
// A real database like Firestore or PostgreSQL is recommended for production.
const db = {
  users: [
    {
      id: "1",
      username: "admin",
      role: "admin",
      name: "Store Admin",
      password: "password",
    },
    {
      id: "2",
      username: "cashier1",
      role: "employee",
      name: "Jane Doe",
      password: "123",
    },
  ],
  products: [
    {
      id: "p1",
      name: "Coke 1L",
      price: 45.0,
      category: "Grocery",
      barcode: "123456789012",
    },
    {
      id: "p2",
      name: "Pancit Canton",
      price: 15.0,
      category: "Grocery",
      barcode: "987654321098",
    },
    {
      id: "p3",
      name: "Cabbage",
      price: 60.0,
      category: "Vegetables",
      barcode: "111122223333",
    },
    {
      id: "p4",
      name: "Bananacue",
      price: 15.0,
      category: "Bananacue",
      barcode: "444455556666",
    },
  ],
  transactions: [] as any[],
};

// --- API ROUTES ---

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const user = db.users.find(
    (u) => u.username === username && u.password === password,
  );
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  // Return user without password
  const { password: _, ...safeUser } = user;
  res.json({ user: safeUser });
});

// Users (Admin only)
app.get("/api/users", (req, res) => {
  // In a real app, verify admin token
  const safeUsers = db.users.map(({ password, ...u }) => u);
  res.json(safeUsers);
});

app.post("/api/users", (req, res) => {
  const newUser = { id: Date.now().toString(), ...req.body };
  db.users.push(newUser);
  const { password: _, ...safeUser } = newUser;
  res.json(safeUser);
});

app.delete("/api/users/:id", (req, res) => {
  db.users = db.users.filter((u) => u.id !== req.params.id);
  res.json({ success: true });
});

// Products
app.get("/api/products", (req, res) => {
  res.json(db.products);
});

app.post("/api/products", (req, res) => {
  const newProduct = { id: Date.now().toString(), ...req.body };
  db.products.push(newProduct);
  res.json(newProduct);
});

app.delete("/api/products/:id", (req, res) => {
  db.products = db.products.filter((p) => p.id !== req.params.id);
  res.json({ success: true });
});

// Transactions
app.post("/api/transactions", (req, res) => {
  const { employeeId, items, total } = req.body;
  const newTx = {
    id: Date.now().toString(),
    employeeId,
    items,
    total,
    date: new Date().toISOString(),
  };
  db.transactions.push(newTx);

  res.json(newTx);
});

app.get("/api/reports/daily", (req, res) => {
  const today = new Date().toISOString().split("T")[0];

  const todaysTransactions = db.transactions.filter((t) =>
    t.date.startsWith(today),
  );

  const totalSales = todaysTransactions.reduce((sum, t) => sum + t.total, 0);

  const salesByEmployee = todaysTransactions.reduce(
    (acc, t) => {
      acc[t.employeeId] = (acc[t.employeeId] || 0) + t.total;
      return acc;
    },
    {} as Record<string, number>,
  );

  res.json({
    date: today,
    totalSales,
    transactionCount: todaysTransactions.length,
    salesByEmployee,
  });
});

export default app;
