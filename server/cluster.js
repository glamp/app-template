// if (process.env.NODE_ENV==='production') {
//   require('newrelic');
// }

// have to do this first because we set the AWS region via an ENV
if (process.env.NODE_ENV!=='production') {
  console.log(`[INFO]: Loading .env`);
  require('dotenv').config();
}

const cluster = require('cluster');
const os = require('os');


// Code to run if we're in the master process
if (cluster.isMaster) {
  const cpuCount = os.cpus().length;

  // Create a worker for each CPU
  const nWorkers = parseInt(process.env.WEB_CONCURRENCY || 1, 10);
  console.log('=====================================');
  console.log(`RUNNING IN CLUSTERED MODE`);
  console.log(`\tWEB_CONCURRENCY=${nWorkers}`);
  console.log('=====================================');
  for (let i = 0; i < nWorkers; i += 1) {
    cluster.fork();
  }
} else {
  // run server
  console.info(`[INFO]: starting worker process: ${cluster.worker.id}`);
  console.info('[INFO]: launching server');
  console.info('=============================================');
  require('./index');
}
