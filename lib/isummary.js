const fs = require('fs');
const path = require('path');
const brain = require('brain.js');
const nodejieba = require("nodejieba");
const defaultModelPath = path.resolve(__dirname,'data', 'summary.json');

const natures = ['', 'a', 'ad', 'ag', 'an', 'b', 'c', 'd', 'df', 'dg', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'mg', 'mq', 'n', 'ng', 'nr', 'nrfg', 'nrt', 'ns', 'nt', 'nz', 'o', 'p', 'q', 'r', 'rg', 'rr', 'rz', 's', 't', 'tg', 'u', 'ud', 'ug', 'uj', 'ul', 'uv', 'uz', 'v', 'vd', 'vg', 'vi', 'vn', 'vq', 'x', 'y', 'z', 'zg', 'eng']
const feature_size = 500;

var net, loaded = false;

/**
 * init brain net
 * @return {[type]} [description]
 */
const initNet = () => {
    net = new brain.NeuralNetwork({
        hiddenLayers: [200, 100, 50, 25, 12, 6]
    });
    // net = new brain.NeuralNetwork();
}

/**
 * reload net from json
 * @param  {[type]} json [description]
 * @return {[type]}      [description]
 */
const reloadModel = (json) => {
    initNet();
    net.fromJSON(JSON.parse(fs.readFileSync(defaultModelPath, 'utf8')));
}

/**
 * generate reature for a line
 * @param  {[type]} p [description]
 * @return {[type]}   [n,n...]
 */
const generateFeature = (p) => {
    let arr = new Array(feature_size).fill(0);
    nodejieba.tag(p).forEach((word, index) => {
        if (index < feature_size) arr[index] = natures.indexOf(word['tag']);
    });
    return arr;
}

/**
 * generate features for a text(multiple lines)
 * @param  {[type]} lines [description]
 * @param  {[type]} value [description]
 * @return {[type]}       [{'input':[n,n...],'output':[v]}]
 */
const generateLinesFeature = (lines, value) => {
    return lines.map(line => {
        return {
            'input': generateFeature(line),
            'output': [value]
        };
    });
}

/**
 * rank summarization score
 * @param  {[type]} p [description]
 * @return {[int]}   score
 */
const rank = (p) => {
    if (!loaded) {
        reloadModel();
        loaded = true;
    }
    return net.run(generateFeature(p))[0]
}

/**
 * train model
 * @param  {[type]} features [description]
 * @return {[type]}          [description]
 */
const train = (features) => {
    let start = new Date().getTime();
    net.train(features, {
        errorThresh: 0.0005, // error threshold to reach
        iterations: 20000, // maximum training iterations
        log: true, // console.log() progress periodically
        logPeriod: 10, // number of iterations between logging
        learningRate: 0.03 // learning rate
    });
    let model_json = net.toJSON();
    fs.writeFile(defaultModelPath, JSON.stringify(model_json), (err) => {
        if (err) console.error(err);
        else console.log('model dump to file, cost ' + (new Date().getTime() - start) + ' ms');
    });
}

initNet();

if (module.parent) {
    module.exports = {
        'rank': rank,
        'train': train,
        'generateLinesFeature': generateLinesFeature
    }
} else {
    console.log(rank('第三方机构网贷之家公布数据：截至2015年底，全年网贷成交量达到了9823.04亿元，比2014年全年成交量增长了288.57%。'));
}