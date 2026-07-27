const next = require('next');
const app = next({ dev: true, hostname: 'localhost', port: 3000 });
app.prepare().then(() => {
  console.log("MONGODB_URI:", process.env.MONGODB_URI);
  process.exit(0);
});
