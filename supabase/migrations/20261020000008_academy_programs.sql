-- Academy programs. Everyone is coached by PRISM; the program is who they race
-- for: LMU under the PRISM banner, ACC with Falcon Motorsport, or both. It
-- decides their Discord roles (LMU Academy / ACC Academy).
--
-- inquiries.program: what the applicant picked on the form.
-- students.program:  what an admin approved (null for students from before
--                    programs; set it on the site's Students page).

do $$ begin
  if to_regclass('public.inquiries') is not null then
    alter table public.inquiries add column if not exists program text;
    alter table public.inquiries drop constraint if exists inquiries_program_check;
    alter table public.inquiries add constraint inquiries_program_check check (program in ('lmu', 'acc', 'both'));
  end if;
end $$;

alter table public.students add column if not exists program text;
alter table public.students drop constraint if exists students_program_check;
alter table public.students add constraint students_program_check check (program in ('lmu', 'acc', 'both'));
