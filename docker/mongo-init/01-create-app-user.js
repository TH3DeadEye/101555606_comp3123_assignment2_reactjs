// Runs once, the first time MongoDB starts with an empty data volume.
//
// The root account created from MONGO_INITDB_ROOT_USERNAME is only needed for
// this set-up. The backend and mongo-express use a separate account that can
// read and write the application database and nothing else.
const dbName = process.env.MONGO_DB;
const user = process.env.MONGO_APP_USER;
const password = process.env.MONGO_APP_PASSWORD;

if (!dbName || !user || !password) {
  throw new Error('MONGO_DB, MONGO_APP_USER and MONGO_APP_PASSWORD must be set in the .env file');
}

db.getSiblingDB(dbName).createUser({
  user,
  pwd: password,
  roles: [{ role: 'readWrite', db: dbName }],
});

print(`Created the database user "${user}" with read/write access to "${dbName}" only`);
