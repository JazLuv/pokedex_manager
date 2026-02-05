import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

// Variable para cachear la conexión
let db = null;

export async function getDb() {
  if (!db) {
    // Definimos la ruta hacia la carpeta /data en la raíz
    const dbPath = path.join(process.cwd(), 'data', 'pokedex.db');

    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    // --- Inicialización Automática ---
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS collection (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        pokemon_id INTEGER NOT NULL,
        is_team BOOLEAN DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users (id),
        UNIQUE(user_id, pokemon_id)
      );
    `);
    
    console.log("💾 SQLite: Base de datos y tablas listas.");
  }
  return db;
}