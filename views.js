var request = require("request");
const Promise = require('bluebird');
const fs = require('fs');
Promise.promisifyAll(fs);
const cookie = require("cookie");
const QMeta = require("./QuestionMeta");

String.prototype.arg = function (val) {
    return this.replace(/%[0-9]/, val);
}
const view_count_refresh_period = 20*60*1000;
const day_duration = 24*60*60*1000;

var acc_id = 607407;

var user_questions = "https://api.stackexchange.com/2.2/users/%1/questions?";
var questionParams = "order=asc&sort=votes&site=stackoverflow";
var questionCache = "questions_%1.json".arg(acc_id);
var questions = [];

var question_meta = new QMeta.QuestionMetaStorage(questions);

fetchAllQuestions(questionCache, 30*60*1000)
  .then(function(question_array) {
       console.log("RETRIEVED: "+question_array.length);
       questions.length = 0;
       questions.push.apply(questions, question_array);
       start();
  });

function start() {
    //observeTimeTag(questionByTitle("Can I add support for conditional breakpoints for custom objects?"),0,"");
    viewQuestion(questionByTitle("Can I add support for conditional breakpoints for custom objects?"));
    //viewAllQuestions(0);

}
function viewQuestion(index) {
  const viewRegex = /\/posts\/(\d+)\/ivc\/([\da-z]+)/i;
  var q = questions[index];
  console.log("VIEW Q: "+q.title);
  var url = q.link;

  return PromiseHTTPRequest({url:url})
    .then(function(result) {
        var match = viewRegex.exec(result.body);
        //console.log("Headers: ");
        //for(var i in result.response.headers) {
        //   console.log("        "+i+" => "+result.response.headers[i]);
        //}
        var cookies = result.response.headers["set-cookie"]+"";
        cookies = cookies.substr(0, cookies.indexOf(";"));
        //console.log("Cookies: "+cookies);

        //console.log(match);
        if (match != null && match.length >= 3) {
            var meta = question_meta.i(q.question_id);
            meta.updateTag(match[2]);
            
            if(meta.shouldView()) {
                return PromiseHTTPRequest({
                  url:"http://stackoverflow.com/posts/" + match[1] + "/ivc/" + match[2],
                  expectedStatus: 204,
                  headers: {
                      'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:47.0) Gecko/20100101 Firefox/47.0',
                      'X-Requested-With': "XMLHttpRequest",
                      "Cookie": cookies,
                      "Referer": url
                  }
                })
                .then(function() {
                     meta.viewedNow();
                });
            }
            else {
                console.log("VIEW SKIP: "+q.title+" (viewed recently)");
                return true;
            }
        }
        else 
            throw new Error("Failed to find markers for view counter!");
    });
}
/*
VALUE CHANGED FROM  TO 9be6
DELAY 1472118356414
VALUE 11:5:10
VALUE CHANGED FROM 9be6 TO 9aa6
DELAY 844460
VALUE 10:59:50
*/

function observeTimeTag(index, lastChange, lastValue) {
  const viewRegex = /\/posts\/(\d+)\/ivc\/([\da-z]+)/i;
  var q = questions[index];
  //console.log("VIEW Q: "+q.title);
  var url = q.link;

  return PromiseHTTPRequest({url:url})
    .then(function(result) {
        var match = viewRegex.exec(result.body);

        //console.log(match);
        if (match != null && match.length >= 3) {
            var time = new Date().getTime();
            time/=1000;
            if(lastValue!=match[2]) {
              console.log("VALUE CHANGED FROM "+lastValue+" TO "+match[2]);
              console.log("DELAY "+Math.round(time-lastChange)+ " (now="+Math.round(time)+")");
              console.log("VALUE "+timeTagToTime(match[2]));
              // There was already a change
              lastChange = time;
              lastValue = match[2];
  
            }
            Promise.delay(10000)
              .then(()=>{return observeTimeTag(index, lastChange, lastValue);});
        }
        else 
            throw new Error("Failed to find markers for view counter!");
    })
    .catch(function(error) {
         console.log("ERROR: "+error);
         return observeTimeTag(index, lastChange, lastValue);
    });
}
function timeTagToTime(tag) {
    var time = parseInt(tag, 16);
    return new TimeObj(time);
}
function TimeObj(time) {
    this.h = Math.floor(time/(60*60));
    time = time%(60*60);
    this.m = Math.floor(time/60);
    time = time%60;
    this.s = time;
    return this;
}
TimeObj.prototype.h = 0;
TimeObj.prototype.m = 0;
TimeObj.prototype.s = 0;
TimeObj.prototype.toString = function() {
    return this.h+":"+this.m+":"+this.s;
}
function Decision(value, reason) {
    this.value = !!value;
    this.reason = reason+"";
}
Decision.prototype.toString = function () {
    return (this.value?"Yes":"No")+" because "+this.reason+".";
}
Decision.prototype.valueOf = function () {return this.value;}
Decision.prototype.yes = function () {return this.value;}
Decision.prototype.no = function () {return !this.value;}
function No(reason) {
    Decision.call(this, false, reason);
}
No.prototype = Object.create(Decision.prototype);
function Yes(reason) {
    Decision.call(this, true, typeof reason=="string"?reason: "I want to");
}
Yes.prototype = Object.create(Decision.prototype);


function QuestionFilter(index) {
    var q = questions[index];
    if(q.view_count>999)
        return new No("view count is too high");
    var qmeta = question_meta.i(index);
    if(!qmeta.shouldView())
        return new No("already viewed");
    return new Yes();
}
function viewAllQuestions(startIndex) {
    if(typeof startIndex!="number")
      startIndex = 0;
    var delay = 2000;  //Math.ceil(view_count_refresh_period/questions.length);

    startIndex=wrapIndexToArray(startIndex, questions);
    var decision;
    // Skip question if it was viewed recently
    while((decision = QuestionFilter(startIndex)).no()) {
        //console.log("Skip "+startIndex+" because "+decision.reason);
        qmeta = question_meta.i(++startIndex);
        startIndex=wrapIndexToArray(startIndex, questions);
    }
    

    return viewQuestion(startIndex)
      .delay(delay)
      .catch(function(error) {
           console.log("VIEW ERROR: "+error);
           return viewAllQuestions(startIndex);
      })
      .then(function() {
           startIndex++;
           startIndex=wrapIndexToArray(startIndex, questions);
           return viewAllQuestions(startIndex);
      });
}

function questionByTitle(title, strict) {
  console.log("FIND TITLE: '"+title+"' in "+questions.length+" questions.");
  if(strict === true) {
      return questions.findIndex((x)=>{
        //console.log("   \""+x.title+"\"");
        //console.log(" "+(x.title==title?" ":"X")+" \""+title+"\"");
        //console.log("   --- ");
        return x.title==title;
      });
  }
  else {
      return questions.findIndex((x)=>{
        return x.title.indexOf(title)!=-1;
      });
  }
}
function wrapIndexToArray(i, array) {
    if(i>=array.length)
        return i%array.length;
    if(i<0) {
        i = i%array.length;
        return array.length+i;
    }
    return i;
}





function downloadQuestions(params) {
  return PromiseHTTPRequest({ url: user_questions.arg(acc_id)+params,
                  gzip: true })
  .then(function(result) {
      var questions = JSON.parse(result.body);
      return questions;
  })
  .catch(function(error) {
      console.error(error);
      return [];
  })
}

function downloadAllQuestions(page, question_array) {
  if(!page || typeof page!="number" || page<1)
      page = 1;
  if(!(question_array instanceof Array)) {
      question_array = [];
  }

  console.log("FETCH: page "+page);
  return downloadQuestions(questionParams+"&page="+page)
   .then(function(reply) {
       question_array.push.apply(question_array, reply.items);
       console.log("FETCH: received "+reply.items.length+" questions.");
       if(reply.has_more) {
           return downloadAllQuestions(page+1, question_array);
       }
       else {
           return question_array;
       }
    })
}

function fetchAllQuestions(cacheFilename, cacheTimeout, question_array) {
    if(!(question_array instanceof Array)) {
        question_array = [];
    }

    try {
      var stat = fs.statSync(cacheFilename);
    }
    catch(e) {
      var stat = null;
    }

    if(stat !=null && stat.isFile() && (new Date().getTime() - stat.mtime.getTime()) < cacheTimeout) {
        return PromiseReadFile(cacheFilename)
          .then(function(data){
            question_array.push.apply(question_array, JSON.parse(data));
            return question_array;
          });
    }
    else {
        return downloadAllQuestions(1, question_array)
          .then(function(question_array){
            return PromiseWriteFile(cacheFilename, JSON.stringify(question_array))
              .then(function() {return question_array;});
          })
          .then(function(question_array){
            return question_array;
          })
    }
}




function PromiseHTTPRequest(url) {
    var resolver = Promise.defer();
    //console.log("FETCH: ", typeof url=="string"?url:url.url);
    if(url.expectedStatus == null ) {
      url.expectedStatus = 200;
    }
    request.get(url,
            function(error, response, body) {
                if(error) {
                    resolver.reject(error);
                }
                else if (url.expectedStatus>0 && response.statusCode != url.expectedStatus) {
                    resolver.reject(new Error("HTTP Error #"+response.statusCode));
                }
                else {
                    resolver.resolve({response: response, body: body});
                }
            }
    );
    return resolver.promise;
};
function PromiseWriteFile(name, data, options, callback) {
    var resolver = Promise.defer();
    console.log("SAVE: ", name);
    fs.writeFile(name, data, options,
            function(error) {
                if(error) {
                    resolver.reject(error);
                }
                else {
                    resolver.resolve();
                }
            }
    );
    return resolver.promise;
};
function PromiseReadFile(name, options, callback) {
    var resolver = Promise.defer();
    console.log("READ: ", name);
    fs.readFile(name, options,
            function(err, data) {
                if(err) {
                    resolver.reject(error);
                }
                else {
                    resolver.resolve(data);
                }
            }
    );
    return resolver.promise;
};
