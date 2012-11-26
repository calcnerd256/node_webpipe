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
 applyFrom(this.emitter, "on", arguments);
 return this;
};
EventSponge.prototype.once = function once(){
 applyFrom(this.emitter, "once", arguments);
 return this;
}
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


function SingleCharacterSingleSplitter(stream, delimiter){
 this.delimiter = delimiter;
 this.before = new EventSponge();
 this.andAfter = new EventSponge();
 this.foundIt = false;
 this.events = new EventEmitter();
 stream.on("data", this.handleChunk.bind(this));
 stream.on("end", this.end.bind(this));
}
SingleCharacterSingleSplitter.prototype.handleChunk = function(chunk){
 if(this.foundIt) return this.andAfter.emit("data", chunk);
 var i = chunk.toString().indexOf(this.delimiter);
 if(-1 == i) return this.before.emit("data", chunk);
 this.before.emit("data", chunk.slice(0, i));
 this.andAfter.emit("data", chunk.slice(i));
 this.foundIt = true;
 this.before.emit("end");
}
SingleCharacterSingleSplitter.prototype.end = function(){
 this.events.emit("end");
 if(!this.foundIt) this.before.emit("end");
 this.andAfter.emit("end");
}


function SingleCharacterDelimiterLexerEmitter(stream, delimiter){
 //TODO rewrite in terms of SingleCharacterSingleSplitter chain
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
 applyFrom(this.emitter, "on", arguments);
 return this;
};
SingleCharacterDelimiterLexerEmitter.prototype.once = function once(){
 applyFrom(this.emitter, "once", arguments);
 return this;
}
SingleCharacterDelimiterLexerEmitter.prototype.pause = function pause(){
 return applyFrom(this.emitter, "pause", arguments);
};
SingleCharacterDelimiterLexerEmitter.prototype.resume = function resume(){
 return applyFrom(this.emitter, "resume", arguments);
};


function applyFrom(that, methodName, args){
 return that[methodName].apply(that, args);
}

function compose(f, g){
 //like mathematical function composition
 // compose(f, g)(x) = f(g(x))
 function composition(){
  var intermediate = g.apply(this, arguments);
  return f(intermediate);
 }
 //I hate un-debuggable closures
 //if I handed you a function like the above, without the lines below, you wouldn't be able to do anything but call it
 //it's nice to be able to crack it open and look at things like the f and g variables
 //but they're only defined in this scope, so you can't ask about them outside of this scope, even if you have a function that uses them
 //that function gets their scope, but having that function doesn't let you read its scope
 //so I like to do the following
 composition.f = f;
 composition.g = g;
 //that way for some f, compose(f, g).f === f
 // and for some g, compose(f, g).g === g
 //which can make debugging easier, especially if you have lots of functions that all came from calls to compose
 return composition;
}

function bufferChunks(stream, callback){
 //data from the readable stream doesn't come in all at once

 var buffer = [];

 //Array.prototype is the object that all instances of Array inherit from
 //inheritance in JS is prototypical, which is kind of like patching
 //so Array.prototype.push is the function that all arrays use for stack-like push behavior
 //Array.prototype also has such methods as pop and shift and unshift for deque access
 //so Array.prototype.push is a function
 //it appends its argument to the end of whatever array it's called on
 //by "called on", I mean someArray.push(someValue) sees someArray as "this"
 //JavaScript has a "this" variable accessible in the body of every function
 //there are some functions that override the "this" of a function
 //Function.prototype.bind is such a function
 //it takes the new "this" as its first parameter
 //you can also optionally pass it additional parameters to pass to the function
 //it is documented at https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Function/bind
 //so here, Array.prototype.push is a function, so its bind method is equal to Function.prototype.bind
 //calling Function.prototype.bind as Array.prototype.push.bind sets bind's "this" to Array.prototype.push within the call
 //so bind tries to do something with its "this", and the thing bind does with its this is set the this of that this
 // selah
 //I want to push a chunk onto the end of an array
 //stream.on("data", fn) will pass the chunk to fn as fn's only parameter
 //so I want a function that will take a chunk as a parameter and call buffer.push with that chunk as the parameter
 //to call buffer.push is to call the function that is value of buffer's "push" attribute, and to let "this" refer to buffer when doing so
 //Function.prototype.bind lets me set the "this" of a function
 //so, putting it all together, Array.prototype.push.bind(buffer) returns a function that forwards its arguments to the "push" method that instances of Array have by default, and it uses buffer as its "this" variable
 stream.on("data", Array.prototype.push.bind(buffer));
 //the above line is equivalent to stream.on("data", function(){[].push.apply(buffer, arguments)});
 //in this case, that's equivalent to stream.on("data", function(chunk){buffer.push(chunk);})
 // which is much easier to explain than all that bind() stuff, but "this" is an important concept

 //okay, this one is also kind of hard to read
 //it basically says that when stream emits "end", we pass the result of buffer.join("") to callback
 //it takes advantage of Function.prototype.bind as above, but it uses it to pass it a "partial" argument list
 // (although, in this case, since the "end" event doesn't pass any arguments, it's actually complete, so the bind becomes a thunk)
 // a thunk is a nullary procedure, or one with zero arguments
 // I think it comes from thunk as in think, but I also like to imagine it like it gets struck and, with a "thwack"ing sound, the delayed action falls out (and maybe plops on the ground)
 //anyway, [].join.bind(buffer, "") is a thunk equal (for our purposes) to function(){return buffer.join("");}
 //composing that thunk with callback is like mathematical function composition: it passes the result of the inner function to the outer one
 // this has the effect of calling our continuation for us when the stream closes, and it passes our accumulated buffer to the next step
 stream.on("end", compose(callback, Array.prototype.join.bind(buffer, "")));
 return stream;

 //stop reading after the above line, because nothing else in this function actually happens


 //this whole function body could be written as
 return (
  function(buffer){
   return stream.on(
    "data",
    [].push.bind(buffer)
   ).on(
    "end",
    [].join.bind(buffer, "")
   );
  }
 )([]);

 //or even as
 return (
  function(dictionaryListen, buffer){
   return dictionaryListen(
    stream,
    {
     "data": [].push.bind(buffer),
     "end": [].join.bind(buffer, "")
    }
   );
  }
 )(
  function dictionaryListen(emitter, listeners){
   for(var channel in listeners)
    emitter.on(channel, listeners[channel]);
   return emitter;
  },
  []
 );
 //and dictionaryListen could be written as
 (
  function(emitter, listeners){
   var alist = (
    function dictionaryToAttributeList(dictionary){
     return Object.keys(dictionary).map(
      function(k){
       return [k, dictionary[k]];
      }
     )
    }
   )(listeners);
   return alist.reduce(
    function(em, kv){
     return em.on(kv[0], kv[1]);
    },
    emitter
   );
  }
 )
 //but even that can be written more tersely as
 (
  function(emitter, listeners){
   return Object.keys(listeners).map(
    function(k){
     return [k, listeners[k]];
    }
   ).reduce(
    (function(){}).apply.bind(emitter.on),
    emitter
   );
  }
 )
 //though, if you already had dictionaryToAttributeList defined, then
 (
  function(emitter, listeners){
   return dictionaryToAttributeList(listeners).reduce(
    (function(){}).apply.bind(emitter.on),
    emitter
   );
  }
 )
 //would be the shortest implementation of dictionaryListen I can think of offhand
 //or at least the shortest one that meets my criteria for macho elegance
}

function SlicingStream(stream, offset){
 //discard the first offset bytes of the stream
 this.emitter = new EventEmitter();
 this.remaining = offset;
 stream.on("data", this.handleChunk.bind(this)).on("end", this.emitter.emit.bind(this.emitter, "end"));
}
SlicingStream.prototype.handleChunk = function(chunk){
 var remaining = this.remaining;
 this.remaining -= chunk.length;
 if(remaining > chunk.length) return;
 this.emitter.emit("data", chunk.slice(remaining));
 this.remaining = 0;
}
SlicingStream.prototype.on = function on(){
 this.emitter.on.apply(this.emitter, arguments);
 return this;
}

function FunctionImageStream(stream, fn){
 this.fn = fn;
 this.emitter = new EventSponge();
 stream.on("data", compose(this.emitter.emit.bind(this.emitter, "data"), this.fn)).on("end", this.emitter.emit.bind(this.emitter, "end"));
}
FunctionImageStream.prototype.on = function on(){
 this.emitter.on.apply(this.emitter, arguments);
 return this;
};
FunctionImageStream.prototype.pause = function pause(){
 this.emitter.pause.apply(this.emitter, arguments);
 return this;
};
FunctionImageStream.prototype.resume = function resume(){
 this.emitter.resume.apply(this.emitter, arguments);
 return this;
};

function VaryingBufferStream(stream, measure){
 this.measure = measure;
 this.emitter = new EventEmitter();
 this.buffer = "";
 stream.on("data", this.handleChunk.bind(this)).on("end", this.end.bind(this));
}
VaryingBufferStream.prototype.handleChunk = function handleChunk(chunk){
 var i = this.measure(chunk, this.buffer);
 if(0 >= i) return this.buffer += chunk;
 this.emitter.emit("data", this.buffer + chunk.slice(0, i));
 this.buffer = chunk.slice(i);
};
VaryingBufferStream.prototype.end = function end(){
 if(this.buffer)
  this.emitter.emit("data", this.buffer);
 this.emitter.emit("end");
};
VaryingBufferStream.prototype.on = function on(){
 this.emitter.on.apply(this.emitter, arguments);
 return this;
}

this.EventSponge = EventSponge;
this.SingleCharacterSingleSplitter = SingleCharacterSingleSplitter;
this.SingleCharacterDelimiterLexerEmitter = SingleCharacterDelimiterLexerEmitter;
this.applyFrom = applyFrom;
this.compose = compose;
this.bufferChunks = bufferChunks;
this.SlicingStream = SlicingStream;
this.FunctionImageStream = FunctionImageStream;
this.VaryingBufferStream = VaryingBufferStream;
