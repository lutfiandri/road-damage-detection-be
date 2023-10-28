import dotenv from 'dotenv';
import process from 'process';

dotenv.config();

const getenv = (name) => {
  const env = process.env[name];
  if (!env) {
    console.error(`Environtment variable ${name} is missing!`);
    process.exit(1);
  }
  return env;
};

export default getenv;
