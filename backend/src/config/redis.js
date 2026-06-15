const { createClient } = require('redis');
const debug = require('debug')('app:redis');

const client = createClient({
  url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`
});

client.on('connect', () => {
  debug('Redis连接成功');
});

client.on('error', (err) => {
  debug('Redis连接错误:', err.message);
});

client.connect().catch(err => {
  debug('Redis连接失败:', err.message);
});

module.exports = client;
