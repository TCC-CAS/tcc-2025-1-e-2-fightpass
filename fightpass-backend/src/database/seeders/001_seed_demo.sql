INSERT IGNORE INTO roles (id, code, name) VALUES
  (1, 'student', 'Aluno'),
  (2, 'instructor', 'Instrutor'),
  (3, 'institution_admin', 'Administrador da Instituicao'),
  (4, 'staff', 'Equipe de Apoio');

INSERT IGNORE INTO modalities (id, name, slug, description) VALUES
  (1, 'Boxe', 'boxe', 'Treinamento de boxe'),
  (2, 'Jiu-Jitsu', 'jiu-jitsu', 'Treinamento de jiu-jitsu'),
  (3, 'Judo', 'judo', 'Treinamento de judo'),
  (4, 'Muay Thai', 'muay-thai', 'Treinamento de muay thai');

INSERT IGNORE INTO users (id, role_id, name, email, password_hash, document, phone, is_active) VALUES
  (1, 3, 'Dojo Sakura', 'contato@dojosakura.com', '$2a$10$Mjn8t4WA1lR0mQ8nq4AqCewNfcl4lzNN2O0oSbYqK0PXmXqQyVx1C', '12.345.678/0001-90', '(11) 3000-2000', 1),
  (2, 2, 'Carlos Sensei', 'carlos@dojosakura.com', '$2a$10$Mjn8t4WA1lR0mQ8nq4AqCewNfcl4lzNN2O0oSbYqK0PXmXqQyVx1C', '123.456.789-00', '(11) 98888-1111', 1),
  (3, 1, 'Joao Silva', 'joao@fightpass.com', '$2a$10$Mjn8t4WA1lR0mQ8nq4AqCewNfcl4lzNN2O0oSbYqK0PXmXqQyVx1C', '987.654.321-00', '(11) 97777-1111', 1);

INSERT IGNORE INTO institutions (id, owner_user_id, name, legal_document, email, phone, description, status) VALUES
  (1, 1, 'Dojo Sakura', '12.345.678/0001-90', 'contato@dojosakura.com', '(11) 3000-2000', 'Academia especializada em artes marciais tradicionais e modernas.', 'active');

INSERT IGNORE INTO addresses (institution_id, street, number, neighborhood, city, state, zip_code, latitude, longitude) VALUES
  (1, 'Rua das Artes', '120', 'Centro', 'Sao Paulo', 'SP', '01000-000', -23.5505200, -46.6333080);

INSERT IGNORE INTO institution_user (institution_id, user_id, membership_role, status) VALUES
  (1, 1, 'institution_admin', 'active'),
  (1, 2, 'instructor', 'active'),
  (1, 3, 'student', 'active');

INSERT IGNORE INTO institution_modality (institution_id, modality_id) VALUES
  (1, 2),
  (1, 3),
  (1, 4);

INSERT IGNORE INTO classes (id, institution_id, modality_id, title, description, capacity, status) VALUES
  (1, 1, 4, 'Muay Thai Intermediario', 'Turma noturna para praticantes intermediarios.', 25, 'active'),
  (2, 1, 3, 'Judo Matinal', 'Turma voltada para fundamentos e condicionamento.', 20, 'active');

INSERT IGNORE INTO class_schedules (id, class_id, day_of_week, start_time, end_time, room_name) VALUES
  (1, 1, 3, '19:00:00', '20:00:00', 'Sala 1'),
  (2, 2, 5, '07:30:00', '08:30:00', 'Tatame 2');

INSERT IGNORE INTO enrollments (institution_id, student_id, modality_id, status, started_at) VALUES
  (1, 3, 4, 'active', '2026-01-10');

INSERT IGNORE INTO bookings (id, student_id, class_schedule_id, booking_date, status, is_trial, expires_at) VALUES
  (1, 3, 1, '2026-04-08', 'scheduled', 0, NULL),
  (2, 3, 2, '2026-04-10', 'scheduled', 0, NULL);

INSERT IGNORE INTO student_evaluations (institution_id, evaluator_user_id, student_user_id, modality_id, score, comment) VALUES
  (1, 2, 3, 4, 8.60, 'Boa evolucao tecnica, disciplina constante e melhora no condicionamento.');

INSERT IGNORE INTO student_progress_snapshots (institution_id, student_user_id, reference_month, average_score, attendance_rate, risk_level) VALUES
  (1, 3, '2026-01-01', 7.00, 75.00, 'medium'),
  (1, 3, '2026-02-01', 7.30, 80.00, 'medium'),
  (1, 3, '2026-03-01', 7.90, 88.00, 'low'),
  (1, 3, '2026-04-01', 8.20, 92.00, 'low');
