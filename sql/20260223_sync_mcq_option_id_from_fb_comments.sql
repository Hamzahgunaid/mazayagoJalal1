-- Ensure DB-triggered facebook comments sync keeps mcq_option_id on contest_entries

create or replace function public.sync_fb_comment_mcq_option_to_contest_entries()
returns trigger
language plpgsql
as $$
begin
  if NEW.fb_comment_id is null then
    return NEW;
  end if;

  update public.contest_entries
     set mcq_option_id = NEW.mcq_option_id
   where contest_id = NEW.contest_id
     and fb_comment_id = NEW.fb_comment_id
     and mcq_option_id is distinct from NEW.mcq_option_id;

  return NEW;
end;
$$;

drop trigger if exists trg_sync_fb_comment_mcq_option_to_contest_entries on public.facebook_comment_entries;

create trigger trg_sync_fb_comment_mcq_option_to_contest_entries
after insert or update of mcq_option_id
on public.facebook_comment_entries
for each row
execute function public.sync_fb_comment_mcq_option_to_contest_entries();
