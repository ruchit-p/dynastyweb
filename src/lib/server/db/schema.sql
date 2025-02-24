-- MARK: - Family Trees

create type privacy_level as enum ('public', 'private', 'shared');
create type relationship_type as enum ('parent', 'child', 'spouse');
create type gender_type as enum ('male', 'female', 'other');

-- Family Trees table
create table family_trees (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  owner_id uuid references auth.users(id) not null,
  privacy_level privacy_level not null default 'private',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Family Tree Members table
create table family_tree_members (
  id uuid primary key default uuid_generate_v4(),
  tree_id uuid references family_trees(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  display_name text not null,
  date_of_birth date,
  date_of_death date,
  gender gender_type not null default 'other',
  bio text,
  image_url text,
  phone_number text,
  email text,
  is_pending boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique(tree_id, user_id)
);

-- Family Tree Member Relationships table
create table family_tree_relationships (
  id uuid primary key default uuid_generate_v4(),
  tree_id uuid references family_trees(id) on delete cascade not null,
  from_member_id uuid references family_tree_members(id) on delete cascade not null,
  to_member_id uuid references family_tree_members(id) on delete cascade not null,
  relationship_type relationship_type not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique(tree_id, from_member_id, to_member_id, relationship_type)
);

-- Family Tree Access table (for shared trees)
create table family_tree_access (
  id uuid primary key default uuid_generate_v4(),
  tree_id uuid references family_trees(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null check (role in ('admin', 'editor', 'viewer')),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique(tree_id, user_id)
);

-- Family Tree Invitations table
create table family_tree_invitations (
  id uuid primary key default uuid_generate_v4(),
  tree_id uuid references family_trees(id) on delete cascade not null,
  inviter_id uuid references auth.users(id) on delete cascade not null,
  invitee_email text not null,
  role text not null check (role in ('admin', 'editor', 'viewer')),
  status text not null check (status in ('pending', 'accepted', 'rejected')) default 'pending',
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- RLS Policies

-- Family Trees
alter table family_trees enable row level security;

create policy "Family trees are viewable by owner and members"
  on family_trees for select
  using (
    auth.uid() = owner_id
    or exists (
      select 1 from family_tree_access
      where tree_id = id
      and user_id = auth.uid()
    )
    or privacy_level = 'public'
  );

create policy "Family trees are insertable by authenticated users"
  on family_trees for insert
  with check (auth.uid() = owner_id);

create policy "Family trees are updatable by owner and admins"
  on family_trees for update
  using (
    auth.uid() = owner_id
    or exists (
      select 1 from family_tree_access
      where tree_id = id
      and user_id = auth.uid()
      and role = 'admin'
    )
  );

create policy "Family trees are deletable by owner"
  on family_trees for delete
  using (auth.uid() = owner_id);

-- Family Tree Members
alter table family_tree_members enable row level security;

create policy "Family tree members are viewable by tree members"
  on family_tree_members for select
  using (
    exists (
      select 1 from family_trees ft
      left join family_tree_access fta on ft.id = fta.tree_id
      where ft.id = tree_id
      and (
        ft.owner_id = auth.uid()
        or fta.user_id = auth.uid()
        or ft.privacy_level = 'public'
      )
    )
  );

create policy "Family tree members are insertable by tree admins and editors"
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

create policy "Family tree members are updatable by tree admins and editors"
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

create policy "Family tree members are deletable by tree admins"
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

-- Family Tree Relationships
alter table family_tree_relationships enable row level security;

create policy "Family tree relationships are viewable by tree members"
  on family_tree_relationships for select
  using (
    exists (
      select 1 from family_trees ft
      left join family_tree_access fta on ft.id = fta.tree_id
      where ft.id = tree_id
      and (
        ft.owner_id = auth.uid()
        or fta.user_id = auth.uid()
        or ft.privacy_level = 'public'
      )
    )
  );

create policy "Family tree relationships are insertable by tree admins and editors"
  on family_tree_relationships for insert
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

create policy "Family tree relationships are updatable by tree admins and editors"
  on family_tree_relationships for update
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

create policy "Family tree relationships are deletable by tree admins"
  on family_tree_relationships for delete
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

-- Family Tree Access
alter table family_tree_access enable row level security;

create policy "Family tree access is viewable by tree members"
  on family_tree_access for select
  using (
    exists (
      select 1 from family_trees ft
      where ft.id = tree_id
      and (
        ft.owner_id = auth.uid()
        or user_id = auth.uid()
      )
    )
  );

create policy "Family tree access is insertable by tree owner and admins"
  on family_tree_access for insert
  with check (
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

create policy "Family tree access is updatable by tree owner and admins"
  on family_tree_access for update
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

create policy "Family tree access is deletable by tree owner and admins"
  on family_tree_access for delete
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

-- Family Tree Invitations
alter table family_tree_invitations enable row level security;

create policy "Family tree invitations are viewable by tree members and invitee"
  on family_tree_invitations for select
  using (
    exists (
      select 1 from family_trees ft
      left join family_tree_access fta on ft.id = fta.tree_id
      where ft.id = tree_id
      and (
        ft.owner_id = auth.uid()
        or fta.user_id = auth.uid()
        or invitee_email = auth.email()
      )
    )
  );

create policy "Family tree invitations are insertable by tree admins"
  on family_tree_invitations for insert
  with check (
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

create policy "Family tree invitations are updatable by tree admins and invitee"
  on family_tree_invitations for update
  using (
    exists (
      select 1 from family_trees ft
      left join family_tree_access fta on ft.id = fta.tree_id
      where ft.id = tree_id
      and (
        ft.owner_id = auth.uid()
        or (fta.user_id = auth.uid() and fta.role = 'admin')
        or invitee_email = auth.email()
      )
    )
  );

create policy "Family tree invitations are deletable by tree admins"
  on family_tree_invitations for delete
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

-- Functions

-- Function to get all members of a family tree with their relationships
create or replace function get_family_tree_members(p_tree_id uuid)
returns table (
  id uuid,
  first_name text,
  last_name text,
  display_name text,
  gender gender_type,
  date_of_birth date,
  date_of_death date,
  bio text,
  image_url text,
  parents uuid[],
  children uuid[],
  spouses uuid[]
)
language plpgsql
security definer
as $$
begin
  return query
  with member_relationships as (
    select
      m.id,
      m.first_name,
      m.last_name,
      m.display_name,
      m.gender,
      m.date_of_birth,
      m.date_of_death,
      m.bio,
      m.image_url,
      array_agg(distinct case when r.relationship_type = 'parent' then r.to_member_id end) filter (where r.relationship_type = 'parent') as parents,
      array_agg(distinct case when r.relationship_type = 'child' then r.to_member_id end) filter (where r.relationship_type = 'child') as children,
      array_agg(distinct case when r.relationship_type = 'spouse' then r.to_member_id end) filter (where r.relationship_type = 'spouse') as spouses
    from family_tree_members m
    left join family_tree_relationships r on m.id = r.from_member_id
    where m.tree_id = p_tree_id
    group by m.id, m.first_name, m.last_name, m.display_name, m.gender, m.date_of_birth, m.date_of_death, m.bio, m.image_url
  )
  select * from member_relationships;
end;
$$; 