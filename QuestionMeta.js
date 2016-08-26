function QuestionMetaStorage(db) {
    this.store = {};
    this.qdb = db;
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
    if (q.question_id)
        id = q.question_id;
    return this.byId(id);
}
QuestionMetaStorage.prototype.totalViews = function () {
    var total = 0;
    for (var i = 0, l = this.qdb.length; i < l; i++) {
        total += this.qdb[i].view_count;
    }
    return total;
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
delegateMethodById(QuestionMetaStorage.prototype, "updateTag");

function QuestionMeta(id, parent) {
    this.parent = parent;
    this.id = id;
    this.lastViewTime = 0;
    this.tag = "";
    this.lastTagUpdate = 0;
}
QuestionMeta.prototype.viewedNow = function () {
    this.lastViewTime = new Date().getTime();
}
QuestionMeta.prototype.shouldView = function () {
    if (this.lastViewTime < this.lastTagUpdate) {
        //console.log("SHOULD VIEW: last viewed before last tag update.");
        return true;
    }
    var now = new Date().getTime();
    if (now - this.lastTagUpdate > 14 * 60 * 1000){
        //console.log("SHOULD VIEW: last viewed more than 15 mins ago");
        return true;
    }
    //console.log("SHOULD NOT VIEW.");
    return false;
}
QuestionMeta.prototype.updateTag = function (tag) {
    if (tag != this.tag) {
        this.lastTagUpdate = new Date().getTime();
        this.tag = tag;
    }
}

module.exports = {
    QuestionMetaStorage: QuestionMetaStorage,
    QuestionMeta: QuestionMeta
};