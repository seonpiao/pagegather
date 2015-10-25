var assert = require("assert");
var Gather = require('./index');

describe('Gather', function() {
  describe('Gather#fetch', function() {
    this.timeout(30000);
    it('打开页面', function(done) {
      new Gather({
        settings: {
          "url": "http://www.baidu.com/"
        }
      }).fetch(function(err, result) {
        assert(!err);
        done();
      });
    });

    it('获取链接文字', function(done) {
      new Gather({
        settings: {
          "url": "http://www.baidu.com/",
          config: {
            text: '.mnav'
          }
        }
      }).fetch(function(err, result) {
        assert.equal(result.text, '新闻');
        done();
      });
    });

    it('获取链接文字数组', function(done) {
      new Gather({
        settings: {
          "url": "http://www.baidu.com/",
          config: {
            text: '.mnav[]'
          }
        }
      }).fetch(function(err, result) {
        assert.equal(result.text[0], '新闻');
        assert.equal(result.text[1], 'hao123');
        done();
      });
    });

    it('获取多个属性', function(done) {
      new Gather({
        settings: {
          "url": "http://www.baidu.com/",
          config: {
            text1: '.mnav:nth-child(1)',
            text2: '.mnav:nth-child(2)'
          }
        }
      }).fetch(function(err, result) {
        assert.equal(result.text1, '新闻');
        assert.equal(result.text2, 'hao123');
        done();
      });
    });

    it('先删除一个元素，再获取多个属性', function(done) {
      new Gather({
        settings: {
          "url": "http://www.baidu.com/",
          config: {
            text1: {
              remove: ".mnav:nth-child(1)",
              selector: '.mnav:nth-child(1)'
            }
          }
        }
      }).fetch(function(err, result) {
        assert.equal(result.text1, 'hao123');
        done();
      });
    });

    it('先删除多个元素，再获取多个属性', function(done) {
      new Gather({
        settings: {
          "url": "http://www.baidu.com/",
          config: {
            text1: {
              remove: ".mnav:nth-child(1),.mnav:nth-child(1)",
              selector: '.mnav:nth-child(1)'
            }
          }
        }
      }).fetch(function(err, result) {
        assert.equal(result.text1, '地图');
        done();
      });
    });

    it('获取attr', function(done) {
      new Gather({
        settings: {
          "url": "http://www.baidu.com/",
          config: {
            btn: '#su<value>'
          }
        }
      }).fetch(function(err, result) {
        assert.equal(result.btn, '百度一下');
        done();
      });
    });

    it('获取多个attr中的一个', function(done) {
      new Gather({
        settings: {
          "url": "http://www.baidu.com/",
          config: {
            btn: '#su<val|value>'
          }
        }
      }).fetch(function(err, result) {
        assert.equal(result.btn, '百度一下');
        done();
      });
    });

    it('获取attr数组', function(done) {
      new Gather({
        settings: {
          "url": "http://www.baidu.com/",
          config: {
            target: '.mnav<href>[]'
          }
        }
      }).fetch(function(err, result) {
        assert.equal(result.target[0], 'http://news.baidu.com');
        assert.equal(result.target[1], 'http://www.hao123.com');
        done();
      });
    });

    it('跨页面获取数据', function(done) {
      new Gather({
        settings: {
          "url": "http://www.baidu.com/",
          config: {
            text: '.mnav->.tab .cur'
          }
        }
      }).fetch(function(err, result) {
        assert.equal(result.text, '新闻');
        done();
      });
    });

    it('跨页面获取数据数组', function(done) {
      new Gather({
        settings: {
          "url": "http://www.baidu.com/",
          config: {
            text: '.mnav->.tab a[]'
          }
        }
      }).fetch(function(err, result) {
        assert.equal(result.text[0], '网页');
        assert.equal(result.text[1], '贴吧');
        done();
      });
    });

    it('跨多级页面获取数据数组', function(done) {
      new Gather({
        settings: {
          "url": "http://www.baidu.com/",
          config: {
            text: '.mnav->.tab a:nth-child(3)->.j_search_nav a[]'
          }
        }
      }).fetch(function(err, result) {
        assert.equal(result.text[0], '新闻');
        assert.equal(result.text[1], '网页');
        done();
      });
    });

    it('跨多级页面，先删除部分元素，再获取数据数组', function(done) {
      new Gather({
        settings: {
          "url": "http://www.baidu.com/",
          config: {
            text: {
              selector: '.mnav->.tab a:nth-child(3)->.j_search_nav a[]',
              remove: '.j_search_nav a:nth-child(1),.j_search_nav a:nth-child(1)'
            }
          }
        }
      }).fetch(function(err, result) {
        assert.equal(result.text[0], '知道');
        assert.equal(result.text[1], '音乐');
        done();
      });
    });

    it('获取javascript变量', function(done) {
      new Gather({
        settings: {
          "url": "http://www.letv.com/ptv/vplay/23325364.html",
          config: {
            js: 'javascript:window.__INFO__.vid'
          }
        }
      }).fetch(function(err, result) {
        assert.equal(result.js, 23325364);
        done();
      });
    });

  });
});
