import { app, query, errorHandler } from 'mu';

const { exec } = require('child_process');

console.log("Welcome to the mu-search testing framework")

console.log('"***Warning*** This will run queries on the triplestore and delete containers, you have 3 seconds to press ctrl+c')


function command(cmd){
    exec(cmd, (err, stdout, stderr) => {
        if (err) {
            console.log(`Error: ${stderr}`);
            return;
        }

        console.log(stdout);
    });
}

setTimeout( () => {}, 3000)

command('cd /dkr');
command('docker ps')
