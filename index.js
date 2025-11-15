require('dotenv').config();
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
app.use(express.static(path.join(__dirname, 'views/public')));
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
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Truyền user vào EJS
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// EJS config
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views/public/html'));

// Routes
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);
app.use('/', htmlRoutes);

// Xử lý 404 tổng quát (đặt ở cuối cùng)
app.use((req, res) => {
    res.status(404).render('404'); // Đảm bảo bạn có file 404.ejs
});

app.listen(PORT, () => {
    console.log(`✅ Server đang chạy tại http://localhost:${PORT}`);
});