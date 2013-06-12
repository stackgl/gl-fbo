var shell = require("gl-now")()
var createShader = require("gl-shader")
var FBO = require("../fbo.js")

var prevState, curState, updateShader, drawShader

shell.on("gl-init", function() {
  var gl = shell.gl

  //Allocate buffers
  prevState = FBO(gl, 512, 512)
  curState = FBO(gl, 512, 512)

  //Create shaders
  var vert_src = "\
    attribute vec2 position;\
    varying vec2 uv;\
    void main() {\
      gl_Position = position;\
      uv = position;\
    }"
  
  drawShader = createShader(gl, "\
    uniform sampler2D buffer;\
    varying vec2 uv;\
    void main() {\
      gl_FragColor = texture2D(buffer, uv);\
    }\
  ", vert_src)

  updateShader = createShader(gl, "\
    uniform sampler2D buffer;\
    uniform vec2 dims;\
    varying vec2 uv;\
    void main() {\
      gl_FragColor = dims + texture2D(buffer, uv);\
    }\
  ", vert_src)
  
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,
     0,  2,
     2,  0
  ]), gl.STATIC_DRAW)
})

shell.on("tick", function() {
  var gl = shell.gl
  
  curBuffer.bind()
  
  updateShader.bind()
  updateShader.attributes.position.pointer()
  updateShader.attributes.position.enable()
  
  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, prevState.color)
  updateShader.uniforms.buffer = 0
  
  updateShader.uniforms.dims = [512, 512]
  
  gl.drawArrays(gl.TRIANGLES, 0, 3)

  //Swap buffers
  var tmp = curState
  curState = prevState
  prevState = tmp
})

shell.on("gl-render", function(t) {
  var gl = shell.gl
  
  drawShader.bind()
  drawShader.attributes.position.pointer()
  drawShader.attributes.position.enable()
  
  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, curState.color)
  drawShader.uniforms.buffer = 0
  
  gl.drawArrays(gl.TRIANGLES, 0, 3)
})
