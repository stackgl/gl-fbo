"use strict";

var webglew = require("webglew")
  , createTexture = require("gl-texture2d")

function initTexture(gl, width, height, type, format, attachment) {
  if(!type) {
    return null
  }
  var result = createTexture(gl, width, height, format, type)
  result.magFilter = gl.NEAREST
  result.minFilter = gl.NEAREST
  result.mipSamples = 0
  gl.framebufferTexture2D(gl.FRAMEBUFFER, attachment, gl.TEXTURE_2D, result.handle, 0)
  gl.bindTexture(gl.TEXTURE_2D, null)
  return result
}

function initRenderBuffer(gl, width, height, component, attachment) {
  var result = gl.createRenderbuffer()
  gl.bindRenderbuffer(gl.RENDERBUFFER, result)
  gl.renderbufferStorage(gl.RENDERBUFFER, component, width, height)
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, attachment, gl.RENDERBUFFER, result)
  return result
}

function Framebuffer(gl, width, height, color_type, use_color, use_depth, use_stencil) {
  var extensions = webglew(gl)

  this.gl = gl
  this.width = width|0
  this.height = height|0
  this._destroyed = false
  this.handle = gl.createFramebuffer()
  gl.bindFramebuffer(gl.FRAMEBUFFER, this.handle)
  
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
                          gl.DEPTH_COMPONENT,
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

Object.defineProperty(Framebuffer.prototype, "valid", {
  get: function() {
    return !this._destroyed
  }
});

Object.defineProperty(Framebuffer.prototype, "shape", {
  get: function() {
    return [this.height, this.width]
  }
})

Framebuffer.prototype.bind = function() {
  if(!this.valid) {
    return
  }
  var gl = this.gl
  gl.bindFramebuffer(gl.FRAMEBUFFER, this.handle)
  gl.viewport(0, 0, this.width, this.height)
}

Framebuffer.prototype.dispose = function() {
  if(!this.valid) {
    return
  }
  this._destroyed = true
  var gl = this.gl
  gl.deleteFramebuffer(this.handle)
  if(this.depth) {
    this.depth.dispose()
  }
  if(this._depth_rb) {
    gl.deleteRenderbuffer(this._depth_rb)
  }
  if(this.color) {
    this.color.dispose()
  }
}

function createFBO(gl, width, height, options) {
  var extensions = webglew(gl)
    , color_type, use_color, use_depth, use_stencil
  options = options || {}
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
  return new Framebuffer(gl, width, height, color_type, use_color, use_depth, use_stencil)
}
module.exports = createFBO
