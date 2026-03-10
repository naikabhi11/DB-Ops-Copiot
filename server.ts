import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const db = new Database("db_ops.sqlite");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS connections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'postgres' | 'mongodb'
    environment TEXT NOT NULL, -- 'development' | 'staging' | 'production'
    connection_string TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    connection_id TEXT NOT NULL,
    metric TEXT NOT NULL,
    threshold REAL NOT NULL,
    operator TEXT NOT NULL, -- '>' | '<'
    channel TEXT NOT NULL, -- 'email' | 'slack'
    enabled INTEGER DEFAULT 1,
    FOREIGN KEY(connection_id) REFERENCES connections(id)
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Auth Routes
  app.post("/api/auth/register", (req, res) => {
    const { email, password, role } = req.body;
    const id = Math.random().toString(36).substring(7);
    try {
      db.prepare("INSERT INTO users (id, email, password, role) VALUES (?, ?, ?, ?)")
        .run(id, email, password, role || 'viewer');
      res.json({ id, email, role: role || 'viewer' });
    } catch (e) {
      res.status(400).json({ error: "Email already exists" });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ? AND password = ?").get(email, password);
    if (user) {
      res.json({ id: user.id, email: user.email, role: user.role });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  // API Routes
  app.get("/api/connections", (req, res) => {
    const connections = db.prepare("SELECT * FROM connections").all();
    res.json(connections);
  });

  app.post("/api/connections", (req, res) => {
    const { name, type, environment, connectionString } = req.body;
    const id = Math.random().toString(36).substring(7);
    db.prepare("INSERT INTO connections (id, name, type, environment, connection_string) VALUES (?, ?, ?, ?, ?)")
      .run(id, name, type, environment, connectionString);
    res.json({ id, name, type, environment });
  });

  app.delete("/api/connections/:id", (req, res) => {
    db.prepare("DELETE FROM connections WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/alerts", (req, res) => {
    const alerts = db.prepare("SELECT * FROM alerts").all();
    res.json(alerts);
  });

  app.post("/api/alerts", (req, res) => {
    const { connectionId, metric, threshold, operator, channel } = req.body;
    const id = Math.random().toString(36).substring(7);
    db.prepare("INSERT INTO alerts (id, connection_id, metric, threshold, operator, channel) VALUES (?, ?, ?, ?, ?, ?)")
      .run(id, connectionId, metric, threshold, operator, channel);
    res.json({ id, connectionId, metric, threshold, operator, channel });
  });

  // Mock Metrics Endpoint
  app.get("/api/metrics/:connectionId", (req, res) => {
    const conn = db.prepare("SELECT * FROM connections WHERE id = ?").get(req.params.connectionId);
    if (!conn) return res.status(404).json({ error: "Not found" });

    const now = Date.now();
    const metrics = Array.from({ length: 20 }).map((_, i) => {
      const base = {
        timestamp: now - (19 - i) * 60000,
        cpu: 20 + Math.random() * 40,
        memory: 40 + Math.random() * 30,
        latency: 5 + Math.random() * 15,
        connections: 50 + Math.floor(Math.random() * 20),
      };

      if (conn.type === 'redis') {
        return {
          ...base,
          iops: 1000 + Math.random() * 5000,
          memoryUsage: 100 + Math.random() * 200, // MB
          fragmentationRatio: 1.0 + Math.random() * 0.5,
          hits: 500 + Math.random() * 200,
          misses: 10 + Math.random() * 50,
        };
      }

      return {
        ...base,
        iops: 100 + Math.random() * 500,
        replicationLag: Math.random() * 5,
        diskUsage: 50 + Math.random() * 10, // GB
      };
    });
    res.json(metrics);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve("dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
