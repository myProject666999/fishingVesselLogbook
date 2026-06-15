require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const debug = require('debug')('app:main');

const vesselsRouter = require('./routes/vessels');
const voyagesRouter = require('./routes/voyages');
const tracksRouter = require('./routes/tracks');
const catchLogsRouter = require('./routes/catchLogs');
const noFishingRouter = require('./routes/noFishing');
const violationsRouter = require('./routes/violations');
const buyersRouter = require('./routes/buyers');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use((req, res, next) => {
  debug(`${req.method} ${req.url}`);
  next();
});

app.get('/', (req, res) => {
  res.json({ 
    message: '渔船捕捞作业电子日志系统 API',
    version: '1.0.0',
    endpoints: {
      vessels: '/api/vessels',
      voyages: '/api/voyages',
      tracks: '/api/tracks',
      catchLogs: '/api/catch-logs',
      noFishing: '/api/no-fishing',
      violations: '/api/violations',
      buyers: '/api/buyers'
    }
  });
});

app.use('/api/vessels', vesselsRouter);
app.use('/api/voyages', voyagesRouter);
app.use('/api/tracks', tracksRouter);
app.use('/api/catch-logs', catchLogsRouter);
app.use('/api/no-fishing', noFishingRouter);
app.use('/api/violations', violationsRouter);
app.use('/api/buyers', buyersRouter);

app.use((err, req, res, next) => {
  debug('服务器错误:', err.message);
  res.status(500).json({ success: false, message: '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`渔船捕捞作业电子日志系统 - 后端服务`);
  console.log(`运行端口: ${PORT}`);
  console.log(`调试模式: ${process.env.DEBUG ? '开启' : '关闭'}`);
  console.log(`服务地址: http://localhost:${PORT}`);
  debug('服务器启动成功，端口: %s', PORT);
});
