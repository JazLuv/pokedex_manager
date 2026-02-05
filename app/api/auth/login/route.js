import { getDb } from '@/lib/db';
import { comparePassword, generateToken } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { username, password } = await request.json();
    const db = await getDb();

    // 1. Buscamos al entrenador por su nombre
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);

    if (!user) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    // 2. Usamos bcrypt para comparar el texto plano con el hash de la DB
    const isMatch = await comparePassword(password, user.password);

    if (!isMatch) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    // 3. Si todo coincide, generamos el Token de acceso
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