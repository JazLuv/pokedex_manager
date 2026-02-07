import { getDb } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { NextResponse } from 'next/server';

// POST: handles user registration for new trainers, validates that username and password are provided,
// hashes the password using bcrypt for security and inserts the new user into the database
export async function POST(request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
    }

    const db = await getDb();
    const hashedPassword = await hashPassword(password);

    await db.run(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [username, hashedPassword]
    );

    return NextResponse.json({ message: "¡Entrenador registrado!" }, { status: 201 });
  } catch (error) {
    if (error.message.includes("UNIQUE")) {
      return NextResponse.json({ error: "El nombre de usuario ya existe" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}