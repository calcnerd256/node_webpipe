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
 //data from the request doesn't come in all at once
 //we either need to stream it or buffer it
 //buffering is easier to write, but it has its drawbacks
 var data = [];
 request.on(
  "data",
  function bufferPostBody(chunk){
   //buffering is bad
   //but it's easier to write
   data.push(chunk);
  }
 );
 function afterRequest(){
  var postBody = data.join("");
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
 request.on("end", afterRequest);
 //redirect the standard output of the child process to the HTTP response body
 kid.stdout.on(
  "data",
  function(chunk){
   response.write(chunk);
  }
 );
 kid.stdout.on("end", function(){response.end();});
}
