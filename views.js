var request = require("request");
const Promise = require('bluebird');
const fs = require('fs');
Promise.promisifyAll(fs);
const cookie = require("cookie");
const QMeta = require("./QuestionMeta");
const Identifier = require("./Identifier");
const Arguments = require("./SimpleArgv");
const ARGS = new Arguments();

String.prototype.arg = function (val) {
    return this.replace(/%[0-9]/, val);
}
const view_count_refresh_period = 16*60*1000;
const day_duration = 24*60*60*1000;
const q_cache_delay = 50 * 60 * 1000;

var acc_id = 607407;

var user_questions = "https://api.stackexchange.com/2.2/users/%1/questions?";
var questionParams = "order=asc&sort=votes&site=stackoverflow";
var questionCache = "questions_%1.json".arg(acc_id);
var questions = [];

var question_meta = new QMeta.QuestionMetaStorage(questions);
//297931 views
//297942
//298315
//298452
//298973
//300596
//303208
//348170

updateQuestionArray(questionCache, q_cache_delay, questions)
  .then(function (result) {
      console.log("Total views: ", question_meta.totalViews());
      if(result instanceof Array)
          question_meta.update();
      //PromiseWriteFile("test_sorted.json", toDebugJSON(questions))
      //    .then(function () { });
      //question_meta.print("title");
      start();
  });
function question_sorter(a, b) {
    //console.log(a.title + "(" + a.view_count + ") > " + b.title + "(" + b.view_count + ")")
    return a.view_count - b.view_count;
}
function question_sorter_meta(a, b) {
    var a_meta = question_meta.meta(new Identifier.Id(a.question_id));
    var b_meta = question_meta.meta(new Identifier.Id(b.question_id));
    return a_meta.view_count - b_meta.view_count;
}
function toDebugJSON(array) {
    var filtered = question_meta.filter.call({qdb: array}, ["view_count", "title", "question_id"]);
    var string = JSON.stringify(filtered);
    string = string.replace(/\},/g, "},\n");
    return string;
}

function start() {
    //observeTimeTag(questionByTitle("Can I add support for conditional breakpoints for custom objects?"),0,"");
    /*viewQuestion(questionByTitle("Can I add support for conditional breakpoints for custom objects?"))
      .then(function () {
          viewQuestion(questionByTitle("Can I add support for conditional breakpoints for custom objects?"));
      });*/
    

    setInterval(function () {
        updateQuestionArray(questionCache, -1, questions)
          .then(function () {
              question_meta.update(questions);
              console.log("Total views: ", question_meta.totalViews());
          })
    }, q_cache_delay * 1.5);


    var start_index = 0;
    if (ARGS.arg_index) {
        start_index = 1 * ARGS.arg_index;
    }
    else if (ARGS.arg_title) {
        start_index = questionByTitle(ARGS.arg_title);
    }
    var q = questions[start_index];
    console.log("Start: #" + start_index + " '" + q.title + "' (id " + q.question_id + ")");
    viewAllQuestions(start_index);
}
function viewQuestion(identifier) {
    identifier = Identifier.fromValue(identifier);
    var q = question_meta.question(identifier);
    var meta = question_meta.meta(identifier);
    console.log("VIEW: " + q.title.substr(0, 15)+"... "+meta.view_count+" views");

    return getTimeTag(identifier)
      .then(function (results) {
          var meta = question_meta.meta(identifier);
          //console.log(meta, identifier);
          if (meta.shouldView()) {
              return PromiseHTTPRequest({
                  url: results.link,
                  expectedStatus: 204,
                  headers: {
                      'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:47.0) Gecko/20100101 Firefox/47.0',
                      'X-Requested-With': "XMLHttpRequest",
                      "Cookie": results.cookie,
                      "Referer": results.question.link
                  }
              })
              .then(function () {
                  meta.viewedNow();
                  return true;
              });
          }
          else {
              console.log("VIEW SKIP: " + q.title + " (viewed recently)");
              return false;
          }
      })
}
function getTimeTag(identifier) {
    const viewRegex = /\/posts\/(\d+)\/ivc\/([\da-z]+)/i;
    identifier = Identifier.fromValue(identifier);
    var q = question_meta.question(identifier);
    var url = q.link;

    return PromiseHTTPRequest({ url: url })
      .then(function (result) {
          var match = viewRegex.exec(result.body);
          //console.log("Headers: ");
          //for(var i in result.response.headers) {
          //   console.log("        "+i+" => "+result.response.headers[i]);
          //}

          //console.log("Cookies: "+cookies);
          //console.log(match);
          if (match != null && match.length >= 3) {
              var cookies = result.response.headers["set-cookie"] + "";
              cookies = cookies.substr(0, cookies.indexOf(";"));
              question_meta.updateTag(match[2]);
              //console.log("TAG: " + match[2]);
              return {
                  tag: match[2],
                  cookie: cookies,
                  link: "http://stackoverflow.com/posts/" + match[1] + "/ivc/" + match[2],
                  question: q,
                  q_id: q.question_id
              };
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
    if (q == null) {
        return new No("question is null");
    }
    if(q.view_count>960)
        return new No("view count is too high");
    var qmeta = question_meta.n(index);
    if(qmeta.view_count>980)
        return new No("assumed too many views");
    if(!qmeta.shouldView())
        return new No("already viewed");
    //if (qmeta.sinceLastView() < 17 * 60 * 1000)
    //    return new No("viewed recently");
    return new Yes();
}
function viewAllQuestions(startIndex, lastError) {
    if(typeof startIndex!="number")
      startIndex = 0;
    var delay = 1800;  //Math.ceil(view_count_refresh_period/questions.length);
    // Ocassionally sort the array
    if (startIndex == 0) {
        questions.sort(question_sorter_meta);
        //question_meta.update();
    }


    startIndex=wrapIndexToArray(startIndex, questions);
    var decision;
    var skipCount = 0;
    var skipReasons = [];
    var lastTimeTag = question_meta.timeTag;
    // Skip question if it was viewed recently
    while((decision = QuestionFilter(startIndex)).no()) {
        //console.log("Skip "+startIndex+" because "+decision.reason);
        qmeta = question_meta.n(startIndex=wrapIndexToArray(startIndex+1, questions));
        skipCount++;
        if(skipReasons.indexOf(decision.reason) == -1)
          skipReasons.push(decision.reason);
        if (skipCount >= questions.length) {
            console.log("Skipped too many questions, waiting for update of tag " + lastTimeTag + ". Last reason: " + decision.reason);
            return Promise.delay(1000)
              .then(function () {
                  return getTimeTag(startIndex)
                    .then(function (results) {
                        //console.log("TAG LOADED!", results);
                        if (results.tag != lastTimeTag) {
                            return;
                        }
                        else {
                            console.log("    ... tag unchanged");
                            return Promise.delay(5000);
                        }
                    })
              })
              .then(function () {
                  console.log("Restarting view loop!");
                  viewAllQuestions(startIndex);
              });
        }
    }
    if (skipCount > 1) {
      var reasons = "";
      if(skipReasons.length==1) {
          reasons = "because "+skipReasons[0]+".";
      }
      else {
          reasons = "for the following reasons "+skipReasons.join(", ")+".";
      }
      console.log("Skipped " + skipCount + " questions "+reasons);
    }
    else if(skipCount == 1) {
      console.log("Skipped question because "+skipReasons[0]+".");
    }
        
    var startTime = new Date().getTime();
    return viewQuestion(startIndex)
      .delay(Math.max(0, delay-(new Date().getTime()-startTime)))
      .catch(function (error) {
           if(typeof lastError!="object" || lastError.message!=error.message)
               console.log("VIEW ERROR: "+error);
           return Promise.delay(1000)
             .then(function () {
                 return viewAllQuestions(startIndex, error);
             });
      })
      .then(function() {
           startIndex++;
           startIndex = wrapIndexToArray(startIndex, questions);
           if (lastTimeTag != question_meta.timeTag && lastTimeTag!="") {
               console.log("New time tag " + question_meta.timeTag + " - starting over! (old="+lastTimeTag+")");
               startIndex = 0;
           }
               
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
    //return new Promise(function () { throw new Error("DUMMY ERROR"); });
    return PromiseHTTPRequest({ url: user_questions.arg(acc_id)+params,
                    gzip: true })
    .then(function(result) {
        var questions = JSON.parse(result.body);
        return questions;
    })
}

function downloadAllQuestions(page, question_array) {
  if(!page || typeof page!="number" || page<1)
      page = 1;
  if(!(question_array instanceof Array)) {
      question_array = [];
  }

  //console.log("FETCH: page "+page);
  return downloadQuestions(questionParams+"&page="+page)
   .then(function(reply) {
       question_array.push.apply(question_array, reply.items);
       //console.log("FETCH: received "+reply.items.length+" questions.");
       if(reply.quota_remaining*1 < 10) {
           throw new Error("Exceeded max number of requests!");
       }
       if(reply.has_more) {
           return downloadAllQuestions(page+1, question_array);
       }
       else {
           return question_array;
       }
    });
}

function fetchAllQuestions(cacheFilename, cacheTimeout, question_array) {
    if(!(question_array instanceof Array)) {
        question_array = [];
    }
    var stat;
    try {
      stat = fs.statSync(cacheFilename);
    }
    catch(e) {
      stat = null;
    }

    if (stat != null && stat.isFile() && (new Date().getTime() - stat.mtime.getTime()) < cacheTimeout) {
        console.log("Loading from file...");
        return PromiseReadFile(cacheFilename)
          .then(function (data) {
              question_array.length = 0;
              question_array.push.apply(question_array, JSON.parse(data));
              return question_array;
          });
    }
    else if (cacheTimeout == Infinity) {
        throw new Error("Networkless mode failed, file not available!");
    }
    else {
        console.log("Loading from network...");
        return downloadAllQuestions(1)
          .catch(function (error) {
              console.log("ERROR (will retry cache): " + error);
              if (cacheTimeout >= 0)
                  return fetchAllQuestions(cacheFilename, Infinity, question_array);
              else {
                  console.log("Load from file disabled, returning false.");
                  return false;
              }
          })
          .then(function (data) {
              question_array.length = 0;
              question_array.push.apply(question_array, data);
              return PromiseWriteFile(cacheFilename, JSON.stringify(question_array))
                .then(function() {return question_array;});
          })
          .then(function(question_array){
              return question_array;
          })
    }
}
function updateQuestionArray(cacheFilename, cacheTimeout, question_array) {
    if (updateQuestionArray.update != null) {
        return updateQuestionArray.update;
    }
    return updateQuestionArray.update = fetchAllQuestionsSafe(cacheFilename, cacheTimeout, question_array)
      .then(function (new_array) {
          var return_val = question_array;
          if (new_array instanceof Array) {
              console.log("RETRIEVED: " + new_array.length);
              if (new_array != question_array) {
                  question_array.length = 0;
                  question_array.push.apply(question_array, new_array);
                  question_array.sort(question_sorter);
              }
              //PromiseWriteFile("test.json", JSON.stringify(new QMeta.QuestionMetaStorage(question_array).filter(["view_count", "title", "question_id"]))).then(function () { });
              //console.log("SORT!");
          }
          else {
              return_val = false;
          }
          updateQuestionArray.update = null;
          return return_val;
      });
}
updateQuestionArray.update = null;
// Loop for fetching questions
// loops infinitelly untill it succeeds 
// Provide original array and it returns it after failure instead of looping
function fetchAllQuestionsSafe(cacheFilename, cacheTimeout, question_array) {
    var tmp_array = [];
    return fetchAllQuestions(cacheFilename, cacheTimeout, tmp_array)
          .catch(function (error) {
              // If array not empty, we can return it
              if (question_array != null && question_array.length > 0) {
                  console.error("ERROR: Update failed, keeping old data.");
                  return question_array;
              }

              console.error("ERROR: Update failed, retry in 10 seconds.");
              return Promise.delay(10 * 1000)
                .then(function () {
                    return fetchAllQuestionsSafe(cacheFilename, cacheTimeout, question_array);
                });
          })
          .then(function (result) {
              if (result instanceof Array)
                  return result;
              else
                  return question_array;
          });
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
    //console.log("SAVE: ", name);
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
