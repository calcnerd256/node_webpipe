//http library documented at http://nodejs.org/api/http.html
var http = require("http");
var child_process = require("child_process");
var streamHelpers = require("./streams");
 var pipeStream = streamHelpers.pipeStream;
 var FormStream = streamHelpers.FormStream;

var port = 8080; //typically 80
var verbose = false;

function init(){
 port = 15216;

 var server = http.createServer(respond);
 server.listen(port,  afterServerSetup);
 return server;
}

init();

function afterServerSetup(){
 var noisy = verbose;
 //uncomment the following line if you want to see when it starts
 //noisy = true;

 var output = "server listening on port " + port;
 if(noisy)
  console.log(output);
}

function respond(request, response){
 if("GET" == request.method)
  return handleGet(request, response);
 return handlePost(request, response);
}
function handleGet(request, response){

 var statusCode = 200;
 var contentType = "text/html";
 var headers = {"Content-type": contentType};

 var lines = [
  "<html>",
  " <head>",
  "  <title>Online GraphViz tool</title>",
  " </head>",
  " <body>",
  "  <form method=\"POST\">",
  "   <textarea name=\"str\">",
      "digraph{",
      " a->b;",
      "}",
     "</textarea>",
  "   <input type=\"submit\"></input>",
  "  </form>",
  " </body>",
  "</html>"
 ];
 var body = lines.join("\n")

 response.writeHead(statusCode, headers);
 response.write(body);
 response.end();
}

function handlePost(request, response){
 response.writeHead(200, {"Content-type": "image/svg+xml"});
 var command = "dot";//this is what you would run at the command line
 var graphvizFlags = ["-Tsvg"];//see the graphviz manpage for details
 var kid = child_process.spawn(command, graphvizFlags);

 var form = new FormStream();
 function forwardToChildProcess(stream){
  stream.on(
   "data",
   function(chunk){kid.stdin.write(chunk);}
  );
  stream.on(
   "end",
   function(){kid.stdin.end();}
  );
  stream.resume();
 }
 form.on("_str", forwardToChildProcess);
 form.on("end", function(){kid.stdin.end();})//in case the POST request has no "str" parameter

 kid.stdout.on(
  "data",
  function(chunk){
   response.write(chunk);
  }
 ).on("end", function(){response.end();});

 pipeStream(request, form);
}
