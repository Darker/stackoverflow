// do not modify
// originally from sobot project
function Arguments(proc) {
    if (typeof proc == "object") {
        this.process = proc;
    }
    else {
        this.process = process;
    }
    this.parse();
}
Arguments.prototype.parse = function () {
    var p_args = this.process.argv;
    var args = this.args = {};
    for (var i = 0, l = p_args.length; i < l; i++) {
        var arg = p_args[i];
        var index = arg.indexOf("=");
        var name, value;
        if (index == -1) {
            name = arg;
            value = true;
        }
        else {
            name = arg.substr(0, index);
            value = arg.substr(index + 1);
        }
        var internal_name = "_" + name;
        var defined_already = false;
        if (args[internal_name]) {
            value = [value];
            value.push(args[internal_name]);
            defined_already = true;
        }
        args[internal_name] = value;
        if (!defined_already) {
            Object.defineProperty(args, name, {
                get: getterForName(internal_name)
            });
            Object.defineProperty(this, "arg_" + name, {
                get: getterForName(internal_name)
            });
        }
    }
}
function getterForName(name) {
    return function () {
        return this[name];
    }
}
function getterForNameArgs(name) {
    return function () {
        return this.args[name];
    }
}
module.exports = Arguments;