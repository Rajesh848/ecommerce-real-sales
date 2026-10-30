-- Roles
create type public.app_role as enum ('admin', 'user');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
create policy "Users read own roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  email text not null default '',
  dietary_prefs text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Own profile read" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Own profile update" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "Own profile insert" on public.profiles for insert to authenticated
  with check (id = auth.uid());

-- New user: profile + role. The very first account becomes the store admin.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), coalesce(new.email, ''));
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Addresses
create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  label text not null default 'Home',
  full_name text not null,
  phone text not null,
  line1 text not null,
  line2 text not null default '',
  city text not null,
  state text not null,
  pincode text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.addresses to authenticated;
grant all on public.addresses to service_role;
alter table public.addresses enable row level security;
create policy "Own addresses" on public.addresses for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Products (prices + stock; visuals live in app code)
create table public.products (
  id text primary key,
  name text not null,
  brand text not null,
  category_id text not null,
  mrp numeric(10,2) not null check (mrp >= 0),
  discount_pct numeric(5,2) not null default 0 check (discount_pct between 0 and 90),
  gst_rate numeric(5,4) not null default 0 check (gst_rate between 0 and 0.28),
  stock integer not null default 0 check (stock >= 0),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);
grant select on public.products to anon, authenticated;
grant update on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "Anyone reads products" on public.products for select to anon, authenticated using (true);
create policy "Admins update products" on public.products for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

insert into public.products (id, name, brand, category_id, mrp, discount_pct, gst_rate, stock) values
('fruits-1','Bananas (1 dozen)','FarmFresh','fruits',60,0,0,40),
('fruits-2','Red Apples (1 kg)','Himachal Orchards','fruits',180,10,0,25),
('fruits-3','Tomatoes (1 kg)','FarmFresh','fruits',40,0,0,60),
('fruits-4','Onions (1 kg)','FarmFresh','fruits',35,0,0,80),
('fruits-5','Potatoes (2 kg)','FarmFresh','fruits',70,5,0,50),
('fruits-6','Spinach Bunch','GreenLeaf','fruits',25,0,0,6),
('dairy-1','Toned Milk 1 L','Amul','dairy',60,0,0,70),
('dairy-2','Paneer 200 g','Amul','dairy',95,5,0.05,30),
('dairy-3','Curd 400 g','Mother Dairy','dairy',45,0,0.05,35),
('dairy-4','Butter 100 g','Amul','dairy',58,0,0.12,40),
('dairy-5','Cheese Slices','Britannia','dairy',140,10,0.12,4),
('dairy-6','Ghee 500 ml','Nandini','dairy',320,8,0.12,20),
('snacks-1','Salted Chips','Lay''s','snacks',20,0,0.12,90),
('snacks-2','Good Day Cashew','Britannia','snacks',35,0,0.18,60),
('snacks-3','Parle-G','Parle','snacks',10,0,0.18,120),
('snacks-4','Aloo Bhujia','Haldiram''s','snacks',55,10,0.12,45),
('snacks-5','Dark Fantasy','Sunfeast','snacks',40,0,0.18,30),
('snacks-6','Popcorn Butter','Act II','snacks',30,15,0.12,5),
('beverages-1','Cola 750 ml','Thums Up','beverages',40,0,0.28,80),
('beverages-2','Mango Drink 1.2 L','Maaza','beverages',70,5,0.12,40),
('beverages-3','Mineral Water 1 L','Bisleri','beverages',20,0,0.18,150),
('beverages-4','Green Tea 25 bags','Lipton','beverages',160,20,0.05,25),
('beverages-5','Instant Coffee 100 g','Nescafé','beverages',310,10,0.18,18),
('beverages-6','Orange Juice 1 L','Real','beverages',125,0,0.12,3),
('grocery-1','Basmati Rice 5 kg','India Gate','grocery',650,12,0.05,30),
('grocery-2','Sona Masoori 10 kg','Daawat','grocery',720,5,0.05,20),
('grocery-3','Toor Dal 1 kg','Tata Sampann','grocery',165,5,0.05,40),
('grocery-4','Atta 5 kg','Aashirvaad','grocery',285,8,0.05,35),
('grocery-5','Sunflower Oil 1 L','Fortune','grocery',155,0,0.05,45),
('grocery-6','Iodised Salt 1 kg','Tata','grocery',28,0,0,100),
('care-1','Toothpaste 150 g','Colgate','care',99,10,0.18,50),
('care-2','Shampoo 340 ml','Head & Shoulders','care',340,15,0.18,22),
('care-3','Bath Soap (4 pack)','Dove','care',220,10,0.18,30),
('care-4','Face Wash 100 ml','Himalaya','care',150,0,0.18,28),
('care-5','Hand Sanitiser','Dettol','care',85,0,0.18,7),
('care-6','Coconut Hair Oil','Parachute','care',125,5,0.18,40),
('cleaning-1','Detergent 2 kg','Surf Excel','cleaning',360,10,0.18,25),
('cleaning-2','Dishwash Gel 750 ml','Vim','cleaning',165,5,0.18,35),
('cleaning-3','Floor Cleaner 1 L','Lizol','cleaning',210,10,0.18,30),
('cleaning-4','Toilet Cleaner','Harpic','cleaning',105,0,0.18,40),
('cleaning-5','Scrub Pads (3)','Scotch-Brite','cleaning',60,0,0.18,50),
('cleaning-6','Garbage Bags','Ezee','cleaning',99,0,0.18,2),
('electronics-1','AA Batteries (4)','Duracell','electronics',180,10,0.18,40),
('electronics-2','LED Bulb 9W','Philips','electronics',120,20,0.12,50),
('electronics-3','USB-C Cable','boAt','electronics',299,33,0.18,25),
('electronics-4','Earphones','boAt','electronics',799,40,0.18,12),
('electronics-5','Extension Board','Havells','electronics',650,15,0.18,10),
('electronics-6','Power Bank 10000','Mi','electronics',1299,20,0.18,4),
('bakery-1','Brown Bread','Modern','bakery',50,0,0,30),
('bakery-2','Butter Croissant','In-house','bakery',65,0,0.05,15),
('bakery-3','Chocolate Muffin','In-house','bakery',45,0,0.05,20),
('bakery-4','Rusk 300 g','Britannia','bakery',60,5,0.05,40),
('bakery-5','Plum Cake','Winkies','bakery',120,10,0.18,8),
('bakery-6','Pav (6 pcs)','In-house','bakery',35,0,0,25)
;

-- Orders
create table public.orders (
  id text primary key,
  user_id uuid not null,
  status text not null default 'test_paid',
  payment_method text not null,
  txn_id text not null,
  coupon text,
  subtotal numeric(12,2) not null,
  coupon_discount numeric(12,2) not null default 0,
  gst numeric(12,2) not null,
  total numeric(12,2) not null,
  address jsonb,
  created_at timestamptz not null default now()
);
grant select on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "Own or admin orders" on public.orders for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders(id) on delete cascade,
  product_id text not null,
  name text not null,
  qty integer not null,
  unit_price numeric(10,2) not null,
  mrp numeric(10,2) not null,
  gst_rate numeric(5,4) not null,
  line_total numeric(12,2) not null,
  gst numeric(12,2) not null
);
grant select on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
create policy "Own or admin order items" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.has_role(auth.uid(), 'admin'))));

-- Place an order: prices are recomputed from the products table and stock is
-- decremented atomically. Mirrors src/game/pricing.ts.
create or replace function public.place_order(_items jsonb, _coupon text, _method text, _address jsonb)
returns text language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  oid text := 'FM-' || upper(to_hex((extract(epoch from now())*1000)::bigint)) || '-' || upper(substr(md5(random()::text), 1, 6));
  it jsonb; p public.products; q int; unit numeric; sub numeric := 0; disc numeric := 0; factor numeric; gst_total numeric := 0;
  c text := upper(trim(coalesce(_coupon, '')));
begin
  if uid is null then raise exception 'Sign in required'; end if;
  if jsonb_array_length(_items) = 0 then raise exception 'Basket is empty'; end if;
  create temp table _lines (product_id text, name text, qty int, unit numeric, mrp numeric, gst_rate numeric, line_total numeric) on commit drop;
  for it in select * from jsonb_array_elements(_items) loop
    q := (it->>'qty')::int;
    if q is null or q <= 0 then raise exception 'Invalid quantity'; end if;
    select * into p from public.products where id = it->>'productId' and active for update;
    if not found then raise exception 'Product % unavailable', it->>'productId'; end if;
    if p.stock < q then raise exception 'Only % left of %', p.stock, p.name; end if;
    update public.products set stock = stock - q, updated_at = now() where id = p.id;
    unit := round(p.mrp * (1 - p.discount_pct / 100), 2);
    insert into _lines values (p.id, p.name, q, unit, p.mrp, p.gst_rate, round(unit * q, 2));
    sub := sub + round(unit * q, 2);
  end loop;
  if c = 'FRESH10' and sub >= 500 then disc := round(least(sub * 0.10, 100), 2);
  elsif c = 'WELCOME50' and sub >= 999 then disc := round(least(sub * 0.50, 150), 2);
  else c := null; end if;
  factor := case when sub > 0 then (sub - disc) / sub else 0 end;
  insert into public.orders (id, user_id, payment_method, txn_id, coupon, subtotal, coupon_discount, gst, total, address)
  values (oid, uid, _method, 'TEST-' || upper(substr(md5(random()::text), 1, 12)), c, sub, disc, 0, 0, _address);
  insert into public.order_items (order_id, product_id, name, qty, unit_price, mrp, gst_rate, line_total, gst)
  select oid, product_id, name, qty, unit, mrp, gst_rate, line_total, round(line_total * factor * gst_rate, 2) from _lines;
  select coalesce(sum(gst), 0) into gst_total from public.order_items where order_id = oid;
  update public.orders set gst = gst_total, total = round(sub - disc + gst_total, 2) where id = oid;
  return oid;
end $$;
revoke all on function public.place_order(jsonb, text, text, jsonb) from public, anon;
grant execute on function public.place_order(jsonb, text, text, jsonb) to authenticated;

alter publication supabase_realtime add table public.products;