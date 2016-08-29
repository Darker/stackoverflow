console.log(process.argv);
const Arguments = require("./SimpleArgv");
var args = new Arguments();
console.log(args.args, args.arg_d);

//const fs = require("fs");
//function question_sorter(a, b) {
//    //console.log(a.title + "(" + a.view_count + ") > " + b.title + "(" + b.view_count + ")")
//    return a.view_count - b.view_count;
//}
//fs.readFile("questions_shortest.json", null,
//        function (err, data) {
//            if (err) {
//                throw err;
//            }
//            else {
//                var q = JSON.parse(data);
//                if (!(q instanceof Array))
//                    throw new Error("File does not contain an array.");
//                sort_questions(q);
//            }
//        }
//);

//function sort_questions(q_array) {
//    // Save before sort
//    fs.writeFile("questions_before.json", toDebugJSON(q_array));
//    // sort
//    q_array.sort(question_sorter);
//    // Save after sort
//    fs.writeFile("questions_after.json", toDebugJSON(q_array));
//}
//function toDebugJSON(array) {
//    var filtered = filterProperties(array, ["view_count", "title", "question_id"]);
//    var string = JSON.stringify(filtered);
//    string = string.replace(/\},/g, "},\n");
//    return string;
//}


function filterProperties(array, properties) {
    var new_db = [];
    for (var i = 0, l = array.length; i < l; i++) {
        new_db.push(filterObj(array[i], properties));
    }
    function filterObj(obj, properties, new_obj) {
        if (typeof new_obj != "object")
            new_obj = {};
        for (var i = 0, l = properties.length; i < l; i++) {
            var prop = properties[i];
            if (obj.hasOwnProperty(prop)) {
                new_obj[prop] = obj[prop];
            }
        }
        return new_obj;
    }
    return new_db;
}