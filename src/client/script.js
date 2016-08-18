
function Connection(id) {
  this.id = id;  
}  

function Player(x, y) {
  this.x = x;
  this.y = y;
}

function World() {
  this.players = [];  
}

var world = new World();
world.players.push(new Player(-0.3, -0.1));
world.players.push(new Player(0.3, 0.1));

var speed = 0.01;

function Input() {
	this.keyStates = {};	
	this.x = 0;
	this.y = 0;
	this.tick = function() {
		x = 0;
		y = 0;
		if (this.keyStates[37]) x -= 1;
		if (this.keyStates[39]) x += 1;
		if (this.keyStates[38]) y += 1;
		if (this.keyStates[40]) y -= 1;
		//world.players[0].x += x*speed;
		//world.players[0].y += y*speed;		
		this.x = x;
		this.y = y;
	};
}

var input = new Input();

var onKeyDown = function(event) {
	input.keyStates[event.keyCode] = true;
};
	
var onKeyUp = function(event) {
	input.keyStates[event.keyCode] = false;
};

document.onkeydown = onKeyDown;
document.onkeyup = onKeyUp;
  
var main=function() {

  var CANVAS=document.getElementById("your_canvas");

  CANVAS.width=window.innerWidth;
  CANVAS.height=window.innerHeight;

  /*========================= GET WEBGL CONTEXT ========================= */
  var GL;
  try {
    GL = CANVAS.getContext("experimental-webgl", {antialias: true});
  } catch (e) {
    //alert("You are not webgl compatible") ;
    return false;
  }

  /*========================= SHADERS ========================= */
  /*jshint multistr: true */
  var shader_vertex_source="\n\
attribute vec2 position; //the position of the point\n\
attribute vec3 color;  //the color of the point\n\
\n\
varying vec3 vColor;\n\
void main(void) { //pre-built function\n\
gl_Position = vec4(position, 0., 1.); //0. is the z, and 1 is w\n\
vColor=color;\n\
}";


  var shader_fragment_source="\n\
precision mediump float;\n\
\n\
\n\
\n\
varying vec3 vColor;\n\
void main(void) {\n\
gl_FragColor = vec4(vColor, 1.);\n\
}";


  var get_shader=function(source, type, typeString) {
    var shader = GL.createShader(type);
    GL.shaderSource(shader, source);
    GL.compileShader(shader);
    if (!GL.getShaderParameter(shader, GL.COMPILE_STATUS)) {
      alert("ERROR IN "+typeString+ " SHADER : " + GL.getShaderInfoLog(shader));
      return false;
    }
    return shader;
  };

  var shader_vertex=get_shader(shader_vertex_source, GL.VERTEX_SHADER, "VERTEX");

  var shader_fragment=get_shader(shader_fragment_source, GL.FRAGMENT_SHADER, "FRAGMENT");

  var SHADER_PROGRAM=GL.createProgram();
  GL.attachShader(SHADER_PROGRAM, shader_vertex);
  GL.attachShader(SHADER_PROGRAM, shader_fragment);

  GL.linkProgram(SHADER_PROGRAM);

  var _color = GL.getAttribLocation(SHADER_PROGRAM, "color");
  var _position = GL.getAttribLocation(SHADER_PROGRAM, "position");

  GL.enableVertexAttribArray(_color);
  GL.enableVertexAttribArray(_position);

  GL.useProgram(SHADER_PROGRAM);


  



  /*========================= DRAWING ========================= */
  GL.clearColor(0.0, 0.0, 0.0, 0.0);
  
  var drawPlayer = function(player) {
    /*========================= THE TRIANGLE ========================= */
    //POINTS :
    var size = 0.1;
    var size_2 = size/2;
    var triangle_vertex=[
      player.x-size_2,player.y-size_2, //first summit -> bottom left of the viewport
      0,0,1,
      player.x+size_2,player.y-size_2, //bottom right of the viewport
      1,1,0,
      player.x+size_2,player.y+size_2,  //top right of the viewport
      1,0,0
    ];
  
    var TRIANGLE_VERTEX= GL.createBuffer ();
    GL.bindBuffer(GL.ARRAY_BUFFER, TRIANGLE_VERTEX);
    GL.bufferData(GL.ARRAY_BUFFER,
                  new Float32Array(triangle_vertex),
      GL.STATIC_DRAW);
  
    //FACES :
    var triangle_faces = [0,1,2];
    var TRIANGLE_FACES= GL.createBuffer ();
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, TRIANGLE_FACES);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER,
                  new Uint16Array(triangle_faces),
      GL.STATIC_DRAW);
      
    /*===============DRAWING==================*/
    GL.bindBuffer(GL.ARRAY_BUFFER, TRIANGLE_VERTEX);

    GL.vertexAttribPointer(_position, 2, GL.FLOAT, false,4*(2+3),0);
    GL.vertexAttribPointer(_color, 3, GL.FLOAT, false,4*(2+3),2*4);

    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, TRIANGLE_FACES);
    GL.drawElements(GL.TRIANGLES, 3, GL.UNSIGNED_SHORT, 0);
  }
  
  var drawWorld = function() {
    for (var i = 0; i < world.players.length; i++) {
      drawPlayer(world.players[i]);
    }
  }

  var animate=function() {

    GL.viewport(0.0, 0.0, CANVAS.width, CANVAS.height);
    GL.clear(GL.COLOR_BUFFER_BIT);
  
    drawWorld();
	input.tick();
    
    GL.flush();

    window.requestAnimationFrame(animate);
  };

  animate();
};
  
  var wsUri = "ws://85.236.188.183:9002";  

  function init()
  {
    testWebSocket();
  }

  function testWebSocket()
  {
    websocket = new WebSocket(wsUri);
    websocket.onopen = function(evt) { onOpen(evt) };
    websocket.onclose = function(evt) { onClose(evt) };
    websocket.onmessage = function(evt) { onMessage(evt) };
    websocket.onerror = function(evt) { onError(evt) };
  }

  function onOpen(evt)
  {
    writeToScreen("CONNECTED");
	doSend("handshake");    
  }

  function onClose(evt)
  {
    writeToScreen("DISCONNECTED");
  }
  
  function doSend(message)
  {
    writeToScreen("SENT: " + message);
    websocket.send(message);
  }

  function onMessage(evt)
  {
    writeToScreen('<span style="color: blue;">RESPONSE: ' + evt.data+'</span>');
	doSend(input.x.toString() + " " + input.y.toString());
	world.players = [];
	var data = evt.data.split(" ");	
	for (var i = 0; i < data.length; i += 2) {
		world.players.push(new Player(parseFloat(data[i]), parseFloat(data[i+1])));
	}
    //websocket.close();
  }

  function onError(evt)
  {
    writeToScreen('<span style="color: red;">ERROR:</span> ' + evt.data);
  }

  function writeToScreen(message)
  {
    console.log(message);
  }

  window.addEventListener("load", init, false);