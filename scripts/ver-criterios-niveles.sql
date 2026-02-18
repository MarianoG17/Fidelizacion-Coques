-- Ver criterios EXACTOS de cada nivel
-- Esto muestra qué se necesita para pasar de un nivel a otro

SELECT 
  n.nombre,
  n.orden,
  n.criterios,
  -- Extraer valores específicos del JSON
  (n.criterios::jsonb->>'visitas')::int as visitas_requeridas,
  (n.criterios::jsonb->>'visitasMinimas')::int as visitas_minimas_legacy,
  (n.criterios::jsonb->>'diasVentana')::int as dias_ventana,
  (n.criterios::jsonb->>'usosCruzados')::int as usos_cruzados_requeridos,
  (n.criterios::jsonb->>'referidosMinimos')::int as referidos_requeridos,
  (n.criterios::jsonb->>'perfilCompleto')::boolean as requiere_perfil_completo
FROM "Nivel" n
ORDER BY n.orden;
