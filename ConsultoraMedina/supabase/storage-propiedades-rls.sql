-- -----------------------------------------------------------------------------
-- Storage RLS — bucket "propiedades"
-- Requisitos:
--   1. Crear el bucket "propiedades" en Supabase → Storage (si aún no existe).
--   2. Tener la función public.is_staff() (solo admin) definida en schema.sql.
--   3. Para que las imágenes carguen en <img> sin sesión, activa "Public bucket"
--      en la configuración del bucket (o usa URLs firmadas si prefieres bucket privado).
-- -----------------------------------------------------------------------------

-- Políticas anteriores con el mismo nombre (re-ejecución segura)
DROP POLICY IF EXISTS "propiedades_bucket_select_public" ON storage.objects;
DROP POLICY IF EXISTS "propiedades_bucket_insert_staff" ON storage.objects;
DROP POLICY IF EXISTS "propiedades_bucket_update_staff" ON storage.objects;
DROP POLICY IF EXISTS "propiedades_bucket_delete_staff" ON storage.objects;

-- Lectura: cualquiera (incl. anon) puede listar/leer objetos de este bucket
CREATE POLICY "propiedades_bucket_select_public"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'propiedades');

-- Escritura: solo admin (sesión autenticada)
CREATE POLICY "propiedades_bucket_insert_staff"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'propiedades'
    AND public.is_staff()
  );

CREATE POLICY "propiedades_bucket_update_staff"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'propiedades'
    AND public.is_staff()
  )
  WITH CHECK (
    bucket_id = 'propiedades'
    AND public.is_staff()
  );

CREATE POLICY "propiedades_bucket_delete_staff"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'propiedades'
    AND public.is_staff()
  );
