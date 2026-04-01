
CREATE POLICY "Allow delete on generations"
  ON public.generations
  FOR DELETE
  TO anon, authenticated
  USING (true);
