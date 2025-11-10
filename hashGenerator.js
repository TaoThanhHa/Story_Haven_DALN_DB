const bcrypt = require('bcrypt');

async function generateHash() {
    const password = 'concuncon'; 
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('Generated Hash:', hash);
}

generateHash();
