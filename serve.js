require("http").createServer(
 function(q, s){
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
).listen(15216);