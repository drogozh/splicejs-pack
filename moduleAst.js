const fs = require('fs');
const babelTraverse = require('@babel/traverse')['default'];
const fileUtils = require('./fileUtils');
const { default: generate } = require('@babel/generator');
const { doesNotMatch } = require('assert');
const babelGenerator = require('@babel/generator')['default'];

var moduleInstances = {
    id:0
}

function ModuleAst(path,ast){   
    this.path = path;    
    this.dependencies = [];
    this._resolvedDependencies = [];
    this._resolvedStyleSheets = [];
    this.body = null;  
    this._templateReferences = [];
    this._templates = [];
    if(ast == null){
        return;
    }
    this.id = ++moduleInstances.id;
    babelTraverse(ast,{enter: (function(path){
        // call to modules define function
        if( path.type == 'CallExpression' &&  
            path.node.callee.name == 'define' &&  
            path.node.callee.type == 'Identifier'){       
            this._bodyPath = path;
            _visitArguments.call(this,path.node.arguments);
        }

        // collect template references
        if( path.type == 'CallExpression' 
            && path.node.callee.type == 'MemberExpression' 
            && path.node.callee.property.type == 'Identifier' 
            && path.node.callee.property.name == 'define' 
            && path.node.arguments.length > 1 
            && path.node.arguments[0].type == 'StringLiteral') {           
                var result = /^(.*):(.*)$/g.exec(path.node.arguments[0].value);
                var templateFile = fileUtils.resolvePath(this.path, result[2]); 
                if(result != null && result.length == 3){
                    _addTemplateReference.call(this,result[1], path, templateFile);
                }           
        }
    }).bind(this)},{type:'Program', body:this.body});
}

ModuleAst.prototype.getExportsReference = function() {
    return '__exports' + this.id;
}

ModuleAst.prototype.getExportsCode = function() {
    if(this._bodyPath == null) return '';
    return 'var __exports' + this.id + ' = {};\n'
}

ModuleAst.prototype.getCode = function(allModules) {
    if(this._bodyPath == null) return '';
    //var code = babelGenerator(this._bodyPath.node);
    
    var args = [];
    for(var i=0; i<this._resolvedDependencies.length; i++){
        var m = this._resolvedDependencies[i];
        var expRef = '';
        switch(m.path){
            case 'require':
            case 'loader':
                expRef = m.path;
                break;
            case 'exports':
                expRef = this.getExportsReference();
                break;
            default:
                expRef = this._resolvedDependencies[i].getExportsReference();
                break;
        }
        args.push({type:'Identifier',name:expRef});
    }

    var exp = {
        type:'VariableDeclaration',
        kind:'var',
        declarations:[{
            type:'VariableDeclarator',
            id: {type: 'Identifier', name:this.getExportsReference()},
            init: this.body(args)
        }]
    }

    //var code = babelGenerator(this.body(args));
    var code = babelGenerator(exp,{minified:true,comments:false});
    return code.code + '\n';
}

function _addTemplateReference(name, path, fileName) {
    var list = this._templateReferences[fileName];
    if(list == null) {
        list = this._templateReferences[fileName] = [];
        this._templates[fileName] = fs.readFileSync(fileName,{encoding:'utf8'});
    }
    list.push( {name, path} );

    // embed component definition templates
    var templateLiteral = {
        type: 'StringLiteral',
        value: this._templates[fileName]
    };
    
    var templateCallExp = {
        type:'CallExpression',
        arguments:[templateLiteral],
        callee: {
            type:'Identifier',
            name:'__template'
        }
    }

    var viewModelIdentifier = {
        type: 'Identifier',
        name: path.node.arguments[1].name
    };

    var templateNameLiteral = {
        type: 'StringLiteral',
        value: name
    };

    path.node.arguments = [
        templateCallExp, templateNameLiteral, viewModelIdentifier
    ];
}

function _visitArguments(arguments) {
    for(var i=0; i < arguments.length; i++) {
        _visitSingleArgument.call(this, arguments[i]);
    }               
}

function _visitSingleArgument(ast) {
    switch(ast.type){
        case 'ArrayExpression':
            var elements = ast.elements;
            for(var i=0; i< elements.length; i++){
                var element = elements[i];
                switch(element.type){
                    case 'StringLiteral':
                        this.dependencies.push(elements[i].value);
                    break;
                    case 'ObjectExpression':
                        console.log('object argument');
                        break;
                }
            }
           break;
        case 'FunctionExpression':
            this.body = function(args){
                return {
                type:'CallExpression',
                arguments:args,
                callee:{
                    type:'CallExpression', 
                    arguments:[
                        {type:'Identifier',name:'__exports'+this.id},
                        ast],
                    callee:{
                        type:'Identifier',
                        name: '__sjsWrap'
                    }
                },
            };};
            break;
    }
}

function _normalizeDependency(dependency){
    switch(dependency){
        case 'exports':
        case 'require':
        case 'loader':
        return dependency;
    }
    return fileUtils.normalizePath(fileUtils.resolvePath(this.path, dependency)); 
}

exports.ModuleAst = ModuleAst;