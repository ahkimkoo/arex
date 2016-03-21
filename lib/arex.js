'use strict'
const httpreq = require('./httprequest.js');

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

const get_blocks = function(html){
	const line_break_tags = ['address','article','aside','audio','blockquote','canvas',
						'dd','div','dl','fieldset','figcaption','figure','footer','form',
						'h1','h2','h3','h4','h5','h6','header','hgroup','hr','noscript','ol','output','p','pre','section',
						'table','tr','tfoot','ul','video','img','br'];
	const splter = line_break_tags.join('|');	
	html = html.replace(/<!--[\s\S]*?-->/igm,'');
	html = html.replace(/<script[\s\S]*?<\/script>/igm,'');
	html = html.replace(/<style[\s\S]*?<\/style>/igm,'');
	let split_regx = new RegExp('(<(?:'+splter+')[^>]*?>)','ig');
	html = html.replace(split_regx,'\n$1');
	html = html.replace(/<\/?[^>]*?>/ig,'');
	html = html.replace(/&[a-zA-Z]+;/ig,'');
	let paragraphs = html.split('\n');
	return  paragraphs.map(line=>{
		return line.replace(/\s{2,}/gm,' ').replace(/^\s+$/gm,'');
	});
}

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
	for(let i=0;i<block_score.length;i++){
		if(block_score[i]>0){
			if(seek_start){
				start_point = i;
				seek_start = false;
			}
			total_length += block_score[i];
		}else{
			if(!seek_start){
				let rate = total_length/(i-start_point);
				block_groups.push([start_point,i,rate]);
				seek_start = true;
				total_length = 0;
			}
		}
	}
	block_groups.sort((a,b)=>{
		return b[2]-a[2];
	})
	return block_groups;
}


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

const get_article_sync = function(html){
	var blocks = get_blocks(html);
	var block_score  = get_block_score(blocks,3);
	let grate = jedge_article_block(block_score);
	return {
		'content' : grate.length>0?blocks.slice(grate[0][0],grate[0][1]).join('\n'):blocks.join('\n'),
		'title' : get_title(html),
		'pubdate' : grate.length>0?get_pubdate_base_block(blocks, grate[0][0]):get_pubdate(html)
	}
}

const get_article = function(url,callback){
	httpreq.get(url,(err,body)=>{
		if(err)callback(err,{});
		else callback(null,get_article_sync(body));
	});
}

exports.get_article_sync = get_article_sync;
exports.get_article = get_article;