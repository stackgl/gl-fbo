fbo
===
In [WebGL](http://www.khronos.org/registry/webgl/specs/latest), creating [Framebuffer objects](http://www.khronos.org/registry/webgl/specs/latest/#5.14.6) requires a lot of boilerplate.  At minimum, you need to do the following:

1. [Create a FramebufferObject](http://www.khronos.org/opengles/sdk/docs/man/xhtml/glGenFramebuffers.xml)
2. [Bind it](http://www.khronos.org/opengles/sdk/docs/man/xhtml/glBindFramebuffer.xml)
3. [Create a texture for the color buffer](http://www.khronos.org/opengles/sdk/docs/man/xhtml/glGenTextures.xml)
4. [Bind the texture](http://www.khronos.org/opengles/sdk/docs/man/xhtml/glBindTexture.xml)
5. [Initialize the texture](http://www.khronos.org/opengles/sdk/docs/man/xhtml/glTexImage2D.xml)
6. [Attach texture to frame buffer](http://www.khronos.org/opengles/sdk/docs/man/xhtml/glFramebufferTexture2D.xml)
7. [Create a render buffer for the depth buffer](http://www.khronos.org/opengles/sdk/docs/man/xhtml/glGenRenderbuffers.xml)
8. [Bind render buffer to initialize it](http://www.khronos.org/opengles/sdk/docs/man/xhtml/glBindRenderbuffer.xml)
9. [Initialize the render buffer](http://www.khronos.org/opengles/sdk/docs/man/xhtml/glRenderbufferStorage.xml)
10. [Attach render buffer to frame buffer](http://www.khronos.org/opengles/sdk/docs/man/xhtml/glFramebufferRenderbuffer.xml)

And it only gets more complicated once you try to add stencil buffers or depth textures.  Even worse, each step of this above process involves one or more extremely verbose calls to WebGL API functions, each of which expects the inputs in some arbitrary order.

Clearly, the solution to all of this is to make a wrapper which is exactly what this module does.

Usage
=====
Install using npm:

    npm install fbo
    
And here is how to use it:

```javascript
//Assume gl is a WebGLContext

//First, require the library
var fbo = require("fbo");

//Let's create a 512x512 framebuffer object, and bind it for rendering
var buffer = fbo(gl, 512, 512);
buffer.bind();

// ... now we draw some stuff to frame buffer offscreen ...

//When we are done, rebind the main drawing buffer
var drawing = fbo.drawingBuffer(gl);
drawing.bind();

// ... and we can use the contents of the fbo as textures:
gl.bindTeture(gl.TEXTURE_2D, fbo.color);
```

## Basic Usage

### `var fbo = require("fbo")`

To import the library, just use require.

### `var buffer = fbo(gl, width, height[, options])`
Calling the module creates a new [WebGLFramebuffer](http://www.khronos.org/registry/webgl/specs/latest/#5.5) with a color attachment and depth attachment.  You can modify this behavior a bit by setting some options.

* `gl` : a [WebGLRenderingContext](http://www.khronos.org/registry/webgl/specs/latest/#2.1)
* `width` : the width of the framebuffer (in pixels)
* `height` : the height of the framebuffer (in pixels)
* `options` : You can also specify extra options to modify the framebuffer if you want:
    + `color`: If set to false, disables the color attachment (Default: true)
    + `depth`: If set to false, disables depth attachment (Default: true)
    + `stencil`: If set enables stencil attachment (Default: false)
    + `float`: If set to true, uses floating point numbers instead of ints for color buffer.  This requires the [OES_texture_float](http://www.khronos.org/registry/webgl/extensions/OES_texture_float/) or [OES_texture_half_float](http://www.khronos.org/registry/webgl/extensions/OES_texture_half_float/) extension to be supported. (Default: false)

Returns a wrapped framebuffer object (for more details, see the "Wrapper Interface" section)

### `var drawing = fbo.drawingBuffer(gl)`
You can also get a wrapper for the canvas' [DrawingBuffer](http://www.khronos.org/registry/webgl/specs/latest/#2.2).  It implements all the methods of the framebuffer wrapper, so you can use it interchangeably.

## Wrapper Interface
The wrapped frame buffer object implements has the following properties

### `buffer.context`
The WebGLRenderingContext for the buffer

### `buffer.fbo`
The underlying WebGLFramebuffer object

### `buffer.width`
The width of the buffer in pixels

### `buffer.height`
The height of the buffer in pixels

### `buffer.color`
A WebGLTexture object for the color attachment.  If options.color === false, then this is set to null.

### `buffer.depth`
A WebGLTexture object representing the depth and/or stencil attachment.  Only present if depth and/or stencil is set and if the WebGL context implements [WEBGL_depth_texture](http://www.khronos.org/registry/webgl/extensions/WEBGL_depth_texture/).

### `buffer.valid`
If true, the the buffer is not destroyed and can be bound.

### `buffer.bind()`
Binds the framebuffer for drawing and sets an appropriate viewport.  Equivalent to:

```javascript
this.context.bindFramebuffer(this.context.FRAMEBUFFER, this.fbo);
this.context.viewport(0, 0, this.width, this.height);
```

### `buffer.dispose()`
Destroys the framebuffer and all textures/renderbuffers attached to it.

Credits
=======
(c) 2013 Mikola Lysenko. BSD
