'use strict'
var levenshtein = require('./levenshtein.js');
var nodejieba = require("nodejieba");
var pagerank = require('./pagerank.js');
var isummary = require('./isummary.js');
var stringSimilarity = require('string-similarity');

const summary_clear_rules = [
	[/^编者按：/,''],
	[/^[^，日天前]{1,4}，/,''],
	[/^“/,''],
	[/^其该此而[^，]{1,10}，/,''],
	[/^[并且至于而]+/,'']
]

class Summarizer{
	constructor(shingle,filter){
		this.shingle = shingle;
		this.filter = filter;
	}

	splitToParagraphs(content){
		return content.split('\n\n');
	}

	splitToSentences(content){
		return content.split(/(?:\n|\u3002|\uff1f|\uff01)/g);
	}

	splitToTerms(content){
		let self = this;
		let terms = [];
		let ps = Array.isArray(content)?content:self.splitToParagraphs(content);
		for(let x of ps){
			let sens = self.splitToSentences(x);
			let parag = [];
			for(let y of sens){
				let sentens = [];
				for(let z of nodejieba.cut(y.trim()))sentens.push(z);
			    if(sentens.length>0){
			    	if(sentens[sentens.length-1]!='。')sentens.push('。');
			    	parag.push(sentens);
			    }
			}
			if(parag.length>0)terms.push(parag);
		}
		return terms;
	}

	splitToWords(content){
		return nodejieba.cut(content);
	}

	getSimilarityGraph(sentences){
		var graph = new Array();
	    for(let s of sentences) {
	      let sentenceSimilarity = new Array();
	      for(let t of sentences) {
	        sentenceSimilarity.push(levenshtein.get(s, t));
	      }
	      graph.push(sentenceSimilarity);
	    }
	    return graph;
	}

	getTextRank(graph){
		return pagerank.Pagerank(graph, 0.85, 0.0001, function (err, res) {
	      if (err) throw new Error(err)
	    });
	}

	isValidateSentence(charArr){
		if(!charArr)return false;
		let slen=0,dlen = 0;  
	    for (let i=0; i<charArr.length; i++) {  
		     let c = charArr[i].charCodeAt();   
		     if ((c >= 0x0001 && c <= 0x007e) || (0xff60<=c && c<=0xff9f)) {   
		       	slen++;
		     }else {
		      	dlen++;   
		     }   
	    }
	    if(slen > dlen)return false;
	    let ok = true;
	    if(this.filter){
	    	let sentense = charArr.join('');
	    	for(let rule of this.filter){
	    		if(new RegExp(rule,'ig').test(sentense)){
	    			ok = false;
	    			break;
	    		}
	    	}
	    }
	    return ok;
	}

	score(sentence_rank, model_score, title_similarity, len_score){
		// return Math.pow(sentence_rank, 0.35) * Math.pow(model_score, 0.35) * Math.pow(title_similarity, 0.1) * Math.pow(len_score, 0.2);
		// return Math.pow(sentence_rank, 10) * Math.pow(model_score, 10)
		// console.log(sentence_rank, model_score, title_similarity, len_score);
		// return Math.pow(sentence_rank, 10) * Math.pow(Math.min(model_score, 0.7), 10) * Math.pow(title_similarity, 1) * Math.pow(len_score, 1);
		// let final_score = Math.ceil(sentence_rank* 1000)*100000 + Math.ceil(len_score*1000)*100 + Math.ceil(model_score*100) + Math.ceil(title_similarity * 10);
		let final_score = sentence_rank * 0.5 + len_score*0.2 + model_score*0.2 + title_similarity * 0.1;
		// console.log("score=>",final_score);
		return final_score
	}

	summarize(content, expected_length, title){
	    let terms = this.splitToTerms(content);
	    let cursor = 0;
	    let sentences = [];
	    let spaces_title = title ? nodejieba.cut(title.trim()).join(' ') : [];
	    for(let x = 0;x<terms.length;x++){
	    	for(let y = 0;y<terms[x].length;y++){
	    		if(this.shingle){
	    			let sentence = [];
		    		let cu_size = 0;
		    		let max_covered = 0;
		    		for(let z=y;z<terms[x].length;z++){
		    			cu_size += terms[x][z].length;
		    			if(z>y && cu_size>expected_length*1)break;
		    			else {sentence = sentence.concat(terms[x][z]);}
		    			max_covered = z;
		    		}
		    		sentences.push(sentence);
		    		if(max_covered >= terms[x].length-1)break;
	    		}else sentences.push(terms[x][y]);
	    	}
	    }


	    let similarityGraph = this.getSimilarityGraph(sentences);
	    let textRank = this.getTextRank(similarityGraph).probabilityNodes;
	    
	    let copied_rank = [];
	    let len_arr = sentences.map(_=>_.length);
	    let max_len = Math.max(...len_arr);
	    for(let i=0;i<textRank.length;i++){
	    	let origin_setence = sentences[i].join('');
	    	let spaces_setence = sentences[i].join(' ');
	    	let title_similarity = spaces_title.length>0 ? stringSimilarity.compareTwoStrings(spaces_title, spaces_setence) : 0.1;
	    	let len_score = sentences[i].length * 1.0 / max_len;
	    	let score = this.score(textRank[i], isummary.rank(origin_setence), title_similarity, len_score)
	    	copied_rank.push([score, i]);
	    }
	    copied_rank.sort((a,b)=> b[0] - a[0]);

	    let selectIndex = [];
	    let summary_size = 0;
	    let forb_rules = [];
	    for(let i=0;i<copied_rank.length;i++){
	    	let ordinal = copied_rank[i][1];
	    	if(this.isValidateSentence(sentences[ordinal])){
	    		summary_size += sentences[ordinal].length;
		    	if(selectIndex.length>0){
		    		if(summary_size>expected_length*1)break;
		    		else selectIndex.push(ordinal);
		    	}else selectIndex.push(ordinal);
	    	}
	    }
	    selectIndex.sort(function(a, b) {
		  return a - b;
		});
	    let selectSentences = [];
	    for(let i of selectIndex)selectSentences.push(sentences[i].join(''));
	 	let f_ret = selectSentences.join('...');
	 	for(let r of summary_clear_rules){
	 		f_ret = f_ret.replace(...r);
	 	}
	    return f_ret;
	}
}

module.exports = Summarizer;

/*
let summarizer = new Summarizer(true);

var content  = '一线楼市“调控风”来袭\n\n去年以来深圳、上海房价上涨迅速，除了流动性相对宽裕、供应量下降及3·30新政等因素外，“首付贷”等操作也助涨市场。相关部门嗅到了其中被放大的购房杠杆风险。3月25日，上海发布《关于进一步完善本市住房市场体系和保障体系促进房地产市场平稳健康发展的若干意见》（下称“沪九条”），非沪籍限购“2改5”确定，上海二套房首付比例提高。当晚，深圳也发布新政，提高限购门槛和二套房首付比例。这标志着一线城市房地产调控的再次收紧。而除了一线城市的上海和深圳，重点二线城市中的武汉和南京也已出台楼市新政。\n\n本报记者张晓玲何苗实习记者杨悦祺上海、深圳报道\n\n纵观一线城市的调控政策，核心其实就是限购和限贷两条。随着沪深两地明里暗里的调控，同为一线城市的北京和广州风声渐紧。从非户籍人口购房需缴纳的社保年限来看，北京和上海需要连续缴纳5年及以上，但上海还要求必须是“家庭购房”，即已婚，单身人士被排除在外。这一条，比北京更严。\n\n彻夜未眠！\n\n从下午6点开始，在中介的签约室排队等合同网签，直到晚上11点才签上，中间网签系统“瘫痪一次”，对于上海的年轻购房者陈嘉来说，3月24日是“战斗般”的一天。\n\n与陈嘉一样战斗的，还有上海郊环线外的房产中介们。经纪人徐伟在当晚零点才拖着疲惫的身躯回家，但在后半夜，他仍不断接到客户的电话，整夜未眠。\n\n3月25日一早，上海即出台“沪九条”，大幅提高了购房资格和首付比例。赶在新政前买房的人们，心中不知是喜是忧？\n\n自2014年央行9·30新政以来，一年半时间内，一线城市受惠于信贷宽松和首付下调，房价出现了大幅飙升，尤其是深圳和上海，其中更出现了裹挟着互联网金融的“首付贷”，再次放大了购房杠杆，刺激了投资投机需求大量入市。\n\n相关部门嗅到了其中的风险。实际上，在上海此次新政之前，一线城市的“降杠杆”行动已在进行。业内预计接下来，北京甚至房价温和的广州，相关政策都会有所调整。\n\n上海成调控最严城市\n\n3月25日，上海发布《关于进一步完善本市住房市场体系和保障体系促进房地产市场平稳健康发展的若干意见》（下称“沪九条”）。\n\n核心调控政策主要集中于前两条：一是从严执行住房限购政策。非沪籍居民购房缴纳社保从2年调整为连续缴满5年及以上；二是对拥有1套住房的居民家庭，再次申请商业个贷的首付款比例不低于50%；购买非普通住房的，首付款比例不低于70%。\n\n这是对需求端的调控。而在开发商端，此前上海已通过收紧高端楼盘预售许可等措施来进行调控。\n\n这标志着，继深圳、北京打击“首付贷”之后，一线城市房地产调控的再次收紧。政策出台与上海市场表现紧密相关。\n\n同策咨询研究部数据显示，2016年1-2月上海商品住宅成交面积分别为134万平方米、79万平方米，截至3月21日，3月份上海商品住宅成交量已高达136万平方米，预计3月上海商品住宅成交量会突破230万平方米。\n\n按照这样的预估值来计算，2016年一季度上海商品住宅成交量将超过440万平方米，这是前所未有的。且在新房和二手房价格的涨幅上，上海越来越有“冠军相”。\n\n新城控股(14.230,0.05,0.35%)副总裁欧阳捷表示，上海房价疯涨主要是因为三个因素，供求矛盾、货币廉价和投资避险，这三个因素有的是上海市政府能够控制的，有些是控制不了的。\n\n“上海只能在供求矛盾上去下功夫，想办法增加供应，比如在土地出让合同中增加中小套型的供应比例，或适当提高容积率；而在需求端，控制需求是一直以来调控的主要思路，此次政策最主要的落点也就在于控制需求方面”，欧阳捷说。\n\n上海官方亦表示，今年的土地管理中，会加大土地的供应，确保“十三五”供地总量不会低于“十二五”，而且会有所增加。2016年的商品房土地供应量比2015年提高169公顷。不过，产生的效果可能在明年或者后年才能显现。\n\n同策咨询研究部总监张宏伟预计，从历次上海楼市调控政策面从严开始的月份计算，大约7个月左右时间上海楼市的成交量将跌入低谷期，从这个时间点来判断，10月份将是此次新政后上海楼市成交量跌入低谷期的时间段；10月份为了激活市场成交量，或者部分房企因为资金面的问题，上海楼市可能会出现开发商以价换量的局面。\n\n一线城市集体去杠杆\n\n纵观一线城市的调控政策，核心其实就是限购和限贷两条。\n\n随着沪深两地明里暗里的调控，同为一线城市的北京和广州风声渐紧。\n\n从非户籍人口购房需缴纳的社保年限来看，北京和上海需要连续缴纳5年及以上，但上海还要求必须是“家庭购房”，即已婚，单身人士被排除在外。这一条，比北京更严。\n\n广州则要求符合5年内在本市连续缴纳3年以上个人所得税或社会保险，深圳目前只需缴纳1年社保，在四大城市里是最宽松的。\n\n3月25日晚，深圳新政突袭出台，大幅提高了购房门槛：本市户籍居民家庭限购2套住房；非本市户籍能提供3年及以上个税或社保证明的，限购1套住房。\n\n此外，从二套房首付比例来看，根据330新政，四个一线城市申请首套房商业贷款首付款比例不低于30%，二套房商业贷款首付比不低于40%。\n\n但在执行层面，四个城市表现不一。融360本月初的报告显示，广州对二套房的限制最严格，首付达到7成，上海对二套房购房者最为宽松，四五成首付为主，北京的首付比例以五六成为主，深圳是六七成为主。\n\n记者从北京中介机构伟嘉安捷了解到，北京地区除兴业银行(15.520,0.05,0.32%)和中信银行(6.000,0.02,0.33%)两家的“二套房”首付比例为60%，其他各银行的二套房首付比例均为50%；另据融360消息，有极个别银行可以做到40%。\n\n融360房贷分析师胡飞船表示，广州首付比例一直严格控制，这也是2015年广州楼市价格变动幅度较小的主要原因。但对于北上深，较低的首付则再次刺激了投资客的大幅增加。\n\n而此次上海调整后，二套房商业贷款购买普通住房的首付比例加到了50%，购买非普通自住房的，首付款比例要求不低于70%。\n\n尽管在多数业内人士看来，北京和广州跟进收紧调控的余地并不太大，但上海这条二套房首付提高、收紧的政策，很大可能会被其他城市效仿写进文件。\n\n而在深圳的新政中，也提高了二套房的首付比例，对购房人家庭名下在本市无房但近2年内有住房贷款记录的或在本市已有一套住房但已结清相应住房贷款的，贷款首付比例执行最低4成。\n\n这被业内人士视为一线城市调控正在向3·30新政甚至9·30新政之前的回归。对从未取消限购的一线城市而言，2014年的9·30新政核心是放宽首套房认定，已有一套房结清贷款依然可认定为首套房，从而降低了首付比例；而2015年的3·30新政进一步放宽二套房贷款，二套房商业贷款从此前的7成首付降低为4成首付。\n\n至此，一年半时间内，二套房首付比例从7成到4成再到5成，一线城市经历了从加杠杆到降杠杆的过程。“在实际执行中，几个大城市很多项目银行都要求二套房首付7成了。”一位大型开发商内部人士说。\n\n狙击投机防范风险\n\n从上海和深圳各个政府部门的表态来看，收紧楼市调控，在于看到其中的投机需求、非理性需求太多了。\n\n“我们要控制一些过早释放的需求。因此无论贷款是否结清都视同第二套房”，在“沪九条”出台后，央行上海总部调查统计研究部主任王振营如此解释。\n\n2015年下半年以来上海楼市的火爆行情中，价格推涨带来的恐慌性入市也占了一定比例，在上海市住建委主任顾金山看来，这是提前透支了一部分需求。同时，市场上房东毁约、跳价的现象频现，“确实是非理性上涨”，他说。\n\n3月2日，深圳市金融办下发“防范房地产行业金融风险”的函件，要求相关单位对P2P、小贷公司涉及众筹买房、“首付贷”或其他涉及高杠杆放贷的情况进行摸底排查。\n\n18日，深圳市互联网金融协会发出通知，要求相关企业严禁新开展“众筹炒楼”业务，对于存量业务，立即停止募集并清理。\n\n一份深圳房产经纪行业协会名为《深圳房价飙升的动因分析》的分析报告显示，2015年的深圳楼市，能借助的金融工具多了，因此看上去可以支付的总价更高了，但这里隐含了金融泡沫的魅影。';

var k = summarizer.summarize(content, 200, '一线楼市“调控风”来袭');
console.dir(k);
*/