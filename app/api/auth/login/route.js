import { getDb } from '@/lib/db';
import { comparePassword, generateToken } from '@/lib/auth';
import { NextResponse } from 'next/server';

// POST: handles user authentication and login, validates credentials by consulting the database for the username,
// compares the provided password with the stored hashed password using bcrypt
export async function POST(request) {
  try {
    const { username, password } = await request.json();
    const db = await getDb();

    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);

    if (!user) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    const isMatch = await comparePassword(password, user.password);

    if (!isMatch) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    const token = generateToken({ id: user.id, username: user.username });

    return NextResponse.json({
      message: "¡Acceso concedido, Entrenador!",
      token,
      user: { id: user.id, username: user.username }
    });

  } catch (error) {
    console.error("Error en Login:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}