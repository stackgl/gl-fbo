fbo
===
In WebGL, creating Framebuffer objects requires a lot of boilerplate.  At minimum, you need to do the following:

1. Create a FramebufferObject
2. Bind it
3. Create a texture for the color buffer
4. Bind color attachment and initialize it
5. Attach texture to frame buffer
6. Create a render buffer for the depth buffer
7. Bind render buffer to initialize it
8. Attach render buffer to frame buffer

And it only gets more complicated once you try to add stencil buffers or depth textures.  Even worse, each step of this above process involves one or more extremely verbose calls to WebGL API functions.

Clearly, the solution to all of this is to make a wrapper which is exactly what this module does.

Usage
=====
Install using npm:

    npm install fbo
    
And here is how to use it:

    var fbo = require("fbo");
    var buffer = fbo(gl, 512, 512);
    buffer.bind();
    
    // ... draw stuff to fbo ...

    fbo.bindDisplay();
    
    // ... use contents of fbo as textures ...
    
    gl.bindTexture(gl.TEXTURE_2D, fbo.color);

### `var fbo = require("fbo")`

To import the library, just use require.

### `var buffer = fbo(gl, width, height[, options])`
Calling the module creates a new framebuffer object with default color attachments.

* `gl` : a WebGL context
* `width` : the width of the framebuffer object
* `height` : the height of the framebuffer object in pixels
* `options` : You can also specify extra options to the frame buffer if you want:
    + `color`: If set to false, disables the color attachment (Default: true)
    + `depth`: If set to false, disables depth attachment (Default: true)
    + `stencil`: If set enables stencil attachment (Default: false)
    + `float`: If set to true, uses floating point numbers instead of ints for color buffer (default: false)

Returns a wrapped frame buffer object

### `buffer.context`
The WebGL context for the buffer

### `buffer.fbo`
The underlying WebGL Framebuffer Object

### `buffer.color`
A WebGL Texture object for the color attachment.  If options.color === false, then this is set to null.

### `buffer.depth`
A WebGL texture object representing the depth and/or stencil attachment.  Only present if depth and/or stencil is set and if the WebGL context implements WEBGL_depth_texture.

### `buffer.bind()`
Binds the framebuffer for drawing

### `buffer.dispose()`
Destroys the framebuffer and all textures/renderbuffers attached to it.

### `fbo.bindDisplay()`
Rebinds the default display buffer.  Basically a short cut for:

    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    
You only need to do this when you are ready to draw to the main display.

Credits
=======
(c) 2013 Mikola Lysenko. BSD
