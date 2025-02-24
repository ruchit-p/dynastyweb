-- Drop existing policies
drop policy if exists "Family tree members are viewable by tree members" on family_tree_members;
drop policy if exists "Family tree members are insertable by tree owner and editors" on family_tree_members;
drop policy if exists "Family tree members are updatable by tree owner and editors" on family_tree_members;
drop policy if exists "Family tree members are deletable by tree owner and admins" on family_tree_members;

-- Create new non-recursive policies
create policy "Family tree members are viewable by tree members"
  on family_tree_members for select
  using (
    exists (
      select 1 from family_trees ft
      left join family_tree_access fta on ft.id = fta.tree_id
      where ft.id = family_tree_members.tree_id
      and (
        ft.owner_id = auth.uid()
        or ft.privacy_level = 'public'
        or (fta.user_id = auth.uid() and fta.role in ('admin', 'editor', 'viewer'))
      )
    )
  );

create policy "Family tree members are insertable by tree owner and editors"
  on family_tree_members for insert
  with check (
    exists (
      select 1 from family_trees ft
      left join family_tree_access fta on ft.id = fta.tree_id
      where ft.id = tree_id
      and (
        ft.owner_id = auth.uid()
        or (fta.user_id = auth.uid() and fta.role in ('admin', 'editor'))
      )
    )
  );

create policy "Family tree members are updatable by tree owner and editors"
  on family_tree_members for update
  using (
    exists (
      select 1 from family_trees ft
      left join family_tree_access fta on ft.id = fta.tree_id
      where ft.id = tree_id
      and (
        ft.owner_id = auth.uid()
        or (fta.user_id = auth.uid() and fta.role in ('admin', 'editor'))
      )
    )
  );

create policy "Family tree members are deletable by tree owner and admins"
  on family_tree_members for delete
  using (
    exists (
      select 1 from family_trees ft
      left join family_tree_access fta on ft.id = fta.tree_id
      where ft.id = tree_id
      and (
        ft.owner_id = auth.uid()
        or (fta.user_id = auth.uid() and fta.role = 'admin')
      )
    )
  ); 