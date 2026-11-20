-- Demo podatki. Gesla: zaposleni "test123", admin "admin123" (bcrypt).
INSERT INTO users (name, email, password_hash, role) VALUES
('Ana Novak',     'ana.novak@podjetje.si',   '$2b$10$A1a7..5sXSPNfDISeiB9U.X93ahnB5aUgdv8BE4Q2D2w9Q5wMFBaK', 'employee'),
('Bojan Kralj',   'bojan.kralj@podjetje.si', '$2b$10$A1a7..5sXSPNfDISeiB9U.X93ahnB5aUgdv8BE4Q2D2w9Q5wMFBaK', 'employee'),
('Maja Zupan',    'maja.zupan@podjetje.si',  '$2b$10$A1a7..5sXSPNfDISeiB9U.X93ahnB5aUgdv8BE4Q2D2w9Q5wMFBaK', 'employee'),
('Administrator', 'admin@podjetje.si',       '$2b$10$6VglWJZg8.6XLWMBzleKBugn.mvr3R88q8ZJT3Q.vdOv5fMSJxNaq', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Ana: normalen teden; Bojan: predolg dan + prekratek počitek (za prikaz kršitev)
INSERT INTO time_records (user_id, start_time, end_time) VALUES
(1, NOW() - INTERVAL '3 days' - INTERVAL '9 hours', NOW() - INTERVAL '3 days' - INTERVAL '1 hour'),
(1, NOW() - INTERVAL '2 days' - INTERVAL '9 hours', NOW() - INTERVAL '2 days' - INTERVAL '1 hour'),
(2, NOW() - INTERVAL '2 days' - INTERVAL '13 hours', NOW() - INTERVAL '2 days' - INTERVAL '1 hour'),
(2, NOW() - INTERVAL '1 days' - INTERVAL '16 hours', NOW() - INTERVAL '1 days' - INTERVAL '8 hours');
