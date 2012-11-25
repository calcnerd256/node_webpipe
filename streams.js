var EventEmitter = require("events").EventEmitter;

function EventSponge(noBuffer){
 if(!noBuffer) this.pause();
 this.emitter = new EventEmitter();
}
EventSponge.prototype.emit = function emit(){
 if(!this.buffer)
  return applyFrom(this.emitter, "emit", arguments);
 this.buffer.push(arguments);
 return this;
};
EventSponge.prototype.on = function on(){
 return applyFrom(this.emitter, "on", arguments);
};
EventSponge.prototype.pause = function pause(){
 if(!this.buffer) this.buffer = [];
 return this;
};
EventSponge.prototype.resume = function resume(){
 if(!this.buffer) return;
 this.buffer.map(
  Function.prototype.apply.bind(
   this.emitter.emit,
   this.emitter
  )
 );
 delete this.buffer;
 return this;
};


function SingleCharacterDelimiterLexerEmitter(stream, delimiter){
 this.delimiter = delimiter;
 this.emitter = new EventSponge();
 stream.on(
  "data",
  this.handleChunk.bind(this)
 ).on(
  "end",
  function(){
   this.delimit(true);
   this.emitter.emit("end");
  }.bind(this)
 );
 this.delimit();
}
SingleCharacterDelimiterLexerEmitter.prototype.delimit = function delimit(last){
 if(this.buffer)
  this.buffer.emit.bind(this.buffer, "end").apply(this.buffer, arguments);
 delete this.buffer;
 if(!last)
  this.emitter.emit("lexer", this.buffer = new EventSponge());
};
SingleCharacterDelimiterLexerEmitter.prototype.handleChunk = function handleChunk(chunk){
 if(chunk.toString().indexOf(this.delimiter) == -1)
  return this.buffer.emit("data", chunk);
 var tokens = chunk.toString().split(this.delimiter);//not binary-safe
 var remaining = tokens.pop();
 remaining.map(
  function(token){
   this.buffer.emit("data", token);
   this.delimit();
  }
 );
 this.buffer.emit("data", remaining);
};
SingleCharacterDelimiterLexerEmitter.prototype.on = function on(){
 this.emitter.on.apply(this.emitter, arguments);
 return this;
};
SingleCharacterDelimiterLexerEmitter.prototype.pause = function pause(){
 return applyFrom(this.emitter, "pause", arguments);
};
SingleCharacterDelimiterLexerEmitter.prototype.resume = function resume(){
 return applyFrom(this.emitter, "resume", arguments);
};


function applyFrom(that, methodName, args){
 return that[methodName].apply(that, args);
}

this.EventSponge = EventSponge;
this.SingleCharacterDelimiterLexerEmitter = SingleCharacterDelimiterLexerEmitter;
this.applyFrom = applyFrom;