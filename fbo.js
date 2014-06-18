"use strict";

var webglew = require("webglew")
var createTexture = require("gl-texture2d")

module.exports = createFBO

var colorAttachmentArrays = null
var FRAMEBUFFER_UNSUPPORTED
var FRAMEBUFFER_INCOMPLETE_ATTACHMENT
var FRAMEBUFFER_INCOMPLETE_DIMENSIONS
var FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT

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

//Throw an appropriate error
function throwFBOError(status) {
  switch(status){
    case FRAMEBUFFER_UNSUPPORTED:
      throw new Error("gl-fbo: Framebuffer unsupported")
    case FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
      throw new Error("gl-fbo: Framebuffer incomplete attachment")
    case FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
      throw new Error("gl-fbo: Framebuffer incomplete dimensions")
    case FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
      throw new Error("gl-fbo: Framebuffer incomplete missing attachment")
    default:
      throw new Error("gl-fbo: Framebuffer failed for unspecified reason")
  }
}

//Initialize a texture object
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

//Initialize a render buffer object
function initRenderBuffer(gl, width, height, component, attachment) {
  var result = gl.createRenderbuffer()
  gl.bindRenderbuffer(gl.RENDERBUFFER, result)
  gl.renderbufferStorage(gl.RENDERBUFFER, component, width, height)
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, attachment, gl.RENDERBUFFER, result)
  return result
}

//Rebuild the frame buffer
function rebuildFBO(fbo) {
  var gl = fbo.gl
  var handle = fbo.handle = gl.createFramebuffer()
  var height = fbo._shape[0]
  var width = fbo._shape[1]
  var numColors = fbo.color.length
  var ext = fbo._ext
  var useStencil = fbo._useStencil
  var useDepth = fbo._useDepth
  var colorType = fbo._colorType
  var extensions = webglew(gl)

  //Bind the fbo
  gl.bindFramebuffer(gl.FRAMEBUFFER, handle)
  
  //Allocate color buffers
  for(var i=0; i<numColors; ++i) {
    fbo.color[i] = initTexture(gl, width, height, colorType, gl.RGBA, gl.COLOR_ATTACHMENT0 + i)
  }
  if(numColors === 0) {
    fbo._color_rb = initRenderBuffer(gl, width, height, gl.RGBA4, gl.COLOR_ATTACHMENT0)
    if(ext) {
      ext.drawBuffersWEBGL(colorAttachmentArrays[0])
    }
  } else if(numColors > 1) {
    ext.drawBuffersWEBGL(colorAttachmentArrays[numColor])
  }

  //Allocate depth/stencil buffers
  if(extensions.WEBGL_depth_texture) {
    if(useStencil) {
      fbo.depth = initTexture(gl, width, height,
                          extensions.WEBGL_depth_texture.UNSIGNED_INT_24_8_WEBGL,
                          gl.DEPTH_STENCIL,
                          gl.DEPTH_STENCIL_ATTACHMENT)
    } else if(useDepth) {
      fbo.depth = initTexture(gl, width, height,
                          gl.UNSIGNED_SHORT,
                          gl.DEPTH_COMPONENT,
                          gl.DEPTH_ATTACHMENT)
    }
  } else {
    if(useDepth && useStencil) {
      fbo._depth_rb = initRenderBuffer(gl, width, height, gl.DEPTH_STENCIL, gl.DEPTH_STENCIL_ATTACHMENT)
    } else if(useDepth) {
      fbo._depth_rb = initRenderBuffer(gl, width, height, gl.DEPTH_COMPONENT16, gl.DEPTH_ATTACHMENT)
    } else if(useStencil) {
      fbo._depth_rb = initRenderBuffer(gl, width, height, gl.STENCIL_INDEX, gl.STENCIL_ATTACHMENT)
    }
  }

  //Check frame buffer state
  var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
  if(status !== gl.FRAMEBUFFER_COMPLETE) {

    //Release all partially allocated resources
    fbo._destroyed = true

    //Release all resources
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.deleteFramebuffer(fbo.handle)
    fbo.handle = null
    if(fbo.depth) {
      fbo.depth.dispose()
      fbo.depth = null
    }
    if(fbo._depth_rb) {
      gl.deleteRenderbuffer(fbo._depth_rb)
      fbo._depth_rb = null
    }
    for(var i=0; i<fbo.color.length; ++i) {
      fbo.color[i].dispose()
      fbo.color[i] = null
    }
    if(fbo._color_rb) {
      gl.deleteRenderbuffer(fbo._color_rb)
      fbo._color_rb = null
    }

    //Throw the frame buffer error
    throwFBOError(status)
  }

  //Everything ok, let's get on with life
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
}

function Framebuffer(gl, width, height, colorType, numColors, useDepth, useStencil, ext) {
  var extensions = webglew(gl)

  //Handle and set properties
  this.gl = gl
  this._shape = [height|0, width|0]
  this._destroyed = false
  this._ext = ext

  //Allocate buffers
  this.color = new Array(numColors)
  this._color_rb = null
  this.depth = null
  this._depth_rb = null

  //Save depth and stencil flags
  this._colorType = colorType
  this._useDepth = useDepth
  this._useStencil = useStencil
  
  //Initialize all attachments
  rebuildFBO(this)
}

var proto = Framebuffer.prototype

Object.defineProperty(proto, "valid", {
  get: function() {
    return !this._destroyed
  }
});

Object.defineProperty(proto, "shape", {
  get: function() {
    if(this._destroyed) {
      return [0,0]
    }
    return this._shape
  },
  set: function(x) {
    //If fbo is invalid, just skip this
    if(this._destroyed) {
      throw new Error("gl-fbo: Can't resize destroyed FBO")
    }

    if (this._shape[0] === x[0]|0 &&
        this._shape[1] === x[1]|0) return

    var gl = this.gl
    
    //Check parameter ranges
    var maxFBOSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)
    if(!Array.isArray(x) || x.length !== 2 || 
        x[0] < 0 || x[0] > maxFBOSize || 
        x[1] < 0 || x[1] > maxFBOSize) {
      throw new Error("gl-fbo: Can't resize FBO, invalid dimensions")
    }

    //Update shape
    this._shape[0] = x[0]|0
    this._shape[1] = x[1]|0

    //Resize framebuffer attachments
    for(var i=0; i<this.color.length; ++i) {
      this.color[i].shape = this._shape
    }
    if(this._color_rb) {
      gl.bindRenderbuffer(gl.RENDERBUFFER, this._color_rb)
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA4, this._shape[1], this._shape[0])
    }
    if(this.depth) {
      this.depth.shape = this._shape
    }
    if(this._depth_rb) {
      gl.bindRenderbuffer(gl.RENDERBUFFER, this._depth_rb)
      if(this._useDepth && this._useStencil) {
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_STENCIL, this._shape[1], this._shape[0])
      } else if(this._useDepth) {
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this._shape[1], this._shape[0])
      } else if(this._useStencil) {
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.STENCIL_INDEX, this._shape[1], this._shape[0])
      }
    }

    //Check FBO status after resize, if something broke then die in a fire
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.handle)
    var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
    if(status !== gl.FRAMEBUFFER_COMPLETE) {
      this.dispose()
      throwFBOError(status)
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)

    //Success!
    return x
  }
})

proto.bind = function() {
  if(this._destroyed) {
    return
  }
  var gl = this.gl
  gl.bindFramebuffer(gl.FRAMEBUFFER, this.handle)
  gl.viewport(0, 0, this._shape[1], this._shape[0])
}

proto.dispose = function() {
  if(this._destroyed) {
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

  //Update frame buffer error code values
  if(!FRAMEBUFFER_UNSUPPORTED) {
    FRAMEBUFFER_UNSUPPORTED = gl.FRAMEBUFFER_UNSUPPORTED
    FRAMEBUFFER_INCOMPLETE_ATTACHMENT = gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT
    FRAMEBUFFER_INCOMPLETE_DIMENSIONS = gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS
    FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT = gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT
  }

  var extensions = webglew(gl)
  
  //Lazily initialize color attachment arrays
  if(!colorAttachmentArrays && extensions.WEBGL_draw_buffers) {
    lazyInitColorAttachments(gl, extensions.WEBGL_draw_buffers)
  }

  //Special case: Can accept an array as argument
  if(Array.isArray(width)) {
    options = height
    height = width[0]|0
    width = width[1]|0
  }
  
  if(typeof width !== "number") {
    throw new Error("gl-fbo: Missing shape parameter")
  }

  //Validate width/height properties
  var maxFBOSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)
  if(width < 0 || width > maxFBOSize || height < 0 || height > maxFBOSize) {
    throw new Error("gl-fbo: Parameters are too large for FBO")
  }

  //Handle each option type
  options = options || {}

  //Figure out number of color buffers to use
  var numColors = 1
  if("color" in options) {
    numColors = Math.max(options.color|0, 0)
    if(numColors < 0) {
      throw new Error("gl-fbo: Must specify a nonnegative number of colors")
    }
    if(numColors > 1) {
      //Check if multiple render targets supported
      var mrtext = extensions.WEBGL_draw_buffers
      if(!mrtext) {
        throw new Error("gl-fbo: Multiple draw buffer extension not supported")
      } else if(numColors > gl.getParameter(mrtext.MAX_COLOR_ATTACHMENTS_WEBGL)) {
        throw new Error("gl-fbo: Context does not support " + numColors + " draw buffers")
      }
    }
  }

  //Determine whether to use floating point textures
  var colorType = gl.UNSIGNED_BYTE
  if(options.float && numColors > 0) {
    if(!extensions.OES_texture_float) {
      throw new Error("gl-fbo: Context does not support floating point textures")
    }
    colorType = gl.FLOAT
  } else if(options.preferFloat && numColors > 0) {
    if(extensions.OES_texture_float) {
      colorType = gl.FLOAT
    }
  }

  //Check if we should use depth buffer
  var useDepth = true
  if("depth" in options) {
    useDepth = !!options.depth
  }

  //Check if we should use a stencil buffer
  var useStencil = false
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