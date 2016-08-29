function Identifier() {

}
Identifier.prototype.getValue = function (meta) { throw new Error("Abstract method called!");};
Identifier.prototype.getMeta = function (meta) { throw new Error("Abstract method called!"); };
Identifier.fromValue = function (val) {
    if (typeof val == "number") {
        return new Index(val);
    }
    else if (typeof val == "object") {
        if (val.question_id) {
            return new Id(val.question_id);
        }
        else if (val instanceof Identifier) {
            return val;
        }
    }
}

function Index(index) {
    this.index = index;
    Identifier.call(this);
}
Index.prototype = Object.create(Identifier.prototype);
Index.prototype.getMeta = function (meta) {
    return meta.n(this.index*1);
};
Index.prototype.getValue = function (meta) {
    return meta.question(1 * this.index);
};

function Id(id) {
    this.id = id;
}
Id.prototype = Object.create(Identifier.prototype);
Id.prototype.getMeta = function (meta) {
    return meta.i(this.id);
};
Id.prototype.getValue = function (meta) {
    return meta.question(meta.indexById(this.id) * 1);
};

function IdentDelegate(id) {
    this.id = id;
}
IdentDelegate.prototype = Object.create(Identifier.prototype);
IdentDelegate.prototype.getValue = function (meta) {
    return this.id.getValue(meta);
};
IdentDelegate.prototype.getMeta = function (meta) {
    return this.id.getMeta(meta);
};
IdentDelegate.prototype.convert = function (type) {
    if (this.id instanceof type)
        return;
    else if (this.id instanceof Index && type == Id) {
        this.id = new Id(this.meta.question(this.id.index * 1));
    }
    else if (this.id instanceof Id && type == Index) {
        this.id = new Index(this.meta.indexById(this.id.id));
    }
}

Identifier.Id = Id;
Identifier.Delegate = IdentDelegate;
Identifier.Index = Index;
module.exports = Identifier;