# arex
node.js实现自动提取文章正文， 标题， 发布日期。自动生成文章摘要.

#安装
```shell
npm install arex
```

#使用例子:
```javascript
var arex = require('arex');
//example 1
arex.get_article('http://finance.sina.com.cn/consume/puguangtai/2016-03-15/doc-ifxqhmve9227502.shtml',120,(err,result)=>{
                //120: summary limited, if you do not need summary set it to false.
		//result: {"title":"...","content":"....", "summary":"...", "pubdate":"..."}
		console.log(result['content']);
	});


//example 2
var result = arex.get_article_sync('<html>.......</html>',120);
```

#测试

##获取源码
```shell
git clone https://github.com/ahkimkoo/arex.git
```

##测试某个网页的抽取
```shell
cd arex
npm install
node test/test.js http://finance.sina.com.cn/consume/puguangtai/2016-03-15/doc-ifxqhmve9227502.shtml 120
```
120表示期望文摘的长度

##算法说明
* 正文抽取: 基于行块密度分布来抽取正文， 每个行块由若干自然段落组成。
* 标题抽取: 分别从正文附近抽取h1标签，从title标签取值，取最可能是标题的那一个。
* 发布日期抽取: 用正则表达式抽取正文附近的日期。（有误差）。
* 自动文摘: sentense rank算法，参照pagerank算法的实现，可以指定期望的文摘长度。




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
arex.get_article('http://finance.sina.com.cn/consume/puguangtai/2016-03-15/doc-ifxqhmve9227502.shtml',120,(err,result)=>{
                //120: summary limited, if you do not need summary set it to false.
		//result: {"title":"...","content":"....", "summary":"...", "pubdate":"..."}
		console.log(result['content']);
	});


//example 2
var result = arex.get_article_sync('<html>.......</html>',120);
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
node test/test.js http://finance.sina.com.cn/consume/puguangtai/2016-03-15/doc-ifxqhmve9227502.shtml 120
```

##About algorithm
* article extractor: based density of article blocks， a bock consists of a number of natual lines.
* title extracor: h1 tag or title tag, choose the best one.
* pubdate extractor: regex extraction nearby the begging or article.
* summarizer: based sentense rank, similar pagerank.