import * as dotenv from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

const isDev = existsSync(resolve(process.cwd(), '.env.development'));
if (isDev) console.log('Running in dev mode');
dotenv.config({ path: isDev ? resolve(process.cwd(), '.env.development') : resolve(process.cwd(), '.env') });
