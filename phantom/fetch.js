var page = require('webpage').create();
var fs = require('fs');

var settings = JSON.parse(fs.read('common.json'));

var isTimeout = false;

function initPage(options) {

  options = options || {};
  options.timeoutCallback = options.timeoutCallback || function(request) {
    page.stop();
    console.log('-----json-----null-----json end-----');
    phantom.exit();
  };

  page.onConsoleMessage = function(msg, lineNum, sourceId) {
    console.log('CONSOLE: ' + msg);
  };

  // page.onError = function() {};

  page.onResourceRequested = function(requestData, networkRequest) {
    // if (requestData.url.match(/\.js$/)) {
    //   console.log(111, requestData.url)
    //   networkRequest.abort();
    // }
  };

  page.onResourceTimeout = options.timeoutCallback;
  page.settings.resourceTimeout = options.timeout || 30000;
  page.settings.loadImages = false;
  page.customHeaders = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.71 Safari/537.36'
  };
}

function openPage(url, callback) {
  var now = Date.now();
  if (url.match(/^https?\:\/\//)) {
    var redirectURL;
    page.onResourceReceived = function(resource) {
      if (url == resource.url && resource.redirectURL) {
        redirectURL = resource.redirectURL;
      }
      if (resource.time.getTime() - now > 1000) {
        // console.log(222, resource.url);
      }
    };
    page.open(url, function() {
      if (redirectURL) {
        // console.log('redirectURL: ' + redirectURL)
        openPage(redirectURL, callback);
      } else {
        page.injectJs('jquery-1.11.1.js');
        callback.apply(null, arguments);
      }
    });
  } else {
    page.content = url;
    page.injectJs('jquery-1.11.1.js');
    callback.apply(null, ['success']);
  }
}

function waitFor(selectors, callback) {
  var allSelectors = selectors.split('&');
  var allExist = allSelectors.every(function(selector) {
    var someSelectors = selector.split(',');
    var exist = someSelectors.some(function(one) {
      return page.evaluate(function(selector) {
        if ($(selector).length > 0) {
          return true;
        }
        if (window.scrollY < ($(document).height() - $(window).height())) {
          window.scrollBy(0, 200);
        }
        return false;
      }, one);
    });
    return exist;
  });
  if (allExist) {
    callback();
  } else {
    setTimeout(function() {
      waitFor(page, selectors, callback);
    }, 100);
  }
}

initPage({
  timeout: settings.timeout
});

openPage(settings.content || settings.url, function(status) {
  var data = null;
  if (status === 'success') {
    var config = settings.config;
    var q = queue(1);
    var result = {};
    if (!settings.waitFor) {
      settings.waitFor = 'body';
    }
    if (config) {
      waitFor(settings.waitFor, function() {
        //遍历所有要抓取的数据项
        Object.keys(config).forEach(function(key) {
          //把每一个数据项的抓取任务放到队列中
          q.defer(function(done) {
            setTimeout(function() {
              //分析需要跳转多少次页面可以到达目标页面
              var selectors = (config[key].selector || config[key]).split('->');
              //获取目标页面
              var targetPage = getTargetPage(selectors, function() {
                if (!page) {
                  console.log('-----json-----null-----json end-----');
                  //Page is loaded!
                  phantom.exit();
                }
                //此时page为目标页面
                var selector = selectors.shift().trim();
                var remove = config[key].remove;
                var content = page.evaluate(function(selector, remove) {
                  var content;
                  if (remove) {
                    remove = remove.split(',');
                    remove.forEach(function(selector) {
                      console.log('rm:' + selector);
                      try {
                        var rm = $(selector);
                        rm.remove();
                      } catch (e) {}
                    });
                  }
                  //可能有多个备选的selector, 以找到的第一个selector为准
                  selector = selector.split(',');
                  selector.some(function(item) {
                    if (item.indexOf('javascript:') === 0) {
                      var script = item.replace(/^javascript:/, '');
                      console.log('>>>', script)
                      content = eval(item.replace(/^javascript:/, ''))
                      return true;
                    }
                    //分析是否要获取结果集
                    var arrayValue = false;
                    if (item.match(/\[\]$/)) {
                      arrayValue = true;
                      item = item.replace(/\[\]$/, '');
                    }
                    //分析是否要获取指定的attribute
                    var attrExp = /\<([^<]+?)\>$/;
                    var attr = item.match(attrExp);
                    if (attr) {
                      attr = attr[1];
                      item = item.replace(attrExp, '');
                    }
                    var $el = $(item);
                    if ($el.length === 0) {
                      return false;
                    }
                    if (attr) {
                      attr = attr.split('|');
                      var attrValue;
                      if (arrayValue) {
                        content = [];
                        $el.each(function(i, el) {
                          attr.some(function(name) {
                            attrValue = $(el).attr(name);
                            if (attrValue) {
                              attrValue = attrValue.trim();
                              return true
                            }
                          });
                          return content.push((attrValue || ''));
                        })
                      } else {
                        attr.some(function(name) {
                          attrValue = $($el[0]).attr(name);
                          if (attrValue) {
                            attrValue = attrValue.trim();
                            return true
                          }
                        });
                        content = (attrValue || '');
                      }
                    } else {
                      if (arrayValue) {
                        content = [];
                        $el.each(function(i, el) {
                          return content.push($(el).text().trim());
                        })
                      } else {
                        content = $($el[0]).text().trim();
                      }
                    }
                    return true;
                  });
                  return content;
                }, selector, remove);
                result[key] = content;
                done();
              })
            });
          });
        });
        q.await(function() {
          console.log('-----json-----' + JSON.stringify(result) + '-----json end-----');
          //Page is loaded!
          phantom.exit();
        });
      })
    } else {
      console.log('-----json-----{}-----json end-----');
      phantom.exit();
    }
  } else {
    console.log('-----json-----null-----json end-----');
    phantom.exit();
  }
});

var cache = {};

function getTargetPage(selectors, callback) {
  if (selectors.length === 1) {
    callback();
  } else {
    var selector = selectors.shift();
    var href = page.evaluate(function(selector) {
      selector = selector.split(',');
      var href;
      selector.some(function(item) {
        var $el = $(item);
        if ($el.length === 0) {
          return false;
        }
        href = $($el[0]).attr('href');
        return true;
      });
      return href;
    }, selector);
    if (cache[href]) {
      // console.log('cached: ' + href);
      page = cache[href];
      getTargetPage(selectors, callback);
    } else {
      openPage(href, function(status) {
        cache[href] = page;
        getTargetPage(selectors, callback);
      })
    }
  }
}

function queue(parallelism) {
  var slice = [].slice;
  var q,
    tasks = [],
    started = 0,
    active = 0,
    remaining = 0,
    popping,
    error = null,
    await = function() {},
    all;

  if (!parallelism) parallelism = Infinity;

  function pop() {
    while (popping = started < tasks.length && active < parallelism) {
      var i = started++,
        t = tasks[i],
        a = slice.call(t, 1);
      a.push(callback(i));
      ++active;
      t[0].apply(null, a);
    }
  }

  function callback(i) {
    return function(e, r) {
      --active;
      if (error != null) return;
      if (e != null) {
        error = e;
        started = remaining = NaN;
        notify();
      } else {
        tasks[i] = r;
        if (--remaining) popping || pop();
        else notify();
      }
    };
  }

  function notify() {
    if (error != null) await (error);
    else if (all) await (error, tasks);
    else await.apply(null, [error].concat(tasks));
  }

  return q = {
    defer: function() {
      if (!error) {
        tasks.push(arguments);
        ++remaining;
        pop();
      }
      return q;
    },
    await: function(f) {
      await = f;
      all = false;
      if (!remaining) notify();
      return q;
    },
    awaitAll: function(f) {
      await = f;
      all = true;
      if (!remaining) notify();
      return q;
    }
  };
}
