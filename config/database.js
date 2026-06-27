require("dotenv").config();
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "db_whatsapp_gateway",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

const initDatabase = async function ()
{
    await pool.query(
        `CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            google_id VARCHAR(64) NOT NULL UNIQUE,
            email VARCHAR(255) NOT NULL,
            name VARCHAR(255),
            avatar VARCHAR(512),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );

    await pool.query(
        `CREATE TABLE IF NOT EXISTS sessions_wa (
            id VARCHAR(64) PRIMARY KEY,
            user_id INT NULL,
            description VARCHAR(255),
            phone VARCHAR(32),
            ready TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );

    await pool
        .query("ALTER TABLE sessions_wa ADD COLUMN phone VARCHAR(32)")
        .catch(() => {});

    await pool.query(
        `CREATE TABLE IF NOT EXISTS broadcasts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NULL,
            sender VARCHAR(64),
            total INT DEFAULT 0,
            success INT DEFAULT 0,
            failed INT DEFAULT 0,
            message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );

    await pool.query(
        `CREATE TABLE IF NOT EXISTS templates (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            body TEXT NOT NULL,
            image VARCHAR(512) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );

    const [columns] = await pool.execute(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'templates' AND COLUMN_NAME = 'image'`
    );

    if (columns.length === 0)
    {
        await pool.execute("ALTER TABLE templates ADD COLUMN image VARCHAR(512) NULL AFTER body");
    }

    await pool
        .query("ALTER TABLE templates ADD COLUMN buttons TEXT NULL AFTER image")
        .catch(() => {});

    await pool.query(
        `CREATE TABLE IF NOT EXISTS bot_flows (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            session_id VARCHAR(64) NOT NULL,
            name VARCHAR(255) NOT NULL,
            trigger_type ENUM('keyword', 'welcome', 'fallback') DEFAULT 'keyword',
            keyword VARCHAR(255) NULL,
            match_mode ENUM('exact', 'contains') DEFAULT 'contains',
            reply_body TEXT NOT NULL,
            reply_image VARCHAR(512) NULL,
            buttons TEXT NULL,
            enabled TINYINT(1) DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );

    await pool.query(
        `CREATE TABLE IF NOT EXISTS bot_settings (
            session_id VARCHAR(64) PRIMARY KEY,
            user_id INT NOT NULL,
            enabled TINYINT(1) DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );

    await pool.query(
        `CREATE TABLE IF NOT EXISTS message_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NULL,
            sender VARCHAR(64),
            number VARCHAR(32),
            status TINYINT(1) DEFAULT 0,
            detail VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );

    await pool.query(
        `CREATE TABLE IF NOT EXISTS crm_contacts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            session_id VARCHAR(64) NOT NULL,
            wa_number VARCHAR(32) NOT NULL,
            name VARCHAR(255) NULL,
            label VARCHAR(32) DEFAULT 'none',
            status ENUM('new', 'open', 'done') DEFAULT 'new',
            notes TEXT NULL,
            last_message TEXT NULL,
            last_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            unread INT DEFAULT 0,
            UNIQUE KEY uniq_contact (session_id, wa_number),
            KEY idx_user (user_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );

    await pool.query(
        `CREATE TABLE IF NOT EXISTS crm_messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            session_id VARCHAR(64) NOT NULL,
            wa_number VARCHAR(32) NOT NULL,
            direction ENUM('in', 'out') NOT NULL,
            body TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            KEY idx_thread (session_id, wa_number),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );
};

module.exports = { pool, initDatabase };
