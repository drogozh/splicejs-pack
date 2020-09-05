const PROGRAM_PATH = 1;
const CONFIG_ARGUMENT = 2;

const babelParser = require('@babel/parser');
const babelGenerator = require('@babel/generator')['default'];
const babelTraverse = require('@babel/traverse')['default'];
const fileUtils = require('./fileUtils');
const ModuleAst = require('./moduleAst').ModuleAst;

const fs = require('fs');
const { exit } = require('process');
const { transcode } = require('buffer');

var configFile = process.argv[CONFIG_ARGUMENT];
var programPath = process.argv[PROGRAM_PATH];

const allModules = {};
const allCss = {};

console.log("SpliceJS Pack");
if(configFile != null) {
    console.log('Loading config file from:');
    console.log(configFile);
    if(!fs.existsSync(configFile)){
        console.log(configFile + ' not found');
        exit(1);
    }
    processConfig(configFile);
} else {
    console.log('Looking for splicepack.json in current directory: ' + __dirname);
    const fileName = combinePath(__dirname, 'splicepack.json');
    if(!fs.existsSync(fileName)) {
        console.log(fileName + ' not found');
        exit(0);
    }
    processConfig(fileName);
}

var config = null; 
function processConfig(fileName) {
    var buffer = fs.readFileSync(fileName);
    config = JSON.parse(buffer);  
    constructDependencyTree(fileName);
    var keys = Object.keys(allModules);
    console.log("Loaded: " + keys.length + " modules");
}

function constructDependencyTree(base) {
    var path = config.main;
    console.log('Constructing dependency tree for: ' + path);
    var modulePath = fileUtils.resolvePath(base,path);
    var rootModule = loadModule(fileUtils.normalizePath(modulePath + '.js'));
    var collection = {};
    traverse(rootModule, collection);
    writeBundle(collection);
}

function traverse(root, collection){
    for(var i=0; i< root._resolvedDependencies.length; i++){
        traverse(root._resolvedDependencies[i],collection);
    }
    if(collection[root.path] != null) return;
    collection[root.path] = root;
}

function writeBundle(collection){
    var keys = Object.keys(collection);
    var stream = fs.createWriteStream('bundle.js');
    var cssStream = fs.createWriteStream('bundle.css');
    
    // write header functions
    var helperFunctions = fs.readFileSync(fileUtils.resolvePath(programPath,'helperFunctions.js'),{encoding:'utf8'});
    stream.write(helperFunctions);

    for(var i=0; i < keys.length; i++ ){
        var m = collection[keys[i]];
        
        //write module code
        try {
           // stream.write('/*'+m.path+'*/\n');
            stream.write(m.getExportsCode());
            stream.write(m.getCode(allModules));
        } catch(ex) {
            console.log(ex);
            break;
        }

        //write css code
        try {
            for(var j = 0; j < m._resolvedStyleSheets.length; j++){
                var content = allCss[m._resolvedStyleSheets[j]];
                cssStream.write(content);
                cssStream.write('\n');
            }        
        } catch(ex) {

        }
    }

    cssStream.end();
    stream.end();
}

function loadCss(cssPath, model) {
    if(allCss[cssPath] != null) {
        return;
    }
    model._resolvedStyleSheets.push(cssPath); 
    var cssContent = fs.readFileSync(cssPath);
    allCss[cssPath] = cssContent;
    
    var cssImports = /@import '(.*)';/g.exec(cssContent);
    if(cssImports != null) {
        var subPath = fileUtils.normalizePath(fileUtils.resolvePath(cssPath,cssImports[1]));
        loadCss(subPath,model);
        console.log('found css imports');
    }

    console.log(cssPath);

}

function loadModule(path) {
    if(allModules[path] != null) return allModules[path];
    console.log('Loading module: ' + path);
    var buffer = fs.readFileSync(path,{encoding:'utf8'});
    var fileAst = babelParser.parse(buffer);
    var model = allModules[path] = new ModuleAst(path, fileAst);

    for(var i=0; i< model.dependencies.length; i++) {
        var ref = model.dependencies[i];
        if(ref == 'require' || ref == 'loader' || ref == 'exports') {
            model._resolvedDependencies[i] = new ModuleAst(ref);
            continue;
        }
        if(ref.startsWith('!')) { 
            if(/\.css$/g.exec(ref) != null){
                var cssPath = fileUtils.normalizePath(fileUtils.resolvePath(path, applyPathSubstitutions(ref.substring(1))));
                loadCss(cssPath,model);
            }
            continue; 
        }
        if(ref.startsWith('preload|')) continue;
        ref = ref + '.js';
        var p = fileUtils.normalizePath(fileUtils.resolvePath(path, 
            applyPathSubstitutions(
                applyModuleRedirect(ref))));
        model._resolvedDependencies[i] = loadModule(p);
    }
    return model;
}

function applyPathSubstitutions(path) {
    var keys = Object.keys(config.pathVar);
    for(var i=0; i < keys.length; i++) {
        var value = config.pathVar[keys[i]];
        if(!fileUtils.isAbsPath(value)){
            value = fileUtils.normalizePath(fileUtils.resolvePath(configFile,value));
        }
        path = path.replace(keys[i],value);
    }
    return path;
}

function applyModuleRedirect(path){
    var keys = Object.keys(config.moduleRedirect);
    for(var i=0; i < keys.length; i++) {
        var value = config.moduleRedirect[keys[i]];
        path = path.replace(keys[i],value);
    }
    return path;
}

