module.exports = ({ env }) => {
  const client = env('DATABASE_CLIENT', 'postgres');

  return {
    connection: {
      client,
      connection: {
        host: env('DATABASE_HOST', 'postgres'),
        port: env.int('DATABASE_PORT', 5432),
        database: env('DATABASE_NAME', 'jeton'),
        user: env('DATABASE_USERNAME', 'jeton'),
        password: env('DATABASE_PASSWORD', 'jeton123'),
        ssl: env.bool('DATABASE_SSL', false)
          ? {
              rejectUnauthorized: env.bool('DATABASE_SSL_SELF', false)
            }
          : false
      }
    }
  };
};
