'use strict'
const http = require('http');
const urlUtil = require('url');
const apitoken = 'Zi_dc8E4.9914.8JlfN-35eJAl';

const encodeString = function(data) {
	data = escape(data).replace(/\%/g, '\\');
	data = restorePunctuation(data);
	return data;
};

const decodeString = function(data) {
	data = unescape(data.replace(/\\\\/g, '\%'));
	return data;
};

const restorePunctuation = function(data) {
	data = data.replace(/\\A0/g, " ");
	data = data.replace(/\\A2/g, "\\u00A2");
	data = data.replace(/\\A3/g, "\\u00A3");
	data = data.replace(/\\A4/g, "\\u00A4");
	data = data.replace(/\\A5/g, "\\u00A5");
	data = data.replace(/\\A6/g, "\\u00A6");
	data = data.replace(/\\A7/g, "\\u00A7");
	data = data.replace(/\\A8/g, "\\u00A8");
	data = data.replace(/\\A9/g, "\\u00A9");
	data = data.replace(/\\AA/g, "\\u00AA");
	data = data.replace(/\\AB/g, "\\u00AB");
	data = data.replace(/\\AC/g, "\\u00AC");
	data = data.replace(/\\AD/g, "\\u00AD");
	data = data.replace(/\\AE/g, "\\u00AE");
	data = data.replace(/\\AF/g, "\\u00AF");
	data = data.replace(/\\B0/g, "\\u00B0");
	data = data.replace(/\\B1/g, "\\u00B1");
	data = data.replace(/\\B2/g, "\\u00B2");
	data = data.replace(/\\B3/g, "\\u00B3");
	data = data.replace(/\\B4/g, "\\u00B4");
	data = data.replace(/\\B5/g, "\\u00B5");
	data = data.replace(/\\B6/g, "\\u00B6");
	data = data.replace(/\\B7/g, ".");
	data = data.replace(/\\B8/g, "\\u00B8");
	data = data.replace(/\\B9/g, "\\u00B9");
	data = data.replace(/\\BA/g, "\\u00BA");
	data = data.replace(/\\BB/g, "\\u00BB");
	data = data.replace(/\\BC/g, "\\u00BC");
	data = data.replace(/\\BD/g, "\\u00BD");
	data = data.replace(/\\BE/g, "\\u00BE");
	data = data.replace(/\\BF/g, "\\u00BF");
	data = data.replace(/\\D7/g, " ");
	data = data.replace(/\\0A/g, " ");
	data = data.replace(/\\0D/g, " ");
	data = data.replace(/\\20/g, " "); 
	data = data.replace(/\\21/g, "!");
	data = data.replace(/\\22/g, "\"");
	data = data.replace(/\\23/g, "#");
	data = data.replace(/\\24/g, "$");
	data = data.replace(/\\25/g, "%");
	data = data.replace(/\\26/g, "&");
	data = data.replace(/\\27/g, "\'");
	data = data.replace(/\\28/g, "(");
	data = data.replace(/\\29/g, ")");
	data = data.replace(/\\2C/g, ",");
	data = data.replace(/\\3A/g, ":");
	data = data.replace(/\\3B/g, ";");
	data = data.replace(/\\3C/g, "<");
	data = data.replace(/\\3D/g, "=");
	data = data.replace(/\\3E/g, ">");
	data = data.replace(/\\3F/g, "?");
	data = data.replace(/\\5B/g, "[");
	data = data.replace(/\\5D/g, "]");
	data = data.replace(/\\5E/g, "^");
	data = data.replace(/\\7B/g, "{");
	data = data.replace(/\\7C/g, "|");
	data = data.replace(/\\7D/g, "}");
	data = data.replace(/\\7E/g, "~");
	return data;
};

const postRequet = function(url,data,callback){
	let urlObj = urlUtil.parse(url);
    let datastr = encodeString(JSON.stringify(data));
    let options = {
        hostname: urlObj['hostname'],
        port: 80,
        path: urlObj['path'],
        method: 'POST',
        headers: {
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/52.0.2743.116 Chrome/52.0.2743.116 Safari/537.36",
            "Content-Type": 'Content-Type: application/json',
            'X-Token': apitoken,
            'Content-Length':datastr.length
        }
    };
    let req = http.request(options, (res) => {
        res.setEncoding('utf8');
        let res_body = '';
        res.on('data', _ => res_body += _);
        res.on('end', () => {
            try {
                if(res.statusCode==200 && res_body){
                	res_body = decodeString(res_body);
                	if(res_body.charAt(0)=='"'&&res_body.charAt(0)==res_body.charAt(res_body.length-1))res_body = res_body.substring(1,res_body.length-1);
                    callback(null,res_body);
                }else {
                	callback(new Error(res_body));
                }
            } catch (e) {
                callback(e);
            }
        });
    });

    req.on('error', (e) => {
        callback(e);
    });
    req.write(datastr);
    req.end();
} 

const summarize = function(title,content,len,callback){
	var url = 'http://api.bosonnlp.com/summary/analysis';
	var data = {
		'title':title,
		'percentage':len,
		'not_exceed':1,
		'content':content
	}
	postRequet(url,data,(err,ret)=>{
		if(!err && ret)ret = ret.replace(/\\n/g,'').replace(title,'');
		callback(err,ret);
	});
}


if(module.parent){
	exports.summarize = summarize;
}else{
	var content = `日前威锋网论坛网友@pht0922刚刚发帖爆料，简单测试发现，台湾版iPhone7并非全网通，不仅不支持中国电信网络，同时也不支持中国移动的3G TD-CDMA网络。而最新消息称，港版iPhone7还支持中国电信网络。按照惯例，为遵守各地的法律规定，苹果严格通过激活步骤+GSX激活策略实现对各地区iPhone的定制，其中售价比国行便宜不少的港版iPhone并不支持大陆电信网络。不过，微博网友@Jackcivlie却爆料，自己所使用的港版iPhone7支持中国电信4G上网，不过无法发短信、打电话。随后也有网友称，自己所使用的港版iPhone7能4G上网，而且部分港版还可以全网通。同时也有用户称，与港版Xperia X一样，iPhone7是刚好支持电信4G的FDD-LTE频点。另外有网友测试，iPhone6s也能够实现这种上网方式，由于其特性与有锁手机相似，因此更像是iPhone在锁运营商当中出现的漏洞，应该会在未来更新运营商文件之后彻底封杀。`;
	summarize('',content,120,(err,ret)=>{
		if(err)console.error(err);
		else {
			console.log(ret);
			console.log(content.length, ret.length);
		}
	});
}