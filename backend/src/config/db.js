const mysql = require('mysql2/promise');
const debug = require('debug')('app:db');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'fishing_logbook',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

pool.getConnection()
  .then(conn => {
    debug('数据库连接成功');
    conn.release();
  })
  .catch(err => {
    debug('数据库连接失败:', err.message);
  });

module.exports = pool;
