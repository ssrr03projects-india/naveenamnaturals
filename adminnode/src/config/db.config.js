
require("dotenv").config();

module.exports = {
  HOST: process.env.DB_HOST || "localhost",
  USER: process.env.DB_USER || "root",
  PASSWORD: process.env.DB_PASSWORD || "",
  DB: process.env.DB_NAME || "naveenam_naturals",
  DIALECT: process.env.DB_DIALECT || "mysql",
  PORT: process.env.DB_PORT || 3306,
  pool: {
    max: 20, // Increased from 5
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  // To enable read replicas in the future, use the following configuration:
  // replication: {
  //   read: [
  //     { host: 'replica1.example.com', username: '...' },
  //     { host: 'replica2.example.com', username: '...' }
  //   ],
  //   write: { host: 'primary.example.com', username: '...' }
  // },
  dialectOptions: {
    charset: "utf8mb4",
  },
  timezone: "+05:30", // IST timezone for consistent date comparisons
  logging: false, // Set to console.log to see SQL queries
};
