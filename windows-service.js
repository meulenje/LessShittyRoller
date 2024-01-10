const Service = require('node-windows').Service;
const svc = new Service({
  name: 'Less Shitty Roller',
  description: 'Dice roller for Discord tabletop',
  script: 'C:\\Projects\\LessShittyRoller\\index.js'
});
svc.on('install', () => {
  svc.start();
});
svc.install();