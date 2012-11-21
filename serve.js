//http library documented at http://nodejs.org/api/http.html
var http = require("http");
var port = 15216; //typically 80
// respond is a function that takes an HTTP request and an HTTP response
// when a request comes in, the http library fires an event
// at the end of this file, I'm going to do something that binds this function to that event
function fluentCall(object, key, parameters){
 //sometimes, we want to call a method on an object and then call another one
 // as in, someObject.someMethod(x, y, z); someObject.anothermethod(w);
 //sometimes, the object we want to use is the result of some expression
 //we can say var ob = someExpression; ob.someMethod(x,y,z); ob.anothermethod(w);
 //but it's nice to be able to say (someExpression).someMethod(x,y,z).anothermethod(w)
 // this is called "fluent" style (I don't know who coined that term)
 //some methods work like that, returning the object that called them
 //however, there's nothing that guarantees that any given method works like that
 //so here's a function that lets you act like a method does that, whether it does or not

 //methods in JS are just properties
 //I can have an object x that has a property like x.color
 //but if I have a method x.toString() , that's really just a function-valued property
 //we can even patch methods into existing objects by storing functions in their properties
 //properties can be accessed with a . or with []
 //if you write x.y , it means the same thing as x["y"]
 //[] lookup takes a string
 //it's like reifying the name of the property
 var method = object[key];
 //so if key == "someMethod"
 // then object["someMethod"] is the same thing as object.someMethod
 //you can even use property names that would cause syntax errors if you tried to use . lookup on them!
 // any string works

 //every function has an apply method
 //there's a special variable in JS called this
 //when you call someObject.someMethod(someArg, anotherArg, etc)
 // any reference to the "this" variable in that method body equals someObject
 //sometimes you want to act like you called a method with a different this
 //apply takes the this as its first parameter
 //its second parameter is a list of the arguments you want to pass to the method
 //JS doesn't care how many arguments you pass to functions
 method.apply(object, parameters);

 //now, to make the helper act like a fluent call
 return object;
}
function respond(request, response){
 var q = request;
 var s = response;
 //HTTP has the notion of "methods"
 //most requests are GET requests
 // a GET request basically just asks for a page
 //some requests are POST requests
 // any time you're submitting information that's supposed to change something, that's a POST
 //technically, the server in this example should not be using POST
 // but in practical reality, there are limits to the lengths of GET parameters
 // and I wanted users to be able to post big .dot files and get big SVGs back out
 // so I had to compromise on theoretical purity :(
 if("GET" == request.method)
  return handleGet(request, response);
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

function handleGet(request, response){
 //before, this behavior was implemented as a one-liner
 //but that makes it hard to read, so I'm rewriting it
 //which means my only use of fluentCall is no longer necessary

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