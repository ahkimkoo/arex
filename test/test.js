var arex = require('../lib/arex.js');

if(process.argv.length>2){
	arex.get_article(process.argv[2],(err,result)=>{
		console.log(result['content']);
	});
}else console.log('useage: node test.js [link]');