var stackexchange = require('stackexchange');
var options = { version: 2.2 };
var context = new stackexchange(options);
 
var filter = {
  key: 'CyTI8gX2z1jHX3KCJ1pgfA((',
  pagesize: 20,
  //tagged: 'java',
  sort: 'activity',
  order: 'desc',
  filter: "!)re8-BDP6GTMm0itJqqP"
};

//var test = "I am trying to restrict certain getter setter overload override struct lazy-loaded characters, especially `.` only to the middle of my regex matches. That is, I want to match `Node.js` but not `end.` or `.css`.\n\nMy current regex has the problem that it requires at least two letters to work:\n\n    [\w]+[\w\.']*[\w']+\n\nYou can also see that I want to allow `'` in the middle and at the end, as in `I'm` or `students' papers`.\n\nThe problem with this one is that single letter words are not matched, eg. `I`. How to fix that? Here's a testcase: https://regex101.com/r/hV9fQ5/1";


/** Dictionary **/
var Entities = require('html-entities').AllHtmlEntities;
entities = new Entities();

var non_checked_data_regex = [
  [/`[^`]+`/g, "code"],
  [/(\n|^)( {4,}|\t).*?(?=\n|$)/gm, "\nline of code"],
  [/\.[a-z]{2,3}/g,""], // File extension 
  [/[a-z]{3,}:\/\/[^ ]+/g, ""],
  [/<!\-\-.*?\-\->/g, ""],  //comment
  //[/[a-z]/g, function(x) {return "&#"+x.charCodeAt(0);}]   
];
var replacements = [
  //[/[a-z]/g, function(x) {return "&#"+x.charCodeAt(0);}]  
  [/(&#?[a-z0-9]+;)/gi, function(x) {return entities.decode(x);}], 
];

// Prvni pismeno ve vete male: (^| \.|\n)([a-z])
var word_regex = /([\w]+[\w\.\(\)']*([\w]+|\([a-z\d]*\))|[a-z])/ig;
var programmingSymbol = /([_\-\(\[\+\[\)\*\/]|[a-z][A-Z])/g;
var extensions = ["js","css","csv","exe","c","cpp","h","html"];
var numberWithUnits = /^[\d\.,]+([a-zA-Z\/]{1,5})?$/
var name = /^[A-Z][\d\w_\-\(\[\)\]]+$/;

var dictionary;

require('colors');

// Get all the questions (http://api.stackexchange.com/docs/questions) 
context.questions.questions(filter, function(err, results){
  if (err) throw err;
  
  //console.log(results.items);
  results.items.forEach(function(item) {
    validateQuestion(item.title, item.body_markdown);
  });
  
  //console.log(results.has_more);
});    

var Typo = require("./typo.js");

var fs = require("fs");
dictionary = new Typo("en_US", fs.readFileSync("dict/en-US.aff", "utf-8"), fs.readFileSync("dict/en-US.dic", "utf-8"), {dictionaryPath: "dict", encoding: "utf-8"});

//validateQuestion("test", test);
             
// Returns number of word's character that are within ignored region
// can be simply used as boolean value             
function inIgnoredRegion(regions, index, length) {
  var end = index+length;
  var characters = 0;
  for(var i=0,l=regions.length; i<l; i++) {
    var rstart = regions[i][0],
        rend   = regions[i][1];
    // If beginning is before region
    if(rstart >= index) {
      characters = Math.max(0, end<rend?end-rstart:rend-rstart);
    }
    // if beginning is in region
    else if(rend > index) {
      characters = end<rend?length:rend-index;
    }
    // else... the beginning is after region and we know character count is 0
  
    // If any characters are in the region, quit and return the count
    if(characters > 0) {
      return characters;
    } 
  }
  return 0;
}

function validateQuestion(title, markdown) {
  console.log("Checking question: ",title.inverse,"\n--------------");
  var output = "";
  
  var text = markdown;
  var result, lastresult;
  var ignored_regions = [];

  for(var i=0,l=replacements.length; i<l; i++) {
    text = text.replace(replacements[i][0], replacements[i][1]);
  }
  
  for(var i=0,l=non_checked_data_regex.length; i<l; i++) {
      while((result = non_checked_data_regex[i][0].exec(text)) !== null) {
          ignored_regions.push([result.index, result.index+result[0].length]);
      }
  }
  // console.log(ignored_regions);
  // console.log(inIgnoredRegion(ignored_regions, 154, 3));
  result = null;
  // return;
  while((result = word_regex.exec(text)) !== null) {
      if(lastresult) {
          var start = lastresult[0].length + lastresult.index;
          //process.stdout.write(text.substr(start, result.index-start));
          output+=text.substr(start, result.index-start);
      }
      else {
          output+=text.substr(0, result.index);
      }
      var word = result[0];
      var wrong = [];
      /*if(word=="css") {
          console.log("\n", result.index, ",", word.length, " ", word);
          return;
      }    */
      if(inIgnoredRegion(ignored_regions, result.index, result[0].length)>0) {
          output+=word.gray;
      }
      else if(!dictionary.check(word)) {
          
          var correct = null;
          var word_copy = null; // no replacement but highlighting          

          if((word.match(programmingSymbol)||[]).length>=word.length/20 || extensions.indexOf(word)!=-1 ) {
              correct = "`"+word+"`";
          }
          else if(numberWithUnits.test(word)) {
              word_copy = word.cyan;
          }
          else if(name.test(word)) {
              //If there's multiple capitals (camel case) it's a programming symbol
              if(/[a-z][A-Z]/.test(word)) {
                  correct = "`"+word+"gfdgfdgf`";
              }
              else {
                  word_copy = word.cyan;
              }
          }
          else {
              var suggestions = dictionary.suggest(result[0]);
              if(suggestions.length>0) {
                // Case sugestions (eg. jquery to jQuery) are allways preffered
                var wordlower = word.toLowerCase();
                for(var i=0,l=suggestions.length; i<l; i++) {
                  if(wordlower == suggestions[i].toLowerCase()) {
                     correct = suggestions[i];
                     break;
                  } 
                }
                // If no preferred suggestions found, use first suggestion:
                if(!correct)
                    correct = suggestions[0];
              }
          }
          
          if(correct) {
              output+=(word.red);
              output+=(correct.green);
              wrong.push(word);
          }
          else if(word_copy) {
              output+=(word_copy); 
          }
          else {
              output+=(word.yellow); 
          }
      }
      else {
          output+=(word);
      }     
      //process.stdout.write(word);
      lastresult = result;
      
  }
  if(wrong.length>5) {
      console.log(output);
  }
  else {
      console.log("  No important changes.");
  }
  //process.stdout.write("\n");
  console.log("Done.\n==============================================================================================================");
  
}