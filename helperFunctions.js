var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};

var __sjsWrap = function(exports, fn){
    return function() {
        var result = fn.apply({},arguments);
        if(result != null) {
            return result;
        }
        return exports;
    }
};

// HTML template handler
function Template(node,name,key){
    this.node = node;
    this.name = name;
    this.key = key;
}

function TemplateCollection(node){
    this.templates = {};
    var nodes = node.querySelectorAll('template');
    
    for(var i=0; i<nodes.length; i++){
        var node = nodes[i];
        var name = node.getAttribute('sjs-name');
        var key = node.getAttribute('sjs-key');
        if(!key) key = "default";
        if(!name) continue;

        if(node.tagName == 'TEMPLATE' && node.content){
            node = node.content;
        }

        //isolate node
        if(node.children.length == 1){ 
            node = node.children[0];
        }
        else {
            var root = document.createElement('div');
            var children = node.children;
            for(var i=0; i<children.length; i++){
                root.appendChild(children[i]);
            }
            node = root;
        }  
        //this.templates[attr] = new Template(node);
        this.add(name, new Template(node,name,key));
    }
}

TemplateCollection.prototype.add = function add(key,template){
    var list = this.templates[key];
    if(!list){
        this.templates[key] = list = [];
    }
    this.templates[key].push(template);
};

var __template = function(template){
    var node = document.createElement('span');
    node.innerHTML = template;
    return new TemplateCollection(node).templates;
}
