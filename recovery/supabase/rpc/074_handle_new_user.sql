CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles(id,nickname,real_name,approval_status)
  values(new.id,new.raw_user_meta_data->>'nickname',new.raw_user_meta_data->>'real_name','0');
  return new;
end;
$function$
