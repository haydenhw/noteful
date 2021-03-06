CREATE TABLE folders(
  id  integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
  name varchar(50) NOT NULL
);

CREATE TABLE notes(
  id integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
  folder_id integer NOT NULL,
  FOREIGN KEY (folder_id) REFERENCES folders(id) ON UPDATE CASCADE ON DELETE CASCADE,
  name varchar(50) NOT NULL,
  content text NOT NULL,
  time_modified bigint NOT NULL
);
