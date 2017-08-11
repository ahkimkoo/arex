'use strict'
const httpreq = require('./httprequest.js');
const Summarizer = require('./node-summary.js');
const summarizer = new Summarizer(true);

/**
 * get page html via http.get
 * @param  {[string]}   url      [link]
 * @param  {Function} callback [description]
 * @return {[string]}            [html string]
 */
const get_page = function(url,callback){
	http.get(url, (res) => {
	  	var body = '';
		res.on('data', function(d) {
		    body += d;
		});
		res.on('end', function() {
			callback(null,body);
		});
	}).on('error', (e) => {
		console.error(`Got error: ${e.message}`);
		callback(e);
	});
}

/**
 * get blocks that split by block tag
 * @param  {[string]} html [html string]
 * @return {[array]}      [blolck array]
 */
const get_blocks = function(html){
	const line_break_tags = ['address','article','aside','audio','blockquote','canvas',
						'dd','div','dl','fieldset','figcaption','figure','footer','form',
						'h1','h2','h3','h4','h5','h6','header','hgroup','hr','noscript','ol','output','p','pre','section',
						'table','tr','tfoot','ul','video','img','br'];
	const splter = line_break_tags.join('|');	
	html = html.replace(/<!--[\s\S]*?-->/igm,'');
	html = html.replace(/<script[\s\S]*?<\/script>/igm,'');
	html = html.replace(/<style[\s\S]*?<\/style>/igm,'');
	html = html.replace(/[\n\t\r]+/igm,'');
	let split_regx = new RegExp('(<(?:'+splter+')[^>]*?>)','ig');
	html = html.replace(split_regx,'\n$1');
	html = html.replace(/<\/?[^>]*?>/ig,'');
	html = html.replace(/&[a-zA-Z#]+;/ig,'');
	let paragraphs = html.split('\n');
	return  paragraphs.map(line=>{
		return line.replace(/\s{2,}/gm,' ').replace(/^\s+$/gm,'');
	});
}

/**
 * Specify deepth n, block score is the length from the block to the following n block.
 * @param  {[type]} blocks [description]
 * @param  {[type]} deep   [description]
 * @return {[Array]}        [score of each block]
 */
const get_block_score = function(blocks, deep){
	let block_score = [];
	for(let i=0;i<blocks.length-deep;i++){
		let score = 0;
		for(let ix=i; ix<i+deep; ix++){
			score += blocks[ix].length;
		}
		block_score[i] = score;
	}
	return block_score;
}

/**
 * dump test js file
 * @param  {[type]} block       [description]
 * @param  {[type]} block_score [description]
 * @return {[type]}             [description]
 */
const dump_test_file = (blocks, blocks_score, position) =>{
	let fs = require('fs');
	let path = require('path');
	let filepath = path.resolve(__dirname,'..','test','line-data.js');
	fs.writeFileSync(filepath, `var blocks = ${JSON.stringify(blocks)};\n`,{'encoding':'utf-8', 'flag':'w+'});
	let blocks_length = blocks.map(function(x) {
	   return x.length;
	});
	fs.writeFileSync(filepath, `var blocks_length = ${JSON.stringify(blocks_length)};\n`,{'encoding':'utf-8', 'flag':'a+'});
	fs.writeFileSync(filepath, `var blocks_score = ${JSON.stringify(blocks_score)};\n`,{'encoding':'utf-8', 'flag':'a+'});
	fs.writeFileSync(filepath, `var position = ${JSON.stringify(position)};\n`,{'encoding':'utf-8', 'flag':'a+'});
}

/**
 * Block group that split by tripple blank block
 * @param  {[type]} block_score [description]
 * @return {[array]}             block group[start pisition, end position, rate]
 */
const jedge_article_block = function(block_score){
	// for(let i=0;i<block_score.length;i++){
	// 	let point = '';
	// 	for(var x=0;x<block_score[i];x++)point+='.';
	// 	console.log(`${i}:${block_score[i]}${point}=>${blocks[i].substring(0,20)}#`);
	// }
	let block_groups = [];
	let seek_start = true;
	let start_point = 0;
	let total_length = 0;
	let max_block_length = 0;
	for(let i=0;i<block_score.length;i++){
		max_block_length = Math.max(max_block_length, block_score[i]);
		if(block_score[i]>0){
			if(seek_start){
				start_point = i;
				seek_start = false;
			}
			total_length += block_score[i];
		}else{
			if(!seek_start){
				let rate = Math.pow(max_block_length,2) / (total_length/(i-start_point));
				block_groups.push([start_point,i,rate]);
				seek_start = true;
				total_length = 0;
				max_block_length = 0;
			}
		}
	}
	block_groups.sort((a,b)=>{
		return b[2]-a[2];
	})
	return block_groups;
}

/**
 * get article title
 * @param  {[type]} html [description]
 * @return {[type]}      [description]
 */
const get_title = function(html){
	let h1_regex = new RegExp('<h1[^>]*?>([^<]+)</h1>','i');
	let h1_matched = h1_regex.exec(html);

	let title_regex = new RegExp('<title[^>]*?>([^<]+)</title>','i');
	let title_matched = title_regex.exec(html);

	let title = (h1_matched && h1_matched.length>1) ? h1_matched[1] : ((title_matched && title_matched.length)>1 ? title_matched[1] : '');

	if(h1_matched&&h1_matched.length>1&&title_matched && title_matched.length){
		if(title_matched[1].replace(/(?:\n|\r)/gm,'').indexOf(h1_matched[1].replace(/(?:\n|\r)/gm,'').substring(0,10))<0)title = title_matched[1];
	}
	return title.replace(/(?:\n|\r)/gm,'');
}

/**
 * get pubdate by regex
 * @param  {[type]} html [description]
 * @return {[type]}      [description]
 */
const get_pubdate = function(html){
	let pubdate = '';
	html = html.replace(/<!--[\s\S]*?-->/igm,'');
	html = html.replace(/<script[\s\S]*?<\/script>/igm,'');
	html = html.replace(/<style[\s\S]*?<\/style>/igm,'');
	let pb_regex = new RegExp('([\\d\\-\u5e74\u6708\u65e5]{8,15}\\s?\\d{1,2}(?:\:|\：)\\d{1,2})','img');
	let matched = pb_regex.exec(html);
	if(matched&&matched.length>1)pubdate = matched[1];
	return pubdate;
}

/**
 * get pubdate that closed to article.
 * @param  {[type]} blocks    [description]
 * @param  {[type]} start_pos [description]
 * @return {[type]}           [description]
 */
const get_pubdate_base_block = function(blocks,start_pos){
	let pubdate = '';
	let pb_regex = new RegExp('(\\d{4}(?:\\-|\\u5e74)\\d{1,2}(?:\\-|\\u6708)\\d{1,2}[\\s\\u65e5\\d\\:]*)','img');
	for(let i=start_pos;i>=0;i--){
		let matched = pb_regex.exec(blocks[i]);
		if(matched&&matched.length>1){
			pubdate = matched[1];
			break;
		}
	}
	return pubdate;
}

/**
 * filter none content tags
 * @param  {[type]} html [description]
 * @return {[type]}      [description]
 */
const filterNoneContentTags = function(html){
	return html
	.replace(/<script[\s\S]*?\/script>/img,'')
	.replace(/<!--[\s\S]*?-->/img,'')
	.replace(/<style[\s\S]*?\/style>/img,'')
	.replace(/<script[^>]+?>/ig,'')
	.replace(/<!--[^>]+?>/ig,'')
	.replace(/<input[^>]+?>/ig,'')
	.replace(/<img.*?>/ig,'\n')
	.replace(/<a[^>]*?>[^(<\/a>)]{10,}<\/a>/igm,'')
	.replace(/[\n ]+/ig,'\n')
	.replace(/[\n]{4,}/ig,'\n\n\n');
}

/**
 * get article info synchornized
 * @param  {[string]} html      [html string]
 * @param  {[int]} summarize [expected summary length]
 * @return {[object]}           [article info{'content','title','pubdate','summary','content_html','author'}]
 */
const get_article_sync = function(html, summarize){
	let body = html.replace(/^[\s\S]*(<body[\s\S]*?<\/body>)[\s\S]*$/img,'$1');
	body = filterNoneContentTags(body);
	let blocks = get_blocks(body);
	let block_score  = get_block_score(blocks,3);
	let grate = jedge_article_block(block_score);
	let article_content = grate.length>0?blocks.slice(grate[0][0],grate[0][1]):blocks;
	// dump_test_file(blocks,block_score,grate[0]);
	return {
		'content' : article_content.join('\n'),
		'title' : get_title(html),
		'pubdate' : grate.length>0?get_pubdate_base_block(blocks, grate[0][0]):get_pubdate(html),
		'summary' : summarize?summarizer.summarize(article_content,Number.isInteger(summarize)?summarize:200):''
	}
}

/**
 * get article info, wrapper of get_article_sync
 * @param  {[string]}   url       [url]
 * @param  {[int]}   summarize [expected summary length]
 * @param  {Function} callback  [call back function]
 * @return {[type]}             [description]
 */
const get_article = function(url, summarize, callback){
	httpreq.get(url,(err,body)=>{
		if(err)callback(err,{});
		else callback(null,get_article_sync(body, summarize));
	});
}

exports.summarize = function(content, exptd_len=120, shingle=false, min=150, max=350){
	content = filterNoneContentTags(content);
	let blocks = get_blocks(content); 
	if(exptd_len<1 && exptd_len>0){
		exptd_len = parseInt(blocks.join('').length * exptd_len);
		if(exptd_len<min)exptd_len=min;
		if(exptd_len>max)exptd_len=max;
	}
	content　= blocks.join('\n');
	let summarizer = new Summarizer(shingle);
	return summarizer.summarize(content, exptd_len);
}

exports.get_article_sync = get_article_sync;
exports.get_article = get_article;