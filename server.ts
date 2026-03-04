import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("vocab_progress.db");

async function startServer() {
  console.log("Initializing server...");
  const app = express();
  const PORT = 3000;

  try {
    console.log("Initializing database...");
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_progress (
        email TEXT PRIMARY KEY,
        name TEXT,
        phone TEXT,
        progress_json TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migration for existing databases
    try {
      db.prepare("ALTER TABLE user_progress ADD COLUMN name TEXT").run();
    } catch (e) {}
    try {
      db.prepare("ALTER TABLE user_progress ADD COLUMN phone TEXT").run();
    } catch (e) {}

    console.log("Database initialized successfully.");
  } catch (dbError) {
    console.error("Database initialization failed:", dbError);
  }

  app.use(express.json());

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", env: process.env.NODE_ENV });
  });

  // API Routes
  app.get("/api/progress/:email", (req, res) => {
    const { email } = req.params;
    const row = db.prepare("SELECT progress_json, name, phone FROM user_progress WHERE email = ?").get(email) as { progress_json: string, name: string, phone: string } | undefined;
    
    if (row) {
      res.json({
        progress: JSON.parse(row.progress_json),
        profile: { name: row.name, phone: row.phone }
      });
    } else {
      res.json({ progress: {}, profile: null });
    }
  });

  app.post("/api/progress/:email", (req, res) => {
    const { email } = req.params;
    const { progress, profile } = req.body;
    const progressJson = JSON.stringify(progress);
    const name = profile?.name || null;
    const phone = profile?.phone || null;
    
    db.prepare(`
      INSERT INTO user_progress (email, name, phone, progress_json, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(email) DO UPDATE SET
        name = COALESCE(excluded.name, user_progress.name),
        phone = COALESCE(excluded.phone, user_progress.phone),
        progress_json = excluded.progress_json,
        updated_at = CURRENT_TIMESTAMP
    `).run(email, name, phone, progressJson);
    
    res.json({ status: "ok" });
  });

  app.get("/api/admin/stats", (req, res) => {
    try {
      const rows = db.prepare("SELECT email, name, phone, progress_json, updated_at FROM user_progress ORDER BY updated_at DESC").all() as Array<{ email: string, name: string, phone: string, progress_json: string, updated_at: string }>;
      
      const stats = rows.map(row => {
        const progress = JSON.parse(row.progress_json);
        const mastered = Object.values(progress).filter((s: any) => (typeof s === 'string' ? s === 'mastered' : s.status === 'mastered')).length;
        const learning = Object.values(progress).filter((s: any) => (typeof s === 'string' ? s === 'learning' : s.status === 'learning')).length;
        return {
          email: row.email,
          name: row.name || 'N/A',
          phone: row.phone || 'N/A',
          mastered,
          learning,
          lastActive: row.updated_at
        };
      });
      
      res.json(stats);
    } catch (error) {
      console.error("Admin stats error:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting in development mode with Vite middleware (SPA mode)...");
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false 
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting in production mode...");
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
