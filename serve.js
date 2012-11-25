/*

 structure
  requires
   http
   child_process
  configuration state
   port
   verbose
  initialization
  function definitions
   afterServerSetup()
   respond(request, response)
   handleGet(request, response)
   handlePost(request, response)
*/

//http library documented at http://nodejs.org/api/http.html
var http = require("http");
var child_process = require("child_process");

var port = 8080; //typically 80
var verbose = false;

function init(){
 port = 15216;

 //the createServer function of the http library is a helper
 // it takes a function and returns an HTTP server
 // that callback function gets bound to the request event
 var server = http.createServer(respond);
 //now that I have a server, it needs to start listening for incoming connections
 server.listen(port,  afterServerSetup);
 return server;
}

init();// this line kick-starts everything; the rest of the file is definitions
//now that you have an HTTP server listening on a port, the program won't end
//if you need to end the program, you can press Ctrl+C at the command line

//after your server is ready, but before it receives any requests, it runs this function
//you can call this function whatever you want, as long as you pass it to server.listen as the second parameter
//of course, you can also call server whatever you want, as long as it's the result of a call to http.createServer
//and you can call http whatever you want, as long as it's the result of require("http")
function afterServerSetup(){
 //this function gets called when the server is ready to take requests
 //everything in NodeJS is asynchronous
 // so you have to pass continuations explicitly

 //the variable "verbose" comes from the top of this file
 var noisy = verbose;
 //uncomment the following line if you want to see when it starts
 //noisy = true;

 //this line demonstrates string concatenation coercing and lexical scoping
 var output = "server listening on port " + port;
 //port is a number, but it coerces to a string when I try to append it to a string
 //port is a variable defined in the file's scope, but I can still use it in this function
 // I can still use the port variable even when I pass this function to another function that calls afterServerSetup

 if(noisy)
  console.log(output);
 // the console object prints to standard output by default
 }


//respond is a function that takes an HTTP request and an HTTP response
//when a request comes in, the http library fires an event
//the createServer function binds whatever you pass to it to that event

function respond(request, response){
 //HTTP has the notion of "methods"
 //most requests are GET requests
 // a GET request basically just asks for a page
 //some requests are POST requests
 // any time you're submitting information that's supposed to change something, that's a POST
 //technically, the server in this example should not be using POST
 // (cf. http://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html#sec9.5)
 // but in practical reality, there are limits to the lengths of GET parameters
 // and I wanted users to be able to post big .dot files and get big SVGs back out
 // so I had to compromise on theoretical purity :(

 //one-line if()s are a stylistic no-no
 // but I like them a lot, so I'm using them
 // I use them wherever I can, often to the detriment of readability
 if("GET" == request.method)
  return handleGet(request, response);
 return handlePost(request, response);
}


function handleGet(request, response){
 //before, this behavior was implemented as a one-liner
 //but that makes it hard to read, so I've rewritten it as a function

 //HTTP status code 200 means "OK"
 var statusCode = 200;
 //the default MIMEtype is text/plain
 //I want to serve up an HTML form
 var contentType = "text/html";
 //this is an object literal
 //this syntax is now known as JSON
 // (JavaScript Object Notation)
 var headers = {"Content-type": contentType};

 //this is an array literal
 //rather than read the response body in from a file, I've decided to put it right in the server's source
 //but I didn't want to have to put it all on one line
 // so I made it an array of the lines I wanted
 // and later, I'll join those lines with a linefeed character (ASCII ten)
 var lines = [
  "<html>",
  " <head>",
  "  <title>Online GraphViz tool</title>",
  " </head>",
  " <body>",
  "  <form method=\"POST\">",
  "   <textarea name=\"str\">",
  "digraph{",
   "a->b;",
  "}",
  "   </textarea>",
  "   <input type=\"submit\"></input>",
  "  </form>",
  " </body>",
  "</html>"
 ];
 //the Array() class has a method someArray.join(glue) that creates a string
 //it puts the glue string between the result of calling each element's someElement.toString() method
 var body = lines.join("\n")

 //now that we have all our data, let's send it to the client

 //the author of the writeHead method was nice enough to handle optional arguments
 //I omitted the second argument, but it works anyway, because they shuffle them around based on their types
 response.writeHead(statusCode, headers);

 response.write(body);
 response.end();
}


function handlePost(request, response){
 response.writeHead(200, {"Content-type": "image/svg+xml"});
 var command = "dot";//this is what you would run at the command line
 var graphvizFlags = ["-Tsvg"];//see the graphviz manpage for details
 var kid = child_process.spawn(command, graphvizFlags);

 //the request is a readable stream, so it emits "data" events and a "done" event

 function afterRequest(postBody){
  // this function assumes the content type of the POST body is application/x-www-form-urlencoded
  // http://www.w3.org/TR/html401/interact/forms.html#adef-enctype
  // http://www.w3.org/TR/html401/interact/forms.html#form-content-type
  var postParameters = postBody.split(";");
  function decodePostParameter(str){
   return str.split("=").map(decodeURIComponent);
  }
  var alist = postParameters.map(decodePostParameter);
  var dictionary = alist.reduce(
   function fluentPatch(previous, current){
    var key = current[0];
    var value = current[1];
    previous[key] = value;
    return previous;
   },
   {}// an empty object literal
  );
  var str = dictionary.str+"";

  //send the whole thing along to the child process
  kid.stdin.write(str);
  kid.stdin.end();
 }
 //afterRequest processes the contents of the buffer collected from the "data" events

 //we either need to stream the request or buffer it
 //buffering is easier to write, but it has its drawbacks
 bufferChunks(request, afterRequest);

 //redirect the standard output of the child process to the HTTP response body
 kid.stdout.on(
  "data",
  function(chunk){
   response.write(chunk);
  }
 );
 kid.stdout.on("end", function(){response.end();});
}

function compose(f, g){
 //like mathematical function composition
 // compose(f, g)(x) = f(g(x))
 return function(){
  var intermediate = g.apply(this, arguments);
  return f(intermediate);
 }
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
}