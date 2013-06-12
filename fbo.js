"use strict";

var webglew = require("webglew")
  , ndarray = require("ndarray")

function initTexture(gl, width, height, type, component, attachment) {
  if(!type) {
    return null
  }
  var result = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, result)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texImage2D(gl.TEXTURE_2D, 0, component, width, height, 0, component, type, null)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, attachment, gl.TEXTURE_2D, result, 0)
  return result
}

function initRenderBuffer(gl, width, height, component, attachment) {
  var result = gl.createRenderbuffer()
  gl.bindRenderbuffer(gl.RENDERBUFFER, result)
  gl.renderbufferStorage(gl.RENDERBUFFER, component, width, height)
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, attachment, gl.RENDERBUFFER, result)
  return result
}

function FrameBuffer(gl, width, height, color_type, use_color, use_depth, use_stencil) {
  var extensions = webglew(gl)

  this.context = gl
  this._destroyed = false
  this.fbo = gl.createFramebuffer()
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
  
  //Allocate color buffers
  this.color = this.use_color ? null : initTexture(gl, width, height, color_type, gl.RGBA, gl.COLOR_ATTACHMENT0)
  
  //Allocate depth/stencil buffers
  this.depth = null
  this._depth_rb = null
  if(extensions.WEBGL_depth_texture) {
    if(use_stencil) {
      this.depth = initTexture(gl, width, height,
                          extensions.WEBGL_depth_texture.UNSIGNED_INT_24_8_WEBGL,
                          gl.DEPTH_STENCIL,
                          gl.DEPTH_STENCIL_ATTACHMENT)
    } else if(use_depth) {
      this.depth = initTexture(gl, width, height,
                          gl.UNSIGNED_SHORT,
                          gl.DEPTH_COMPONENT16,
                          gl.DEPTH_ATTACHMENT)
    }
  } else {
    if(use_depth && use_stencil) {
      this._depth_rb = initRenderBuffer(gl, width, height, gl.DEPTH_STENCIL, gl.DEPTH_STENCIL_ATTACHMENT)
    } else if(use_depth) {
      this._depth_rb = initRenderBuffer(gl, width, height, gl.DEPTH_COMPONENT16, gl.DEPTH_ATTACHMENT)
    } else if(use_stencil) {
      this._depth_rb = initRenderBuffer(gl, width, height, gl.STENCIL_INDEX, gl.STENCIL_ATTACHMENT)
    }
  }
}

Object.defineProperty(FrameBuffer.prototype, "valid", {
  get: function() {
    return !this._destroyed
  }
});

FrameBuffer.prototype.bind = function() {
  if(!this.valid) {
    return
  }
  var gl = this.context
  gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo)
  gl.viewport(0, 0, this.width, this.height)
}

FrameBuffer.prototype.dispose = function() {
  if(!this.valid) {
    return
  }
  this._destroyed = true
  var gl = this.context
  gl.deleteFramebuffer(this.fbo)
  if(this.depth) {
    gl.deleteTexture(this.depth)
  }
  if(this._depth_rb) {
    gl.deleteRenderbuffer(this._depth_rb)
  }
  if(this.color) {
    gl.deleteTexture(this.color)
  }
}

FrameBuffer.prototype.readPixels = function(result) {
  //TODO: implement this
}

function createFBO(gl, width, height, options) {
  var extensions = webglew(gl)
    , color_type, use_color, use_depth, use_stencil
  if(options.color === false) {
    use_color = false
  } else {
    color_type = gl.UNSIGNED_BYTE;
    if(options.float) {
      if(extensions.OES_texture_float) {
        color_type = gl.FLOAT
      } else if(extensions.OES_texture_half_float) {
        color_type = extensions.OES_texture_half_float
      } else {
        color_type = gl.UNSIGNED_BYTE
      }
    }
  }
  use_depth = true
  if(options.depth === false) {
    use_depth = false
  }
  use_stencil = false
  if(options.stencil) {
    use_stencil = true
  }
  return new FrameBuffer(gl, width, height, color_type, use_color, use_depth, use_stencil)
}

//Wrapper for drawing buffer
function DrawingBuffer(gl) {
  this.context = gl
}
DrawingBuffer.prototype.fbo = null
DrawingBuffer.prototype.depth = null
DrawingBuffer.prototype.color = null
Object.defineProperty(DrawingBuffer.prototype, "valid", {
  "get": function() { return true }
});
Object.defineProperty(DrawingBuffer.prototype, "width", {
  "get": function() { return this.context.drawingBufferWidth }
});
Object.defineProperty(DrawingBuffer.prototype, "height", {
  "get": function() { return this.context.drawingBufferHeight }
});
DrawingBuffer.prototype.dispose = function() {}
DrawingBuffer.prototype.bind = function() {
  this.context.bind(this.context.FRAMEBUFFER, null)
  this.context.viewport(0, 0, this.width, this.height)
}
DrawingBuffer.prototype.readPixels = function(result) {
}


module.exports = createFBO
module.exports.drawingBuffer = function(gl) { return new DrawingBuffer(gl) }
