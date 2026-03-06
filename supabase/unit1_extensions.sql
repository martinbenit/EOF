-- Add new challenges for Unit 1 Extension

INSERT INTO challenges (id, unit, title, subtitle, description, max_xp, unlock_level, icon, color)
VALUES
  ('ion-pilot', 1, 'Piloto de Iones', 'Escape del Laberinto Microfluídico',
   'Controlá un cañón de iones (cargas positivas) a través de un canal microfluídico. Aplicá la Regla de la Mano Derecha para encender campos magnéticos entrantes y salientes y guiar el ión sin chocar.',
   500, 1, '🕹️', '#00f0ff'),
  ('smes-forge', 1, 'Forja Cuántica', 'Construyendo el Super-Batería (SMES)',
   'Diseñá una bobina superconductora gigante (SMES) para almacenar energía magnética en el vacío. Optimizá el radio y la corriente, manteniendo el Potencial Vector A seguro en el centro cuántico.',
   800, 1, '⚡', '#ff00aa')
ON CONFLICT (id) DO NOTHING;

-- Add corresponding achievements
INSERT INTO achievement_definitions (key, title, description, icon, xp_reward)
VALUES
  ('ion_pilot_master', 'Maestro de Lorentz', 'Superaste el laberinto microfluídico sin choques al primer intento.', '🕹️', 100),
  ('smes_forge_master', 'Señor de los Anillos (Magnéticos)', 'Construiste el SMES con eficiencia máxima y presupuesto óptimo.', '⚡', 150)
ON CONFLICT (key) DO NOTHING;
