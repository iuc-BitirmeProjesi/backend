import { LibSQLDatabase } from 'drizzle-orm/libsql/driver-core';
import { payloadType } from './modules/auth/types';

type Env = {};

export type Variables = {
    db: LibSQLDatabase;
    jwtPayload: payloadType;
};
