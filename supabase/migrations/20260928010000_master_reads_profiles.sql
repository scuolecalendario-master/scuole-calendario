-- Il master deve leggere tutti i profili dello staff (istituti, istruttori,
-- calendario, report). "profiles: master gestisce" copre solo l'update: fino
-- al 26/9 la lettura passava da "profiles: lettura staff", tolta con
-- 20260926020000_audit_fixes.sql. Gli istruttori restano limitati ai
-- colleghi delle proprie classi ("profiles: lettura colleghi").
create policy "profiles: lettura master"
  on public.profiles for select to authenticated
  using ((select public.auth_role()) = 'master');
