var path = require('path');
var fs = require('fs');
var exec = require('child_process').exec;
var Retry = require('retryjs');
var logger = require('log4js').getLogger('commonflow');

module.exports = function(flow) {
	flow.addStep('初始化返回结果', {
		input: {
			settings: {
				empty: false
			}
		},
		output: {
			result: {
				empty: false
			}
		},
		go: function(data, done) {
			if (data.settings.length > 1) {
				done({
					result: []
				});
			} else {
				done({
					result: {}
				});
			}
		}
	});

	flow.addStep('抓取是否完成', {
		input: {
			settings: {
				empty: false
			}
		},
		type: 'condition',
		go: function(data, done) {
			if (data.settings.length > 0) {
				done(null, '否');
			} else {
				done(null, '是');
			}
		}
	});

	flow.addStep('结束', {
		input: {
			finish: {
				empty: false
			},
			result: {
				empty: false
			}
		},
		go: function(data, done) {
			if (data.finish) {
				data.finish(null, data.result);
			}
			done();
		}
	});

	flow.addStep('解析下一个抓取配置', {
		input: {
			settings: {
				empty: false
			}
		},
		output: {
			current: {
				empty: false
			}
		},
		go: function(data, done) {
			done({
				current: data.settings.shift()
			});
		}
	});

	flow.addStep('抓取数据', {
		input: {
			current: {
				empty: false
			},
			result: {
				empty: false
			}
		},
		output: {
			result: {
				empty: false
			}
		},
		go: function(data, done) {
			var settingsFile = path.join(__dirname, 'phantom/common.json');
			var phantomFile = path.join(__dirname, 'phantom/fetch.js');
			fs.writeFile(settingsFile, JSON.stringify(data.current));

			var retry = new Retry({
				max: 5,
				done: done,
				fail: function(err) {
					logger.error(err);
					done({
						result: null
					})
				}
			});

			retry.start(function(done, retry) {
				exec('phantomjs --disk-cache=true --cookies-file=cookies.txt ' + phantomFile, {
					cwd: path.join(__dirname, 'phantom')
				}, function(err, stdout, stderr) {
					var json = stdout.match(/-----json-----(.*)-----json end-----/)[1];
					var result = JSON.parse(json);
					if (result) {
						if (Array.isArray(data.result)) {
							data.result.push(result);
							done({
								result: data.result
							});
						} else {
							done({
								result: result
							});
						}
					} else {
						retry();
					}
				});
			})
		}
	});
}
