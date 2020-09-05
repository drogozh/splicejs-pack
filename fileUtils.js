const pathSeparator = process.cwd().startsWith('/') ? '/' : '\\';
const pathSeparatorInverse = process.cwd().startsWith('/') ? '\\' : '/';

function isAbsPath(path){
    return path.startsWith(pathSeparator) || /^[A-Za-z]:\\/g.exec(path) != null;
}

function combinePath(base,path) {
    return base + pathSeparator + path;
}

function resolvePath(base, path) {
    if(isAbsPath(path)) return path;
    var basePath = base.substring(0,base.lastIndexOf(pathSeparator));
    return combinePath(basePath, path);
}

function normalizePath(path) {
    var parts = path.replace(RegExp(pathSeparatorInverse,'g'), pathSeparator).split(pathSeparator);
    var p = [];
    parts.forEach(element => {
        if(element == '.') return;
        if(element == '..') { 
            p.pop(); return 
        }
        p.push(element);
    });

    var separator = '';
    var result = '';
    for(var i=0; i< p.length; i++){
        result = result + separator + p[i];
        separator = pathSeparator;
    }
    return result;
}

function getFileExt(url){
    var idx = url.lastIndexOf(".");
    return (idx > -1 && idx > url.lastIndexOf(_config.pathSeparator)) ?  url.substr(idx) : '.js';
}

exports.isAbsPath = isAbsPath;
exports.combinePath = combinePath;
exports.resolvePath = resolvePath;
exports.normalizePath = normalizePath;
exports.getFileExt = getFileExt;