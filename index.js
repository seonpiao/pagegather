require('seajs');
var format = require('util').format;
var Flow = require('flow-js');
var request = require('request');
var iconv = require('iconv-lite');
var fs = require('fs');
var path = require('path');
var _ = require('underscore');
var async = require('async');
var Retry = require('retryjs');
var logger = require('log4js').getLogger('gather');
var format = require('util').format;
var crypto = require('crypto');
var sizeOf = require('image-size');
var zlib = require('zlib');

var defineSteps = require('./steps');

var Gather = function(options) {
  this.settings = options.settings; // 单对象或对象数组
  if (!Array.isArray(this.settings)) {
    this.settings = [this.settings];
  }
};

Gather.prototype.fetch = function(callback) {
  var flow = new Flow();
  defineSteps(flow);
  flow.begin({
    finish: callback || function() {},
    settings: this.settings
  });
  flow.go('初始化返回结果');
  flow.go('抓取是否完成', {
    cases: {
      '是': function(data) {
        flow.go('结束');
      },
      '否': function(data) {
        flow.go('解析下一个抓取配置');
        flow.go('抓取数据');
        flow.go('抓取是否完成');
      }
    }
  })
};

// new Gather({
//   settings: {
//     "url": "http://news.sina.com.cn/hotnews/",
//     "config": {
//       "ph_list": "#Con11 .ConsTi a<href>[]",
//       "ph_title": "#Con11 .ConsTi a[]"
//     }
//   }
// }).fetch(function(err, result) {
//   console.log(result)
// });

// new Gather({
//   settings: {
//     "url": "http://www.baidu.com/"
//   }
// }).fetch(function(err, result) {
//   console.log(result)
// });

// new Gather({
//   settings: {
//     "url": "http://news.sina.com.cn/hotnews/",
//     "config": {
//       "ph_list": "#Con11 .ConsTi a<href>[]",
//       "ph_title": "#Con11 .ConsTi a[]"
//     }
//   }
// }).fetch(function(err, result) {
//   var settings = [];
//   console.log(result)
//   result.ph_list.forEach(function(url, index) {
//     settings.push({
//       url: url,
//       config: {
//         title: '#artibodyTitle'
//       }
//     })
//   });
//   console.log(settings);
//   new Gather({
//     settings: settings
//   }).fetch(function(err, result) {
//     console.log(result);
//   });
// });

module.exports = Gather;
