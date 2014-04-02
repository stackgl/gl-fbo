"use strict";

var webglew = require("webglew")
  , createTexture = require("gl-texture2d")

var colorAttachmentArrays = null

function lazyInitColorAttachments(gl, ext) {
  var maxColorAttachments = gl.getParameter(ext.MAX_COLOR_ATTACHMENTS_WEBGL);
  colorAttachmentArrays = new Array(maxColorAttachments + 1)
  for(var i=0; i<=maxColorAttachments; ++i) {
    var x = new Array(maxColorAttachments)
    for(var j=0; j<i; ++j) {
      x[j] = gl.COLOR_ATTACHMENT0 + j
    }
    for(var j=i; j<maxColorAttachments; ++j) {
      x[j] = gl.NONE
    }
    colorAttachmentArrays[i] = x
  }
}

function initTexture(gl, width, height, type, format, attachment) {
  if(!type) {
    return null
  }
  var result = createTexture(gl, width, height, format, type)
  result.magFilter = gl.NEAREST
  result.minFilter = gl.NEAREST
  result.mipSamples = 1
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

function Framebuffer(gl, width, height, colorType, numColor, useDepth, useStencil, ext) {
  var extensions = webglew(gl)

  //Create storage
  this.gl = gl
  this.width = width|0
  this.height = height|0
  this._destroyed = false
  this.handle = gl.createFramebuffer()
  this._ext = ext
  gl.bindFramebuffer(gl.FRAMEBUFFER, this.handle)
  
  //Allocate color buffers
  this.color = new Array(numColor)
  this._color_rb = null
  for(var i=0; i<numColor; ++i) {
    this.color[i] = initTexture(gl, width, height, colorType, gl.RGBA, gl.COLOR_ATTACHMENT0 + i)
  }
  if(numColor === 0) {
    this._color_rb = initRenderBuffer(gl, width, height, gl.RGBA4, gl.COLOR_ATTACHMENT0)
  }

  //Allocate depth/stencil buffers
  this.depth = null
  this._depth_rb = null
  if(extensions.WEBGL_depth_texture) {
    if(useStencil) {
      this.depth = initTexture(gl, width, height,
                          extensions.WEBGL_depth_texture.UNSIGNED_INT_24_8_WEBGL,
                          gl.DEPTH_STENCIL,
                          gl.DEPTH_STENCIL_ATTACHMENT)
    } else if(useDepth) {
      this.depth = initTexture(gl, width, height,
                          gl.UNSIGNED_SHORT,
                          gl.DEPTH_COMPONENT,
                          gl.DEPTH_ATTACHMENT)
    }
  } else {
    if(useDepth && useStencil) {
      this._depth_rb = initRenderBuffer(gl, width, height, gl.DEPTH_STENCIL, gl.DEPTH_STENCIL_ATTACHMENT)
    } else if(useDepth) {
      this._depth_rb = initRenderBuffer(gl, width, height, gl.DEPTH_COMPONENT16, gl.DEPTH_ATTACHMENT)
    } else if(useStencil) {
      this._depth_rb = initRenderBuffer(gl, width, height, gl.STENCIL_INDEX, gl.STENCIL_ATTACHMENT)
    }
  }
  if(numColor === 0) {
    if(ext) {
      ext.drawBuffersWEBGL(colorAttachmentArrays[0])
    }
  } else if(numColor > 1) {
    ext.drawBuffersWEBGL(colorAttachmentArrays[numColor])
  }

  //Check frame buffer state
  var valid = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  switch(valid){
      case gl.FRAMEBUFFER_UNSUPPORTED:
          throw "gl-fbo: Framebuffer unsupported";
      case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
          throw "gl-fbo: Framebuffer incomplete attachment";
      case gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
          throw "gl-fbo: Framebuffer incomplete dimensions";
      case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
          throw "gl-fbo: Framebuffer incomplete missing attachment";
  }
  this.gl.bindFramebuffer(gl.FRAMEBUFFER, null)
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
  this.handle = null
  if(this.depth) {
    this.depth.dispose()
    this.depth = null
  }
  if(this._depth_rb) {
    gl.deleteRenderbuffer(this._depth_rb)
    this._depth_rb = null
  }
  for(var i=0; i<this.color.length; ++i) {
    this.color[i].dispose()
    this.color[i] = null
  }
  if(this._color_rb) {
    gl.deleteRenderbuffer(this._color_rb)
    this._color_rb = null
  }
}

function createFBO(gl, width, height, options) {
  var extensions = webglew(gl)
    , colorType
    , numColors
    , useDepth
    , useStencil
  //Lazily initialize color attachment arrays
  if(!colorAttachmentArrays && extensions.WEBGL_draw_buffers) {
    lazyInitColorAttachments(gl, extensions.WEBGL_draw_buffers)
  }
  options = options || {}
  numColors = 1
  if("color" in options) {
    numColors = Math.max(options.color|0, 0)
    if(numColors > 1) {
      //Check if multiple render targets supported
      var mrtext = extensions.WEBGL_draw_buffers
      if(!mrtext) {
        numColors = 1
      } else {
        numColors = Math.min(numColors, gl.getParameter(mrtext.MAX_COLOR_ATTACHMENTS_WEBGL))|0
      }
    }
  }
  colorType = gl.UNSIGNED_BYTE;
  if(options.float && numColors > 0 && extensions.OES_texture_float) {
    colorType = gl.FLOAT
  }
  useDepth = true
  if("depth" in options) {
    useDepth = !!options.depth
  }
  useStencil = false
  if("stencil" in options) {
    useStencil = !!options.stencil
  }
  return new Framebuffer(
    gl, 
    width, 
    height, 
    colorType, 
    numColors, 
    useDepth, 
    useStencil, 
    extensions.WEBGL_draw_buffers)
}
module.exports = createFBO
