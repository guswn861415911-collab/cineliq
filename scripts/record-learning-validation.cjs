// Run only after the unit tests and matching browser rendering audit succeed.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const report=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const ledgerPath=path.join(root,'content/learning-status.json');
const ledger=JSON.parse(fs.readFileSync(ledgerPath,'utf8'));
const hash=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'full-learning-data.js'))).digest('hex');
assert.equal(report.testedDataSha256,hash,'Browser report must match the current generated data');
assert.equal(report.count,ledger.items.length);
const ids=new Set(report.checkedIds);
assert.equal(ids.size,ledger.items.length);
for(const item of ledger.items){
  assert.ok(ids.has(item.id));
  item.contentAccuracy.schemaAndMotionRules='checked';
  item.siteDisplay='edge-dom-and-responsive-checked';
}
ledger.validation={dataSha256:hash,engine:report.engine,widths:report.widths,contentRuleChecks:ledger.items.length,siteDisplayChecks:ledger.items.length,modelExecutions:0,independentExpertReviews:0,nativeDevice:false,modelGeneration:false,scope:report.scope};
fs.writeFileSync(ledgerPath,JSON.stringify(ledger,null,2)+'\n');
fs.writeFileSync(path.join(root,'content/learning-validation.json'),JSON.stringify(report,null,2)+'\n');
console.log('Recorded rendering and rule checks for '+ledger.items.length+' IDs; model/device/expert status unchanged.');
