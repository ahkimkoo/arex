# arex
node.js article extractor, automatic summarization.

#Install
```shell
npm install arex
```

#Usage:
```javascript
var arex = require('arex');
//example 1
arex.get_article('http://finance.sina.com.cn/consume/puguangtai/2016-03-15/doc-ifxqhmve9227502.shtml',(err,result)=>{
		//result: {"title":"...","content":"....", "summary":"...", "pubdate":"..."}
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

##About algorithm
* article extractor: based density of article blocks， a bock consists of a number of natual lines.
* title extracot: h1 tag or title tag, choose the best one.
* pubdate extractor: regex extraction nearby the begging or article.
* summarizer: based sentense rank, similar pagerank.
