CREATE DATABASE worktrack;
\c worktrack
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'employee',
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE time_records (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
INSERT INTO users (name, email, password, role) VALUES
('Ana Novak', 'ana.novak@podjetje.si', 'test123', 'employee'),
('Bojan Kralj', 'bojan.kralj@podjetje.si', 'test123', 'employee'),
('Maja Zupan', 'maja.zupan@podjetje.si', 'test123', 'employee'),
('Administrator', 'admin@podjetje.si', 'admin123', 'admin');
