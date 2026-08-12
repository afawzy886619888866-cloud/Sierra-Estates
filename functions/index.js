const { collectData } = require('./collectData');
const { processDataForApp } = require('./processData');

exports.collectData = collectData;
exports.processDataForApp = processDataForApp;

console.log('✅ Sierra Estates backend functions loaded: collectData, processDataForApp');
