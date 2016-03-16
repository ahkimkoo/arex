# arex
node.js article extractor

#Install
```shell
npm install arex
```

#Usage:
```javascript
var arex = require('arex');
//example 1
arex.get_article('http://finance.sina.com.cn/consume/puguangtai/2016-03-15/doc-ifxqhmve9227502.shtml',(err,result)=>{
		console.log(result['content']);
	});

//example 2
var result = arex.get_article_sync('<html>.......</html>');
```

#Test

##get source
```shell
git clone https://github.com/ahkimkoo/arex.git
```

##test link
```shell
cd arex
npm install
node test/test.js http://finance.sina.com.cn/consume/puguangtai/2016-03-15/doc-ifxqhmve9227502.shtml
```