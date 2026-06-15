const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const debug = require('debug')('app:init');

async function initDatabase() {
  console.log('开始初始化数据库...');
  
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '123456',
    multipleStatements: true
  });

  try {
    console.log('创建数据库...');
    await connection.query('CREATE DATABASE IF NOT EXISTS fishing_logbook DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    console.log('数据库创建成功');

    await connection.query('USE fishing_logbook');
    
    const sqlPath = path.join(__dirname, '..', '..', '..', 'database', 'init.sql');
    let sql = fs.readFileSync(sqlPath, 'utf8');
    
    const dbCreateRegex = /CREATE DATABASE[\s\S]*?USE fishing_logbook;/i;
    sql = sql.replace(dbCreateRegex, '');
    
    console.log('执行建表和初始化数据...');
    await connection.query(sql);
    
    console.log('数据库初始化完成！');
    
    const [tables] = await connection.query('SHOW TABLES');
    console.log(`已创建 ${tables.length} 张表:`);
    tables.forEach(t => console.log(`  - ${Object.values(t)[0]}`));
    
  } catch (err) {
    console.error('数据库初始化失败:', err.message);
    throw err;
  } finally {
    await connection.end();
  }
}

initDatabase().catch(err => {
  console.error(err);
  process.exit(1);
});
