const Identifier = require("./Identifier");
function QuestionMetaStorage(db) {
    this.store = {};
    this.qdb = db;
    this.timeTag = "";
    this.lastTagUpdate = 0;
}
QuestionMetaStorage.prototype.byId = function (id) {
    return this.store[id]||(this.store[id] = new QuestionMeta(id, this));
}
QuestionMetaStorage.prototype.i = function (id) {
    return this.byId(id);
}
QuestionMetaStorage.prototype.n = function (i) {
    var q = this.qdb[i];
    var id = "invalid";
    if (q && q.question_id)
        id = q.question_id;
    else {
        throw new Error("Illegal question index "+i)
    }
    return this.byId(id);
}
QuestionMetaStorage.prototype.question = function(selector) {
    if(typeof selector == "number") {
        return this.qdb[selector];
    }
    else if(typeof selector == "object") {
        if(selector instanceof QuestionMeta) {
            var index = this.indexById(selector.question_id);
            //selector.index = index;
            return this.qdb[index];
        }
        else if (selector instanceof Identifier) {
            return selector.getValue(this);
        }
    }
}
QuestionMetaStorage.prototype.meta = function (selector) {
    if (typeof selector == "number") {
        return this.n(selector);
    }
    else if (typeof selector == "object") {
        if (selector instanceof QuestionMeta) {
            return this.byId(seletor.question_id);
        }
        else if (selector instanceof Identifier) {
            return selector.getMeta(this);
        }
    }
    console.log("BAD SELECTOR: ", selector);
    throw new Error("Invalid question identifier passed!");
}
QuestionMetaStorage.prototype.update = function(newQuestionArray) {
    this.qdb = newQuestionArray;
    for (var i in this.store)
    {
        var meta = this.store[i];
        if(meta instanceof QuestionMeta) {
            meta.update();
        }
    }
}
QuestionMetaStorage.prototype.indexById = function(id) {
    return this.qdb.findIndex(function(x){return x.question_id == id;});
}
QuestionMetaStorage.prototype.totalViews = function () {
    var total = 0;
    for (var i = 0, l = this.qdb.length; i < l; i++) {
        total += this.qdb[i].view_count;
    }
    return total;
}
QuestionMetaStorage.prototype.updateTag = function (tag) {
    if (tag != this.timeTag) {
        this.lastTagUpdate = new Date().getTime();
        this.timeTag = tag;
    }
}
QuestionMetaStorage.prototype.print = function (property) {
    for (var i = 0, l = this.qdb.length;i<l; i++) {
        console.log("#"+i+" id="+this.qdb[i].question_id + " views: "+this.qdb[i].view_count);
        console.log("    "+this.qdb[i][property]);
    }
}
QuestionMetaStorage.prototype.filter = function (properties) {
    var new_db = [];
    for (var i = 0, l = this.qdb.length; i < l; i++) {
        new_db.push(filterObj(this.qdb[i], properties));
    }
    function filterObj(obj, properties, new_obj) {
        if (typeof new_obj != "object")
            new_obj = {};
        for (var i=0,l=properties.length; i<l; i++) {
            var prop = properties[i];
            if (obj.hasOwnProperty(prop)) {
                new_obj[prop] = obj[prop];
            }
        }
        return new_obj;
    }
    return new_db;
}
QuestionMetaStorage.prototype.pageForQuestion = function (question_id, per_page) {
    //var q = this.
}

function delegateMethodById(obj, name) {
    obj[name] = function(id) {
      var args = [];
      args.push.apply(args, arguments);
      args.splice(0,1);
      var obj = this.byId(id);
      return obj[name].apply(obj, args);
    }
}
delegateMethodById(QuestionMetaStorage.prototype, "shouldView");
delegateMethodById(QuestionMetaStorage.prototype, "viewedNow");
//delegateMethodById(QuestionMetaStorage.prototype, "updateTag");

function QuestionMeta(id, parent) {
    this.parent = parent;
    this.question_id = id;
    this.lastViewTime = 0;
    this.tag = "";
    this.view_count = 0;
}
QuestionMeta.prototype.viewedNow = function () {
    this.lastViewTime = new Date().getTime();
    this.view_count++;
}
QuestionMeta.prototype.updateRealViews = function (){
    this.view_count = this.parent.question(this).view_count;
}
QuestionMeta.prototype.sinceLastView = function () {
    return new Date().getTime() - this.lastViewTime;
}
QuestionMeta.prototype.shouldView = function () {
    if (this.lastViewTime < this.parent.lastTagUpdate) {
        //console.log("SHOULD VIEW: last viewed before last tag update.");
        return true;
    }
    var now = new Date().getTime();
    if (now - this.parent.lastTagUpdate > 16 * 60 * 1000){
        //console.log("SHOULD VIEW: last viewed more than 15 mins ago");
        return true;
    }
    //console.log("SHOULD NOT VIEW.");
    return false;
}
QuestionMeta.prototype.update = function () {
    this.updateRealViews();
}

module.exports = {
    QuestionMetaStorage: QuestionMetaStorage,
    QuestionMeta: QuestionMeta
};