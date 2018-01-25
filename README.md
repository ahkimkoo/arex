# arex
node.js实现自动提取文章正文， 标题， 发布日期。自动生成文章摘要.

#安装
```shell
npm install arex
```

#使用例子:
```javascript
var arex = require('arex');
//example 1, 给定网址自动抓取，提取正文，生成摘要
arex.get_article('http://finance.sina.com.cn/consume/puguangtai/2016-03-15/doc-ifxqhmve9227502.shtml',120,(err,result)=>{
                //120: 摘要长度为120，如果不需要生成摘要此参数传入false.
		//result: {"title":"...","content":"....", "summary":"...", "pubdate":"..."}
		console.log(result['content']);
});

//example 2, 给html内容，提取正文，生成摘要
result = arex.get_article_sync('<html.........</html>',120);//result: {"title":"...","content":"....", "summary":"...", "pubdate":"..."}

//example 3, 给html内容，生成摘要
//summarize(content, exptd_len=120, shingle=false, min=150, max=350, filter=[], title)
//shingle的意义: 以摘要长度的句子组合为单位计算权重，shingle为false则以自然句为单位计算权重, filter是过滤规则，符合规则的段落都会被过滤不作为摘要
var summary = arex.summarize('<html>.......</html>', 120, true);
var summary = arex.summarize('<html>.......</html>', 0.04, true, 100, 300);//摘要长度比例 4%, 最短 100, 最长 300
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
* 自动文摘: sentense rank算法，参照pagerank算法的实现，可以指定期望的文摘长度。优化点：加入了神经网络模型判断一句话是否适合作为摘要。




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
result = arex.get_article_sync('<html.........</html>',120);//result: {"title":"...","content":"....", "summary":"...", "pubdate":"..."}

//example 3
//summarize(content, exptd_len=120, shingle=false, min=150, max=350, filter=[], title)
var summary = arex.summarize('<html>.......</html>', 120, true);
var summary = arex.summarize('<html>.......</html>', 0.04, true, 100, 300);//summary ratio 4%, min length 100, max length 300
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
* summarizer: based sentense rank, similar pagerank. Optimization: neural network model to determine whether a sentence is suitable as a summary.
