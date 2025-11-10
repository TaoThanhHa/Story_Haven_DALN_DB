const bcrypt = require('bcrypt');

async function test() {
    const password = 'concuncon';
    const hash = '$2b$10$2wCTSq5sp8vXRO7PI6IxHuLA2dfjPItI1gDSYdatjJ6sn4tLt4iNG';
    const match = await bcrypt.compare(password, hash);
    console.log('Test result:', match); // Nên trả về true nếu hash khớp
}
test();