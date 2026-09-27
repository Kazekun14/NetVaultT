// Set a valid test-only key before encryption modules load; never edit the real .env.
process.env.NETVAULT_MASTER_KEY = 'ab'.repeat(32);
