import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("db_ops.sqlite");

const randomId = () => Math.random().toString(36).slice(2, 10);

// Initialize database

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'operator', 'viewer')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS connections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('postgres', 'mongodb')),
    environment TEXT NOT NULL CHECK(environment IN ('development', 'staging', 'production')),
    connection_string TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    connection_id TEXT NOT NULL,
    metric TEXT NOT NULL,
    threshold REAL NOT NULL,
    operator TEXT NOT NULL CHECK(operator IN ('>', '<')),
    channel TEXT NOT NULL CHECK(channel IN ('email', 'slack')),
    enabled INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(connection_id) REFERENCES connections(id)
  );
`);

const seedUsers = [
  { email: "admin@example.com", password: "admin123", role: "admin" },
  { email: "operator@example.com", password: "operator123", role: "operator" },
  { email: "viewer@example.com", password: "viewer123", role: "viewer" },
];

for (const user of seedUsers) {
  db.prepare("INSERT OR IGNORE INTO users (id, email, password, role) VALUES (?, ?, ?, ?)").run(randomId(), user.email, user.password, user.role);
}

const seedConnections = [
  { name: "Orders PostgreSQL", type: "postgres", environment: "production", connectionString: "postgres://prod-orders" },
  { name: "Analytics MongoDB", type: "mongodb", environment: "staging", connectionString: "mongodb://staging-analytics" },
  { name: "Core PostgreSQL", type: "postgres", environment: "development", connectionString: "postgres://dev-core" },
] as const;

for (const conn of seedConnections) {
  db.prepare(
    "INSERT OR IGNORE INTO connections (id, name, type, environment, connection_string) VALUES (?, ?, ?, ?, ?)"
  ).run(`${conn.name}-${conn.environment}`.replace(/\s+/g, "-").toLowerCase(), conn.name, conn.type, conn.environment, conn.connectionString);
}

const buildMetrics = (type: string) => {
  const now = Date.now();

  return Array.from({ length: 30 }).map((_, i) => {
    const drift = Math.sin(i / 4) * 6;
    const noise = () => Math.random() * 8;

    const cpu = Math.min(96, Math.max(12, 45 + drift + noise()));
    const memory = Math.min(94, Math.max(20, 52 + drift + noise()));
    const replicationLag = Math.max(0, Number((type === "postgres" ? 0.8 + Math.random() * 3 : 1.2 + Math.random() * 5).toFixed(2)));
    const queryLatency = Number((8 + Math.random() * 45 + (cpu > 80 ? 15 : 0)).toFixed(2));
    const queryThroughput = Math.floor(400 + Math.random() * 900 - queryLatency * 2);

    return {
      timestamp: now - (29 - i) * 15000,
      cpu,
      memory,
      iops: Math.floor(800 + Math.random() * 2400),
      diskIo: Number((30 + Math.random() * 90).toFixed(2)),
      latency: queryLatency,
      queryLatency,
      queryThroughput,
      connections: Math.floor(35 + Math.random() * 80),
      replicationLag,
      lockWaits: Math.floor(Math.random() * 8 + (cpu > 75 ? 5 : 0)),
      longRunningQueries: Math.floor(Math.random() * 4 + (queryLatency > 35 ? 2 : 0)),
      slowQueries: Math.floor(Math.random() * 30 + (queryLatency > 35 ? 20 : 0)),
      diskUsage: Number((type === "postgres" ? 220 : 180) + i * 0.9 + Math.random() * 8),
    };
  });
};

const detectIncidents = (metrics: any[]) => {
  const latest = metrics[metrics.length - 1] ?? {};
  const issues: { title: string; severity: string; description: string; runbook: string }[] = [];

  if (latest.cpu > 85) {
    issues.push({
      title: "CPU saturation",
      severity: "high",
      description: `CPU reached ${latest.cpu.toFixed(1)}%.`,
      runbook: "1) Identify top SQL/Mongo operations by CPU. 2) Kill stuck queries. 3) Add covering indexes. 4) Increase vCPU if sustained > 15 min.",
    });
  }

  if (latest.replicationLag > 4) {
    issues.push({
      title: "Replication lag spike",
      severity: "critical",
      description: `Replication lag is ${latest.replicationLag.toFixed(2)} seconds.`,
      runbook: "1) Check network and WAL/oplog volume. 2) Verify replica I/O throughput. 3) Rebuild lagging replica if behind snapshot window.",
    });
  }

  if (latest.lockWaits > 8 || latest.longRunningQueries > 4) {
    issues.push({
      title: "Lock contention / long-running queries",
      severity: "medium",
      description: `Detected ${latest.lockWaits} lock waits and ${latest.longRunningQueries} long-running queries.`,
      runbook: "1) Capture blocking query chain. 2) Add index for blocked statements. 3) Reduce transaction scope and lock timeout.",
    });
  }

  return {
    status: issues.length ? "degraded" : "healthy",
    issues,
  };
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "5mb" }));

  app.post("/api/auth/register", (req, res) => {
    const { email, password, role } = req.body;
    const id = randomId();
    try {
      db.prepare("INSERT INTO users (id, email, password, role) VALUES (?, ?, ?, ?)").run(id, email, password, role || "viewer");
      res.json({ id, email, role: role || "viewer" });
    } catch {
      res.status(400).json({ error: "Email already exists" });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ? AND password = ?").get(email, password) as any;
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    res.json({ id: user.id, email: user.email, role: user.role });
  });

  app.get("/api/connections", (_, res) => {
    res.json(db.prepare("SELECT * FROM connections ORDER BY environment, name").all());
  });

  app.post("/api/connections", (req, res) => {
    const { name, type, environment, connectionString } = req.body;
    if (!["postgres", "mongodb"].includes(type)) return res.status(400).json({ error: "Only postgres and mongodb are supported" });
    const id = randomId();
    db.prepare("INSERT INTO connections (id, name, type, environment, connection_string) VALUES (?, ?, ?, ?, ?)").run(id, name, type, environment, connectionString);
    res.json({ id, name, type, environment, connection_string: connectionString });
  });

  app.get("/api/metrics/:connectionId", (req, res) => {
    const conn = db.prepare("SELECT * FROM connections WHERE id = ?").get(req.params.connectionId) as any;
    if (!conn) return res.status(404).json({ error: "Not found" });
    res.json(buildMetrics(conn.type));
  });

  app.post("/api/incidents/detect", (req, res) => {
    const { metrics } = req.body;
    res.json(detectIncidents(metrics || []));
  });

  app.post("/api/slow-query/analyze", (req, res) => {
    const { content } = req.body as { content: string };
    const lines = (content || "").split("\n");
    const queries = lines.filter((line) => /(select|update|delete|insert|find\(|aggregate\()/i.test(line)).slice(0, 4);

    const recommendations = queries.map((query) => ({
      query,
      issue: /select\s+\*/i.test(query) ? "Full projection detected" : "Potential full scan",
      suggestion: /where/i.test(query)
        ? "Add or validate compound index on filter columns and sort columns."
        : "Add selective predicates and avoid unbounded scan patterns.",
      impact: "Lower query latency and CPU utilization.",
    }));

    res.json({
      analysis: recommendations.length
        ? "Detected expensive query patterns and index opportunities."
        : "No query statements detected in the uploaded file.",
      recommendations,
    });
  });

  app.post("/api/capacity/forecast", (req, res) => {
    const { currentStorageGb = 220, monthlyGrowthRate = 0.12, currentIndexGb = 70 } = req.body;
    const forecast = Array.from({ length: 6 }).map((_, month) => ({
      month: month + 1,
      storageGb: Number((currentStorageGb * (1 + monthlyGrowthRate) ** (month + 1)).toFixed(2)),
      indexGb: Number((currentIndexGb * (1 + monthlyGrowthRate * 1.1) ** (month + 1)).toFixed(2)),
    }));
    const scaleRecommendation = forecast[5].storageGb > currentStorageGb * 2 ? "Plan horizontal scaling (sharding/read replicas)." : "Continue vertical scaling and tune indexes.";
    res.json({ forecast, scaleRecommendation });
  });

  app.get("/api/alerts", (_, res) => {
    res.json(db.prepare("SELECT * FROM alerts ORDER BY created_at DESC").all());
  });

  app.post("/api/alerts", (req, res) => {
    const { connectionId, metric, threshold, operator, channel } = req.body;
    const id = randomId();
    db.prepare("INSERT INTO alerts (id, connection_id, metric, threshold, operator, channel) VALUES (?, ?, ?, ?, ?, ?)").run(id, connectionId, metric, threshold, operator, channel);
    res.json({ id, connectionId, metric, threshold, operator, channel, delivery: `Alert channel configured for ${channel}` });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (_, res) => {
      res.sendFile(path.resolve("dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
