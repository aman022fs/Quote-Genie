-- Storage RLS policies for these buckets already exist (see the initial schema
-- migration), but the buckets themselves were never created. Both are private:
-- access goes through the owner-scoped storage.objects policies and signed URLs,
-- not public URLs.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('quotation-uploads', 'quotation-uploads', false, 10485760,
    ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp']),
  ('generated-quotations', 'generated-quotations', false, 10485760,
    ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;
