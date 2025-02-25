const { Client } = require('pg');

const connectionString = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const client = new Client({ connectionString });

async function testConnection() {
  try {
    console.log('Connecting to PostgreSQL database...');
    await client.connect();
    console.log('Connected successfully!');
    
    const result = await client.query('SELECT current_database() as db_name, current_user as user_name');
    console.log('Database info:', result.rows[0]);
    
    await client.end();
    console.log('Connection closed.');
  } catch (error) {
    console.error('Error connecting to PostgreSQL:', error);
  }
}

testConnection(); 