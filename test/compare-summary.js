const mysql = require("mysql");
const arex = require('../lib/arex.js');
const fs = require('fs');
const boson = require('./BosonNlp.js');
const async = require('async');

const pool = mysql.createPool({
    "host": "10.10.119.133",
    "database": "news_cfg",
    "user": "news",
    "password": "pwd@news$",
    "connectionLimit": 10
});

const getTextFromHtml = function(html) {
    html = html.replace(/<!--[\s\S]*?-->/igm, '');
    html = html.replace(/<script[\s\S]*?<\/script>/igm, '');
    html = html.replace(/<style[\s\S]*?<\/style>/igm, '');
    html = html.replace(/<\/?[^>]*?>/ig, '');
    html = html.replace(/&[a-zA-Z]+;/ig, '');
    html = html.replace(/[\n\t\r]+/igm, '');
    html = html.replace(/[\s]+/igm, '');
    return html;
}


if(process.argv.length>2){
    let id = parseInt(process.argv[2]);
    let sql = `SELECT
                    a.id,
                    b.title,
                    b.url,
                    b.summary,
                    b.content,
                    a.score
                FROM
                    fe_avnews a,
                    fe_articles b
                WHERE
                    a.id = ${id} 
                    AND a.article_id = b.id 
                LIMIT 1;`;
    pool.query(sql, (err, ret) => {
        if(err)throw err;
        if(ret.length>0){
            let article = ret[0];
            console.log('TITLE:::',article['title']);
            console.log('SUMMARY:::',article['summary']);
            console.log('NEW SUMMARY:::',arex.summarize(article['content'], 0.04, false, 50, 80,[],article['title']));
        }
        process.exit();
    });
}else{
    let sql = `SELECT
                    a.id,
                    b.title,
                    b.url,
                    b.summary,
                    b.content,
                    a.score
                FROM
                    fe_avnews a,
                    fe_articles b
                WHERE
                    a.create_time > SUBSTR(NOW() FROM 1 FOR 10)
                    AND b.origin <> '交易所' 
                    AND a.article_id = b.id 
                ORDER BY score DESC 
                LIMIT 500;`;

    pool.query(sql, (err, ret) => {
        if(err)throw err;
        async.mapLimit(
            ret,
            10,
            (article, cb)=>{
                let new_summary = arex.summarize(article['content'], 0.04, false, 50, 80,[],article['title']).replace(/\"/ig,'“');
                boson.summarize(
                    article['title'],
                    getTextFromHtml(article['content']),
                    80,
                    (err,smy)=>{
                        console.log(article['id']);
                        console.log(article['title']);
                        console.log(new_summary);
                        console.log('\n');
                        if(err)console.error(err);
                        cb(null, [
                                article['id'],
                                article['title'].replace(/\"/ig,'“'),
                                article['summary'] ? article['summary'].replace(/\"/ig,'“') : '',
                                new_summary,
                                smy,
                                article['url']
                        ]);
                    }
                    );
            },
            (err, paragraphs)=>{
                paragraphs.unshift(['ID','标题','摘要（V2）','摘要（V3）','摘要（Boson）','网址']);
                fs.writeFile('summary-comparation.csv', paragraphs.join(new Buffer('\xEF\xBB\xBF', 'binary')+'\n'), (err) => {
                    if(err)throw err;
                    else console.log('dump to summary-comparation.csv');
                    process.exit();
                });
            }
            );        
    });
}
