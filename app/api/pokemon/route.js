import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import axios from 'axios';

// Global in memory cache for static pokemon data
let cachedGen1Data = null;

// Splits a large array into smaller batches to prevent api timeouts
const chunkArray = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

// Extracts and verifies the User ID from the JWT Token in the Authorization header
async function getUserIdFromRequest(request) {
  const token = request.headers.get('authorization')?.split(' ')[1];
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.id;
  } catch {
    return null;
  }
}

// GET: retrieves the complete pokedex for the authenticated user, uses RAM cache for static pokemon data
// fetched from pokeapi in batches of 20 to prevent timeouts
export async function GET(request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = await getDb();
    let baseData;

    if (cachedGen1Data) {
      console.log("⚡ RAM CACHE HIT: Serving data instantly.");
      baseData = cachedGen1Data;
    } else {
      console.log("🐢 RAM CACHE MISS: Fetching from PokéAPI with Batching Strategy...");
      
      const listResponse = await axios.get('https://pokeapi.co/api/v2/pokemon?limit=151');
      const baseList = listResponse.data.results;

      const batches = chunkArray(baseList, 20);
      let detailsResponses = [];

      for (const batch of batches) {
        const batchPromises = batch.map(p => axios.get(p.url, { timeout: 10000 })); 
        const batchResults = await Promise.all(batchPromises);
        detailsResponses = [...detailsResponses, ...batchResults];
      }

      cachedGen1Data = detailsResponses.map((response) => {
        const apiData = response.data;
        return {
          id: apiData.id,
          name: apiData.name,
          image: apiData.sprites.front_default,
          types: apiData.types.map(t => t.type.name),
          weight: apiData.weight,
          height: apiData.height,
        };
      });

      baseData = cachedGen1Data;
      console.log("✅ Data cached successfully.");
    }

    const userRows = await db.all(
      'SELECT pokemon_id, is_team FROM collection WHERE user_id = ?',
      [userId]
    );

    const fullCollection = baseData.map((pokemon) => {
      const captureData = userRows.find(row => row.pokemon_id === pokemon.id);
      return {
        ...pokemon,
        captured: !!captureData,
        is_team: captureData ? !!captureData.is_team : false,
      };
    });

    return NextResponse.json(fullCollection);

  } catch (error) {
    console.error("CRITICAL ERROR in GET /api/pokemon:", error.message);
    return NextResponse.json({ error: "Failed to load Pokedex data" }, { status: 500 });
  }
}

// POST: handles pokemon capture by inserting a new record into the user's collection
export async function POST(request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { pokemonId } = await request.json();
    const db = await getDb();

    await db.run(
      'INSERT INTO collection (user_id, pokemon_id) VALUES (?, ?)',
      [userId, pokemonId]
    );

    return NextResponse.json({ message: "Pokemon captured successfully!" });
  } catch (error) {
    return NextResponse.json({ error: "You already have this Pokemon" }, { status: 400 });
  }
}

// DELETE: handles pokemon release by removing the record from the user's collection
// Validates JWT token and deletes entry from database
export async function DELETE(request) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const body = await request.json();

    if (!body.pokemonId) {
      return NextResponse.json({ error: 'Pokemon ID is required' }, { status: 400 });
    }

    const db = await getDb();
    
    const result = await db.run(
      'DELETE FROM collection WHERE user_id = ? AND pokemon_id = ?',
      [decoded.id, body.pokemonId]
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Pokemon not found in collection' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Pokemon released successfully' });
  } catch (error) {
    console.error("DELETE ERROR:", error);
    return NextResponse.json({ 
      error: 'Internal Server Error', 
      details: error.message 
    }, { status: 500 });
  }
}

// PUT: updates the team status for a specific pokemon in the user's collection
export async function PUT(request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { pokemonId, isTeam } = await request.json();
    const db = await getDb();

    await db.run(
      'UPDATE collection SET is_team = ? WHERE user_id = ? AND pokemon_id = ?',
      [isTeam ? 1 : 0, userId, pokemonId]
    );

    return NextResponse.json({ message: "Team updated successfully" });
  } catch (error) {
    console.error("TEAM UPDATE ERROR:", error);
    return NextResponse.json({ error: "Failed to update team" }, { status: 500 });
  }
}