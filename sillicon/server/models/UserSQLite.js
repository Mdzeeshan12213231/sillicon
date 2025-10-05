const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

// Create database connection
const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Initialize database
db.serialize(() => {
  // Create users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    avatar TEXT,
    isActive INTEGER DEFAULT 1,
    lastLogin DATETIME,
    preferences TEXT DEFAULT '{}',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

class UserSQLite {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
    this.password = data.password;
    this.role = data.role || 'user';
    this.avatar = data.avatar;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.lastLogin = data.lastLogin;
    this.preferences = data.preferences ? JSON.parse(data.preferences) : {};
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static async findOne(query) {
    return new Promise((resolve, reject) => {
      const { email } = query;
      db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
        if (err) {
          reject(err);
        } else if (row) {
          resolve(new UserSQLite(row));
        } else {
          resolve(null);
        }
      });
    });
  }

  static async findById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
        if (err) {
          reject(err);
        } else if (row) {
          resolve(new UserSQLite(row));
        } else {
          resolve(null);
        }
      });
    });
  }

  async save() {
    if (this.id) {
      // Update existing user
      return new Promise(async (resolve, reject) => {
        try {
          const hashedPassword = await this.hashPassword(this.password);
          db.run(
            'UPDATE users SET name = ?, email = ?, password = ?, role = ?, avatar = ?, isActive = ?, lastLogin = ?, preferences = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
            [this.name, this.email, hashedPassword, this.role, this.avatar, this.isActive, this.lastLogin, JSON.stringify(this.preferences), this.id],
            function(err) {
              if (err) {
                reject(err);
              } else {
                resolve(this);
              }
            }
          );
        } catch (error) {
          reject(error);
        }
      });
    } else {
      // Create new user
      return new Promise(async (resolve, reject) => {
        try {
          const hashedPassword = await this.hashPassword(this.password);
          db.run(
            'INSERT INTO users (name, email, password, role, avatar, isActive, preferences) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [this.name, this.email, hashedPassword, this.role, this.avatar, this.isActive, JSON.stringify(this.preferences)],
            function(err) {
              if (err) {
                reject(err);
              } else {
                this.id = this.lastID;
                resolve(this);
              }
            }
          );
        } catch (error) {
          reject(error);
        }
      });
    }
  }

  async hashPassword(password) {
    const salt = await bcrypt.genSalt(12);
    return await bcrypt.hash(password, salt);
  }

  async comparePassword(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  }

  toJSON() {
    const userObject = { ...this };
    delete userObject.password;
    return userObject;
  }
}

module.exports = UserSQLite;
