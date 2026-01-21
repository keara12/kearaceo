import mysql from 'mysql2/promise';

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',      // user ធម្មតារបស់ XAMPP គឺ root
    password: '',      // password ធម្មតាគឺទទេ
    database: 'location_db' // ឈ្មោះ Database ដែលអ្នកបានបង្កើតមិញ
});

export default db;