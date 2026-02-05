import axios from 'axios';

const BASE_URL = 'https://pokeapi.co/api/v2';

export const fetchFirstGen = async () => {
  const response = await axios.get(`${BASE_URL}/pokemon?limit=151`);
  return response.data.results;
};

export const fetchPokemonDetails = async (id) => {
  const response = await axios.get(`${BASE_URL}/pokemon/${id}`);
  return response.data;
};