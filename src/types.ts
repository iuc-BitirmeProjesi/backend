import { LibSQLDatabase } from 'drizzle-orm/libsql/driver-core';

type Env = {};

export type Variables = {
    db: LibSQLDatabase;
};
