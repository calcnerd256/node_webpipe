//http library documented at http://nodejs.org/api/http.html
var http = require("http");
var port = 15216; //typically 80
// respond is a function that takes an HTTP request and an HTTP response
// when a request comes in, the http library fires an event
// at the end of this file, I'm going to do something that binds this function to that event
function respond(request, response){
 var q = request;
 var s = response;
  if("GET" == q.method)
   return (
    function(x){
     x.writeHead(200, {"Content-type": "text/html"});
     return x;
    }
   )(s).end(
    [
     "<form method=\"POST\">",
     "<textarea name=\"str\">",
     "digraph{",
      "a->b;",
     "}",
     "</textarea>",
     "<input type=\"submit\"></input>",
     "</form>"
     ].join("\n")
   );
  s.writeHead(200, {"Content-type": "image/svg+xml"});
  (
   function(p){
    var dat = [];
    q.on("data", function(chunk){dat.push(chunk);});//buffering is bad
    q.on(
     "end",
     function(){
      var a = dat.join("").split(";").map(
       function(str){
	return str.split("=").map(decodeURIComponent);
       }
      );
      var d = a.reduce(function(p, c){p[c[0]] = c[1]; return p;}, {});
      var str = d.str;
      p.stdin.write(str+"");
      p.stdin.end();
     }
    );
    p.stdout.on("data", function(chunk){s.write(chunk);});
    p.stdout.on("end", function(){s.end();});
   }
  )(require("child_process").spawn("dot", ["-Tsvg"]));
}

//the createServer function of the http library is a helper
// it takes a function and returns an HTTP server
// that callback function gets bound to the request event
var server = http.createServer(respond);
//now that I have a server, it needs to start listening for incoming connections
server.listen(
 port,
 function(){
  //this function gets called when the server is ready to take requests
  //everything in NodeJS is asynchronous
  // so you have to pass continuations explicitly
  //uncomment the following line if you want to see when it starts
  //console.log("server listening on port " + port);
  // the console object prints to standard output by default
 }
);
//now that you have an HTTP server listening on a port, the program won't end
//if you need to end the program, you can press Ctrl+C at the command line