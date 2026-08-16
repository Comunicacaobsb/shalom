-- The profile trigger is not a client-callable RPC function.
revoke execute on function public.handle_new_user() from anon, authenticated;
