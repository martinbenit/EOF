-- Unit 2 Extension: Add Faraday challenge + achievement

INSERT INTO challenges (id, unit, title, subtitle, description, max_xp, unlock_level, icon, color)
VALUES
  ('faraday', 2, 'Latido Inductivo', 'El Nano-Generador',
   'Generá suficiente energía para cargar un nano-marcapasos moviendo un imán a través de una espira. Aplicá la Ley de Faraday.',
   400, 1, '❤️‍🔥', '#ff4d6d')
ON CONFLICT (id) DO NOTHING;

INSERT INTO achievement_definitions (key, title, description, icon, xp_reward)
VALUES
  ('faraday_master', 'Bio-Electricista', 'Cargaste el nano-marcapasos con precisión perfecta usando inducción electromagnética', '❤️‍🔥', 100)
ON CONFLICT (key) DO NOTHING;
