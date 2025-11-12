const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');

require('./configs/mongoConnect');

const htmlRoutes = require('./routers/htmlRoutes');
const apiRoutes = require('./routers/apiRoutes');
const adminRoutes = require('./routers/adminRoutes');

const app = express();
const PORT = 3000;

// Middleware cơ bản
app.use(express.static('views/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session
app.use(session({
  name: 'storyhaven.sid',
  secret: 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    sameSite: 'lax', 
  }
}));


// Truyền user vào EJS
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// EJS config
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views/public/html')); // tất cả file EJS ở đây

// 🧭 Routes
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes); // admin routes dùng luôn views trên
app.use('/', htmlRoutes);

app.listen(PORT, () => {
  console.log(`✅ Server đang chạy tại http://localhost:${PORT}`);
});
