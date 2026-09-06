// Node-only browser boundary: record native Path2D geometry for canvas assertions.
module.exports=class CanvasPath {
    constructor(){this.commands=[];}
    rect(...args){this.commands.push(['rect',...args]);}
    ellipse(...args){this.commands.push(['ellipse',...args]);}
    moveTo(...args){this.commands.push(['moveTo',...args]);}
    lineTo(...args){this.commands.push(['lineTo',...args]);}
    closePath(){this.commands.push(['closePath']);}
};
