gl-fbo
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

## Example

```javascript
```


## Install

Install using npm:

    npm install gl-fbo

# API

### `var createFBO = require("gl-fbo")`

## Constructor
There is currently only one default way to create a Framebuffer object.  You can construct a framebuffer using the following syntax:

### `var fbo = createFBO(gl, width, height[, options])`
Creates a wrapped framebuffer object

* `gl` is a handle to a WebGL context
* `width` is the width of the framebuffer in pixels
* `height` is the height of the framebuffer in pixels
* `options` is an object containing the following optional properties:

    + `options.float` Use floating point textures (default `false`)
    + `options.use_color`  If a color buffer gets created (default `true`)
    + `options.use_depth` If fbo has a depth buffer (default: `true`)
    + `options.use_stencil` If fbo has a stencil buffer (default: `false`)

## Methods

### `fbo.bind()`
Binds the framebuffer object to the display.

### `fbo.dispose()`
Destroys the framebuffer object and releases all associated resources

## Properties

### `fbo.gl`
A reference to the WebGL context

### `fbo.handle`
A handle to the underlying Framebuffer object.

### `fbo.color`
The color texture component.  Stored as a [`gl-texture2d`](https://github.com/mikolalysenko/gl-texture2d) object.  If not present, is null.

### `fbo.depth`
The depth/stencil component of the FBO.  Stored as a [`gl-texture2d`](https://github.com/mikolalysenko/gl-texture2d).  If not present, is null.


Credits
=======
(c) 2013 Mikola Lysenko. BSD
