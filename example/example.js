var shell = require("gl-now")()
var createShader = require("gl-shader")
var createFBO = require("../fbo.js")
var ndarray = require("ndarray")
var fill = require("ndarray-fill")

var prevState, curState, updateShader, drawShader

shell.on("gl-init", function() {
  var gl = shell.gl
  
  //Turn off depth test
  gl.disable(gl.DEPTH_TEST)

  //Allocate buffers
  prevState = createFBO(gl, 512, 512)
  curState = createFBO(gl, 512, 512)
  
  //Initialize colors for prev_state
  var initial_conditions = ndarray(new Uint8Array(512*512*4), [512, 512, 4])
  fill(initial_conditions, function(x,y,c) {
    if(c === 3) {
      return 255
    }
    return Math.random() > 0.9 ? 255 : 0
  })
  prevState.color.setPixels(initial_conditions)

  //Create shaders
  var vert_src = "\
    attribute vec2 position;\
    varying vec2 uv;\
    void main() {\
      gl_Position = vec4(position,0.0,1.0);\
      uv = 0.5 * (position+1.0);\
    }"
  
  drawShader = createShader(gl, vert_src, "\
    precision mediump float;\
    uniform sampler2D buffer;\
    varying vec2 uv;\
    void main() {\
      gl_FragColor = texture2D(buffer, uv);\
    }")

  updateShader = createShader(gl, vert_src, "\
    precision mediump float;\
    uniform sampler2D buffer;\
    uniform vec2 dims;\
    varying vec2 uv;\
    void main() {\
      float n = 0.0;\
      for(int dx=-1; dx<=1; ++dx)\
      for(int dy=-1; dy<=1; ++dy) {\
        n += texture2D(buffer, uv+vec2(dx,dy)/dims).r;\
      }\
      float s = texture2D(buffer, uv).r;\
      if(n > 3.0+s || n < 3.0) {\
        gl_FragColor = vec4(0,0,0,1);\
      } else {\
        gl_FragColor = vec4(1,1,1,1);\
      }\
    }")
  
  //Create full screen triangle
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,
    -1,  4,
     4, -1
  ]), gl.STATIC_DRAW)
  
  //Set up vertex pointers
  drawShader.attributes.position.location = updateShader.attributes.position.location
  updateShader.attributes.position.pointer()
  updateShader.attributes.position.enable()
})

shell.on("tick", function() {
  var gl = shell.gl
  
  //Switch to state fbo
  curState.bind()
  
  //Run update shader
  updateShader.bind()
  updateShader.uniforms.buffer = prevState.color.bind()
  updateShader.uniforms.dims = [512, 512]
  gl.drawArrays(gl.TRIANGLES, 0, 3)

  //Swap buffers
  var tmp = curState
  curState = prevState
  prevState = tmp
})

shell.on("gl-render", function(t) {
  var gl = shell.gl
  
  //Render contents of buffer to screen
  drawShader.bind()
  drawShader.uniforms.buffer = curState.color.bind()
  gl.drawArrays(gl.TRIANGLES, 0, 3)
})
