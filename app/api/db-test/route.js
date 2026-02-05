// Sube tres niveles: de db-test -> api -> app -> raíz, y luego entra a lib
import { getDb } from '@/lib/db'; 
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const db = await getDb();
    // Intentamos hacer una consulta simple
    const result = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
    
    return NextResponse.json({ 
      status: "Connected", 
      tableFound: result ? "Yes (users)" : "No" 
    });
  } catch (error) {
    return NextResponse.json({ status: "Error", message: error.message }, { status: 500 });
  }
}