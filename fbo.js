"use strict";

//Texture buffer wrapper class
function TextureBuffer(gl, width, height, ) {
  this.context = gl;

}

TextureBuffer.prototype.valid = function() {
  return !this.destroyed;
}

TextureBuffer.prototype.addRefCount = function() {
  if(this.valid()) {
    this.ref_count++;
  }
}



//Render buffer wrapper class
function RenderBuffer(gl, width, height, storage_format) {
  this.context = gl;
  this.width = width;
  this.height = height;
  this.storage_format = storage_format || gl.RGBA4;
  this.ref_count = 0;
  this.destroyed = false;
  this.buffer = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, this.buffer);
  gl.renderbufferStorage(gl.RENDERBUFFER, this.storage_format, this.width, this.height);
}

RenderBuffer.prototype.valid = function() {
  return !this.destroyed;
}

RenderBuffer.prototype.addRefCount = function() {
  if(this.valid()) {
    this.ref_count++;
  }
}

RenderBuffer.prototype.decRefCount = function() {
  if(this.valid() && --this.ref_count <= 0) {
    this.context.deleteRenderbuffer(this.buffer);
    this.destroyed = true;
  }
}




function FrameBuffer(gl) {
  this.context = gl;
  this.buffer = gl.createFramebuffer();
  
  //Create attachment points
}

FrameBuffer.prototype.bind = function() {
}


function createFBO(gl, width, height, options) {
}

function getDefaultFBO(gl) {
}

module.exports = createFBO;
module.exports.defaultFBO = getDefaultFBO;