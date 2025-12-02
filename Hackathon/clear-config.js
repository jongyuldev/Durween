// Clear the cached config including old API key
const Store = require('electron-store');
const store = new Store();

console.log('Current config:', store.store);
console.log('\nClearing ALL config...');
store.clear();
console.log('Cleared!');
console.log('\nNew config:', store.store);
