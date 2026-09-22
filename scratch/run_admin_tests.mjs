import pkg from '@next/env';
const { loadEnvConfig } = pkg;
loadEnvConfig(process.cwd());

import('../tests/admin.test.mjs');
