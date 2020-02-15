SET TIME ZONE 'UTC';
create extension if not exists "uuid-ossp";
create extension if not exists "tablefunc";

drop table if exists users;
create table users(
  id varchar default (uuid_generate_v4()::varchar) primary key,
  email varchar,
  profile json,
  created_at timestamp without time zone default (now() at time zone 'utc')
);
